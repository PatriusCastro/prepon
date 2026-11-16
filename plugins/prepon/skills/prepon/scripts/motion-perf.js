#!/usr/bin/env node
// Prepon motion check: how smooth a page's motion is on a slow device, measured rather than guessed.
// Usage: node motion-perf.js --base http://localhost:5173 --routes /,/login [--cpu 4] [--width 360] [--storage-state file] [--wait-for selector]
// Each route loads at phone size (2x pixels) with the CPU slowed --cpu times through Chrome's DevTools throttling
// (4 is roughly a mid-range phone, 6 a low-end one). After the page and its fonts settle, it traces 3 s of idle, where
// looping animations run, and then a scroll through the page with the mouse wheel. Frames come from the browser's own
// frame reporting (the compositor's BeginFrame and DroppedFrame events), so motion the GPU runs is judged by what reaches
// the screen; counting requestAnimationFrame gaps instead would force main-thread work and overstate the cost.
// Output: JSON { cpu, width, results: [{ route, idle, scroll, issues }] }. Exit 1 if any issues, 2 on usage error,
// 3 if Playwright or its Chromium is missing.
//
// Issues:
//   dropped-frames         over 10% of frames dropped while idle or while scrolling
//   long-frame             a main-thread frame over 100 ms (taps and clicks wait for it), with the scripts the browser blames
//   main-thread-animation  running animations on properties the compositor can't run alone (anything but transform,
//                          opacity, translate, scale, rotate, filter), so every frame of them waits on the main thread
//   offscreen-animation    endless animations outside the screen or inside an invisible parent: frames nobody sees
//   heavy-layer            a blur filter or backdrop-filter over more than a quarter of the screen, or many will-change layers
// Chromium only. Uses the project's own Playwright, like check-page.js.
'use strict';

const { resolveRoute } = require('./snapshot.js');
const { args, loadPlaywright } = require('./tap-map.js');

const MAX_EXAMPLES = 5;
const DROPPED_PCT = 10;
const LONG_FRAME = 100;

// Runs in the page before anything else: records long animation frames (main-thread stalls, with the scripts behind
// them) where the browser supports that API.
function recorder() {
  window.__prepon = { loaf: [], since: 0 };
  try {
    new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__prepon.loaf.push({
      start: e.startTime, duration: Math.round(e.duration),
      scripts: (e.scripts || []).map((s) => `${s.invoker || s.invokerType || 'script'} in ${(s.sourceURL || 'inline').split('/').pop()} (${Math.round(s.duration)} ms)`),
    }))).observe({ type: 'long-animation-frame', buffered: false });
  } catch { /* older browser: no long-frame detail */ }
}

/** Trace events → frame summary: frames the compositor began, how many it dropped, and the frame rate that reached the screen. */
function frameStats(events, seconds) {
  let begun = 0, dropped = 0;
  for (const e of events) { if (e.name === 'BeginFrame') begun++; else if (e.name === 'DroppedFrame') dropped++; }
  const r = (v) => Math.round(v * 10) / 10;
  return { frames: begun, dropped, droppedPct: begun ? r((dropped / begun) * 100) : 0, fps: seconds ? r((begun - dropped) / seconds) : 0 };
}

// Runs in the page: what is animating and what it costs, independent of how fast this machine is.
function inspectAnimations({ maxExamples }) {
  const W = innerWidth, H = innerHeight;
  const SAFE = new Set(['transform', 'opacity', 'translate', 'scale', 'rotate', 'filter', 'offset', 'easing', 'composite', 'computedOffset']);
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const main = new Map(), offscreen = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const a of document.getAnimations()) {
    const el = a.effect && a.effect.target;
    if (a.playState !== 'running' || !el) continue;
    const props = new Set();
    for (const k of a.effect.getKeyframes()) Object.keys(k).forEach((p) => props.add(p));
    const slow = [...props].filter((p) => !SAFE.has(p));
    const name = a.animationName || a.transitionProperty || a.id || 'animation';
    if (slow.length) bump(main, `${describe(el)} ${name}: ${slow.join(', ')}`);
    const r = el.getBoundingClientRect();
    // Unseen: outside the screen, or inside a parent that is invisible (an element's own opacity is often what it animates).
    let hidden = getComputedStyle(el).visibility === 'hidden';
    for (let n = el.parentElement; n && !hidden; n = n.parentElement) { const ps = getComputedStyle(n); hidden = ps.opacity === '0' || ps.visibility === 'hidden'; }
    const off = hidden || r.width === 0 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W;
    if (off && a.effect.getComputedTiming().iterations === Infinity) bump(offscreen, `${describe(el)} ${name}`);
  }
  const heavy = [];
  let layers = 0;
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.willChange && s.willChange !== 'auto') layers++;
    const blur = (s.backdropFilter && s.backdropFilter !== 'none') || /blur\(/.test(s.filter);
    if (!blur) continue;
    const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    if (area > 0.25 * W * H) heavy.push(`${describe(el)} blurs ${Math.round((area / (W * H)) * 100)}% of the screen`);
  }
  const list = (m) => [...m].map(([k, n]) => (n > 1 ? `${k} (${n} running)` : k)).slice(0, maxExamples);
  return { main: list(main), mainCount: main.size, offscreen: list(offscreen), offscreenCount: offscreen.size, heavy: heavy.slice(0, maxExamples), willChange: layers };
}

// Ends a phase: hands back the long frames that started inside it (the browser reports them a little late, so one
// from the previous phase can arrive now; it is dropped).
const takeLoaf = (page) => page.evaluate(() => {
  const p = window.__prepon;
  const out = p.loaf.splice(0).filter((l) => l.start >= p.since);
  p.since = performance.now();
  return out;
});

// Runs one phase under a trace and returns its frame summary and long frames.
async function phase(browser, page, run) {
  await takeLoaf(page);
  await browser.startTracing(page, { categories: ['cc', 'benchmark', 'devtools.timeline', 'disabled-by-default-devtools.timeline.frame'] });
  const t0 = Date.now();
  await run();
  const seconds = (Date.now() - t0) / 1000;
  const events = JSON.parse((await browser.stopTracing()).toString()).traceEvents || [];
  return { stats: frameStats(events, seconds), loaf: await takeLoaf(page) };
}

async function scrollThrough(page) {
  const { height, view } = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, view: innerHeight }));
  const steps = Math.min(30, Math.ceil(height / (view * 0.5)));
  await page.mouse.move(view / 4, view / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, view * 0.5);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);
}

function phaseIssues(phase, stats, loaf, issues) {
  if (stats.droppedPct > DROPPED_PCT) {
    issues.push({ type: 'dropped-frames', phase, droppedPct: stats.droppedPct, fps: stats.fps });
  }
  const long = loaf.filter((l) => l.duration > LONG_FRAME).sort((a, b) => b.duration - a.duration);
  if (long.length) {
    issues.push({
      type: 'long-frame', phase, worst: long[0].duration, count: long.length,
      scripts: [...new Set(long.flatMap((l) => l.scripts))].slice(0, MAX_EXAMPLES),
    });
  }
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.base || !a.routes) {
    process.stderr.write('usage: node motion-perf.js --base <url> --routes <a,b> [--cpu 4] [--width 360] [--storage-state file] [--wait-for selector]\n');
    return 2;
  }
  const routes = String(a.routes).split(',');
  if (routes.some((r) => /^[A-Za-z]:[\\/]/.test(r))) {
    process.stdout.write(JSON.stringify({ error: 'route-looks-like-a-file-path', hint: 'In Git Bash, pass routes without the leading slash.' }) + '\n');
    return 2;
  }
  const pw = loadPlaywright();
  if (!pw) {
    process.stdout.write(JSON.stringify({ error: 'playwright-not-installed', hint: 'Ask the user before installing: npm i -D playwright && npx playwright install chromium' }) + '\n');
    return 3;
  }
  const cpu = Number(a.cpu) || 4;
  const width = Number(a.width) || 360;
  let browser;
  try { browser = await pw.chromium.launch(); } catch {
    process.stdout.write(JSON.stringify({ error: 'playwright-browser-missing', hint: 'Run in the foreground: npx playwright install chromium' }) + '\n');
    return 3;
  }
  const results = [];
  try {
    const context = await browser.newContext({
      viewport: { width, height: width < 600 ? 800 : 900 },
      deviceScaleFactor: 2,
      reducedMotion: 'no-preference',
      ...(typeof a['storage-state'] === 'string' ? { storageState: a['storage-state'] } : {}),
    });
    await context.addInitScript(recorder);
    for (const route of routes) {
      const page = await context.newPage();
      try {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        await page.goto(resolveRoute(a.base, route), { waitUntil: 'networkidle', timeout: 60000 });
        if (typeof a['wait-for'] === 'string') await page.waitForSelector(a['wait-for'], { timeout: 20000 });
        // Let the load finish (fonts, entrance motion): this measures motion, not start-up.
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(2500);
        const idleRaw = await phase(browser, page, () => page.waitForTimeout(3000));
        const before = await page.evaluate(inspectAnimations, { maxExamples: MAX_EXAMPLES });
        const scrollRaw = await phase(browser, page, () => scrollThrough(page));
        // Inspect again after scrolling: some animations only start when their element comes into view.
        const after = await page.evaluate(inspectAnimations, { maxExamples: MAX_EXAMPLES });
        const merge = (k) => [...new Set([...before[k], ...after[k]])];
        const anim = { main: merge('main'), offscreen: merge('offscreen'), heavy: merge('heavy'), willChange: Math.max(before.willChange, after.willChange) };
        const idle = idleRaw.stats;
        const scroll = scrollRaw.stats;
        const issues = [];
        phaseIssues('idle', idle, idleRaw.loaf, issues);
        phaseIssues('scroll', scroll, scrollRaw.loaf, issues);
        if (anim.main.length) issues.push({ type: 'main-thread-animation', examples: anim.main.slice(0, MAX_EXAMPLES) });
        if (anim.offscreen.length) issues.push({ type: 'offscreen-animation', examples: anim.offscreen.slice(0, MAX_EXAMPLES) });
        if (anim.heavy.length) issues.push({ type: 'heavy-layer', examples: anim.heavy });
        if (anim.willChange > 12) issues.push({ type: 'heavy-layer', examples: [`${anim.willChange} elements keep will-change layers`] });
        results.push({ route, idle, scroll, issues });
      } catch (e) {
        results.push({ route, error: String(e.message || e).split('\n')[0], issues: [] });
      }
      await page.close();
    }
    await context.close();
  } finally {
    await browser.close();
  }
  process.stdout.write(JSON.stringify({ cpu, width, results }, null, 2) + '\n');
  return results.some((r) => r.error || r.issues.length) ? 1 : 0;
}

if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exitCode = 1; });
}
module.exports = { frameStats, inspectAnimations };

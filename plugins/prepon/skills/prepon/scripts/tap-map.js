#!/usr/bin/env node
// Prepon tap map: predicts how a screen works for one-handed phone use. For each route, at a phone viewport,
// it lists every tappable target with its thumb zone, size, spacing, and whether it's on the first screen,
// saves an overlay screenshot (targets boxed by zone) and a blurred "squint test" screenshot, and flags issues.
// Uses the PROJECT's own Playwright install (no dependencies here).
//
// Usage (from the project root):
//   node tap-map.js --base http://localhost:5173 --routes login,dashboard [--primary "button[type=submit]"]
//                   [--width 360] [--height 800] [--stamp s] [--storage-state auth.json] [--wait-for "main"]
// Writes .prepon/snapshots/<stamp>/tapmap/<route>-taps@<w>.png, <route>-blur@<w>.png, and prints JSON.
//
// This is a prediction from layout, not a measurement of real taps. If the project has analytics or
// session recordings, those win.
'use strict';
const fs = require('fs');
const path = require('path');
const { resolveRoute } = require('./snapshot.js');

// ponytail: three-band thumb model for a right- or left-handed grip on a ~360x800 phone, after observational
// research on how people hold phones. Heuristic, not a standard. Upgrade path: per-hand models, device sizes.
function thumbZone(cx, cy, w, h) {
  const y = cy / h;
  const x = cx / w;
  if (y >= 0.55) return 'easy';
  if (y < 0.25) return x < 0.3 || x > 0.7 ? 'hard' : 'stretch';
  return 'stretch';
}

const LIMITS = {
  minTouch: 44,       // iOS 44pt; Android asks 48dp. 44 is the floor we flag below.
  minWcag: 24,        // WCAG 2.2 AA 2.5.8
  minGap: 8,          // Android: 8dp between targets
  busyFirstScreen: 12, // heuristic: more tappable targets than this on one phone screen tends to overwhelm
};

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function loadPlaywright() {
  for (const name of ['playwright', '@playwright/test', 'playwright-core']) {
    try { return require(require.resolve(name, { paths: [process.cwd()] })); } catch { /* next */ }
  }
  return null;
}

const SELECTOR = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=menuitem], [tabindex]:not([tabindex="-1"])';

// Runs in the page: returns visible targets (input + its label count as one target) and first-screen stats.
function collectInPage({ selector, primary }) {
  const H = window.innerHeight;
  const seen = new Set();
  const targets = [];
  const primaryEls = primary ? new Set(document.querySelectorAll(primary)) : new Set();
  for (const el of document.querySelectorAll(selector)) {
    if (seen.has(el)) continue;
    // Content of a closed <details> (a collapsed menu) can't be seen or tapped; its <summary> can.
    const closed = el.closest('details:not([open])');
    if (closed && el.closest('summary')?.parentElement !== closed) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    let r = el.getBoundingClientRect();
    // A label makes the whole row tappable: use the union of control and label boxes.
    if (el.labels && el.labels.length) {
      for (const l of el.labels) {
        seen.add(l);
        const lr = l.getBoundingClientRect();
        if (lr.width && lr.height) {
          const x1 = Math.min(r.left, lr.left), y1 = Math.min(r.top, lr.top);
          const x2 = Math.max(r.right, lr.right), y2 = Math.max(r.bottom, lr.bottom);
          r = { left: x1, top: y1, width: x2 - x1, height: y2 - y1, right: x2, bottom: y2 };
        }
      }
    }
    if (!r.width || !r.height) continue;
    const fixed = (() => { for (let n = el; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return p; } return null; })();
    const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
    targets.push({
      label,
      tag: el.tagName.toLowerCase(),
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      firstScreen: r.top < H && r.bottom > 0,
      pinned: fixed,
      primary: primaryEls.has(el),
      // A link inside a line of text is exempt from WCAG 2.5.8 (inline exception).
      inline: style.display === 'inline' && !!el.parentElement && el.parentElement.innerText.trim().length > (el.innerText || '').trim().length,
    });
  }
  // First-screen text load: words and distinct font sizes of text visible without scrolling.
  let words = 0;
  const sizes = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.trim();
    if (!t || !n.parentElement) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rr = range.getBoundingClientRect();
    if (!rr.width || rr.top >= H || rr.bottom <= 0) continue;
    words += t.split(/\s+/).length;
    sizes.add(getComputedStyle(n.parentElement).fontSize);
  }
  return { targets, words, fontSizes: [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b)), pageHeight: document.documentElement.scrollHeight, pageWidth: document.documentElement.scrollWidth };
}

function analyze(data, w, h, primarySelector) {
  const issues = [];
  const first = data.targets.filter((t) => t.firstScreen);
  for (const t of data.targets) {
    t.zone = t.firstScreen ? thumbZone(t.x + t.w / 2, t.y + t.h / 2, w, h) : 'below-fold';
    const small = Math.min(t.w, t.h);
    if (t.inline) t.size = 'inline';
    else if (small < LIMITS.minWcag) t.size = 'fails-wcag';
    else if (small < LIMITS.minTouch) t.size = 'below-touch';
    else t.size = 'ok';
    // nearest gap to any other target (edge to edge)
    let gap = Infinity;
    for (const o of data.targets) {
      if (o === t) continue;
      const dx = Math.max(0, Math.max(o.x - (t.x + t.w), t.x - (o.x + o.w)));
      const dy = Math.max(0, Math.max(o.y - (t.y + t.h), t.y - (o.y + o.h)));
      gap = Math.min(gap, Math.hypot(dx, dy));
    }
    t.gap = Number.isFinite(gap) ? Math.round(gap) : null;
    const flag = t.size === 'fails-wcag' || t.size === 'below-touch';
    if (flag) issues.push({ type: 'small-target', label: t.label, size: `${t.w}x${t.h}`, detail: t.size });
    if (t.gap !== null && t.gap < LIMITS.minGap && flag) issues.push({ type: 'crowded', label: t.label, gap: t.gap });
  }
  if (primarySelector) {
    const p = data.targets.filter((t) => t.primary);
    if (!p.length) issues.push({ type: 'primary-not-found', selector: primarySelector });
    // A selector can match a repeated action (one per row). Judge the best placed match, not each one.
    const visible = p.filter((t) => t.firstScreen || t.pinned);
    if (p.length && !visible.length) issues.push({ type: 'primary-below-fold', label: p[0].label, y: p[0].y });
    else if (visible.length && visible.every((t) => t.zone === 'hard')) issues.push({ type: 'primary-hard-to-reach', label: visible[0].label, zone: 'hard' });
  }
  // A phone zooms out to fit a too-wide page, so the "first screen" holds more than it should and every size shrinks on glass.
  if (data.pageWidth > w) issues.push({ type: 'page-wider-than-viewport', pageWidth: data.pageWidth, viewport: w, detail: 'fix this first; zones and first-screen figures are unreliable until it is fixed' });
  if (first.length > LIMITS.busyFirstScreen) issues.push({ type: 'busy-first-screen', targets: first.length, limit: LIMITS.busyFirstScreen });
  if (first.length === 0) issues.push({ type: 'no-action-on-first-screen' });
  const zones = { easy: 0, stretch: 0, hard: 0 };
  for (const t of first) zones[t.zone]++;
  return {
    firstScreen: { targets: first.length, zones, words: data.words, fontSizes: data.fontSizes },
    screensTall: Math.round((data.pageHeight / h) * 10) / 10,
    targets: data.targets,
    issues,
  };
}

const OVERLAY_CSS = `
#prepon-tapmap { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font: 600 10px/1.2 system-ui, sans-serif; }
#prepon-tapmap .band { position: absolute; left: 0; right: 0; }
#prepon-tapmap .box { position: absolute; border: 2px solid; border-radius: 4px; }
#prepon-tapmap .box span { position: absolute; top: -14px; left: -2px; padding: 0 3px; color: #fff; white-space: nowrap; }
`;
const ZONE_COLOR = { easy: '#15803d', stretch: '#b45309', hard: '#b91c1c' };

function drawOverlay({ targets, h, colors }) {
  const root = document.createElement('div');
  root.id = 'prepon-tapmap';
  const band = (top, height, color) => {
    const b = document.createElement('div');
    b.className = 'band';
    Object.assign(b.style, { top: `${top}px`, height: `${height}px`, background: color });
    root.appendChild(b);
  };
  band(0, h * 0.25, 'rgba(185,28,28,0.07)');
  band(h * 0.25, h * 0.30, 'rgba(180,83,9,0.06)');
  band(h * 0.55, h * 0.45, 'rgba(21,128,61,0.06)');
  for (const t of targets.filter((x) => x.firstScreen)) {
    const d = document.createElement('div');
    d.className = 'box';
    const c = t.size === 'ok' || t.size === 'inline' ? colors[t.zone] : '#7c3aed';
    Object.assign(d.style, { left: `${t.x}px`, top: `${t.y}px`, width: `${t.w}px`, height: `${t.h}px`, borderColor: c });
    const s = document.createElement('span');
    s.textContent = `${t.primary ? '★ ' : ''}${t.size === 'ok' || t.size === 'inline' ? t.zone : `${t.w}×${t.h}`}`;
    s.style.background = c;
    d.appendChild(s);
    root.appendChild(d);
  }
  document.body.appendChild(root);
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.base || !a.routes) {
    process.stderr.write('usage: node tap-map.js --base <url> --routes <a,b> [--primary selector] [--width 360] [--height 800] [--stamp s] [--storage-state file] [--wait-for selector]\n');
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
  const w = Number(a.width || 360);
  const h = Number(a.height || 800);
  const root = process.cwd();
  const stamp = typeof a.stamp === 'string' ? a.stamp : new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const dir = path.join(root, '.prepon', 'snapshots', stamp, 'tapmap');
  fs.mkdirSync(dir, { recursive: true });

  let browser;
  try { browser = await pw.chromium.launch(); } catch (e) {
    process.stdout.write(JSON.stringify({ error: 'playwright-browser-missing', hint: 'Run in the foreground: npx playwright install chromium' }) + '\n');
    return 3;
  }
  const results = [];
  try {
    const context = await browser.newContext({
      viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true,
      ...(typeof a['storage-state'] === 'string' ? { storageState: a['storage-state'] } : {}),
    });
    for (const route of routes) {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e.message || e).split('\n')[0]));
      const slug = route.replace(/^\/+|\/+$/g, '').replace(/[^\w-]+/g, '_') || 'root';
      try {
        await page.goto(resolveRoute(a.base, route), { waitUntil: 'networkidle', timeout: 30000 });
        if (typeof a['wait-for'] === 'string') await page.waitForSelector(a['wait-for'], { timeout: 10000 });
        const data = await page.evaluate(collectInPage, { selector: SELECTOR, primary: typeof a.primary === 'string' ? a.primary : null });
        if (data.targets.length === 0 && data.words === 0) {
          // Nothing rendered: report that instead of analyzing an empty screen.
          results.push({ route, finalUrl: page.url(), error: 'page-did-not-render', pageErrors });
          await page.close();
          continue;
        }
        const result = analyze(data, w, h, a.primary);
        if (pageErrors.length) result.pageErrors = pageErrors;
        const blurFile = path.join(dir, `${slug}-blur@${w}.png`);
        await page.addStyleTag({ content: 'html { filter: blur(6px); }' });
        await page.screenshot({ path: blurFile, animations: 'disabled' });
        await page.addStyleTag({ content: 'html { filter: none !important; }' + OVERLAY_CSS });
        await page.evaluate(drawOverlay, { targets: result.targets, h, colors: ZONE_COLOR });
        const tapFile = path.join(dir, `${slug}-taps@${w}.png`);
        await page.screenshot({ path: tapFile, animations: 'disabled' });
        const rel = (f) => path.relative(root, f).split(path.sep).join('/');
        results.push({ route, finalUrl: page.url(), overlay: rel(tapFile), blur: rel(blurFile), ...result });
      } catch (e) {
        results.push({ route, error: String(e.message || e).split('\n')[0] });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const issues = results.reduce((n, r) => n + ((r.issues && r.issues.length) || (r.error ? 1 : 0)), 0);
  process.stdout.write(JSON.stringify({ viewport: `${w}x${h}`, legend: 'overlay boxes: green easy, amber stretch, red hard, purple too small; ★ primary', results }, null, 2) + '\n');
  return issues ? 1 : 0;
}

if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exitCode = 1; });
}
module.exports = { thumbZone, analyze, LIMITS, args, loadPlaywright };

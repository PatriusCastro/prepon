#!/usr/bin/env node
// Prepon tap map: predicts how a screen works for one-handed phone use. For each route, at a phone viewport,
// it lists every tappable target with its thumb zone, size, spacing, and whether it's on the first screen,
// saves an overlay screenshot (targets boxed by zone) and a blurred "squint test" screenshot, and flags issues.
// It also predicts the attention order of the first screen (what users likely look at first) and saves it numbered.
// Uses the PROJECT's own Playwright install (no dependencies here).
//
// Usage (from the project root):
//   node tap-map.js --base http://localhost:5173 --routes login,dashboard [--primary "button[type=submit]"]
//                   [--width 360] [--height 800] [--stamp s] [--storage-state auth.json] [--wait-for "main"]
// Writes .prepon/snapshots/<stamp>/tapmap/<route>-taps@<w>.png, -blur@<w>.png, -attention@<w>.png, and prints JSON.
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

// Runs in the page: the visual units on the first screen that can draw the eye. Text (by font size and weight),
// media (img, svg, video, canvas), and filled shapes (buttons, banners, badges) whose fill stands out from what's behind
// them. Text inside a filled shape merges into it, so a button counts once.
function collectAttentionInPage({ primary }) {
  const W = window.innerWidth, H = window.innerHeight;
  const primaryEls = primary ? [...document.querySelectorAll(primary)] : [];
  const rgb = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgBehind = (el) => { for (let n = el; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if ((c[3] ?? 1) > 0.5) return c; } return [255, 255, 255, 1]; };
  const visible = (el, r) => {
    if (r.width < 8 || r.height < 8 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.1;
  };
  const isPrimary = (el) => primaryEls.some((p) => p === el || p.contains(el) || el.contains(p));
  const box = (r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(Math.min(r.right, W) - Math.max(r.left, 0)), h: Math.round(Math.min(r.bottom, H) - Math.max(r.top, 0)) });
  const out = [];
  const fills = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag !== 'svg' && el.closest('svg')) continue; // an svg's parts belong to the svg
    const s = getComputedStyle(el);
    if (['img', 'svg', 'video', 'canvas', 'picture'].includes(tag) || s.backgroundImage.startsWith('url(')) {
      if (Math.min(r.width, r.height) < 32) continue; // icons: they ride on their button or label
      out.push({ kind: 'media', label: (el.getAttribute('alt') || el.getAttribute('aria-label') || tag).slice(0, 60), ...box(r), contrast: 3, color: null, font: 0, weight: 400, primary: isPrimary(el) });
      continue;
    }
    const fill = rgb(s.backgroundColor);
    if ((fill[3] ?? 1) > 0.5 && el.parentElement) {
      const c = ratio(fill, bgBehind(el.parentElement));
      // Covering most of the screen makes it a background, not a shape.
      if (c >= 1.3 && r.width * r.height < W * H * 0.5) {
        const f = { kind: 'shape', label: (el.getAttribute('aria-label') || '').slice(0, 60), tag, ...box(r), contrast: c, color: fill, font: 0, weight: 400, primary: isPrimary(el) };
        fills.set(el, f); out.push(f);
      }
    }
  }
  for (const el of document.body.querySelectorAll('*')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const range = document.createRange(); range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const s = getComputedStyle(el);
    const text = el.innerText.trim().replace(/\s+/g, ' ');
    const font = parseFloat(s.fontSize), weight = Number(s.fontWeight) || 400, color = rgb(s.color);
    let host = null;
    for (let n = el; n && !host; n = n.parentElement) if (fills.has(n)) host = fills.get(n);
    // Text inside a button, badge, or banner is that shape's label. Panels (a quarter of the screen or more) keep their text separate.
    if (host && host.w * host.h < W * H * 0.25) {
      if (!host.label) host.label = text.slice(0, 60);
      host.font = Math.max(host.font, font); host.weight = Math.max(host.weight, weight);
      continue;
    }
    out.push({ kind: 'text', label: text.slice(0, 60), ...box(r), contrast: ratio(color, bgBehind(el)), color, font, weight, primary: isPrimary(el) });
  }
  for (const f of fills.values()) if (!f.label) f.label = `<${f.tag}>`;
  return out;
}

// ponytail: a hand-weighted salience model (size, contrast, top-left position, colour that stands out), not eye-tracking
// and no face detection. Upgrade path: a trained saliency model, or the project's real heatmaps, which always win.
function attention(cands, w, h) {
  if (!cands.length) return [];
  const maxFont = Math.max(...cands.map((c) => c.font || 0), 1);
  // HSV saturation, so deep brand colours (dark teal, navy) count as colour; near-black doesn't.
  const chroma = (c) => { if (!c) return 0; const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx < 64 ? 0 : (mx - mn) / mx; };
  const hue = (c) => { const [r, g, b] = c.map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; const k = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (k * 60 + 360) % 360; };
  const colourful = cands.filter((c) => chroma(c.color) > 0.35);
  const scored = cands.map((c) => {
    // A solid fill reads heavier than its outline area; text weight comes from its size instead.
    const areaScore = Math.min(1, Math.sqrt((c.w * c.h) / (w * h)) * (c.kind === 'shape' ? 2.5 : 2));
    const size = c.kind === 'text'
      ? Math.min(1, (c.font / maxFont) ** 1.5 * (c.weight >= 600 ? 1 : 0.8) + Math.min(0.15, (c.w * c.h) / (w * h)))
      : c.kind === 'shape' && c.font ? Math.max(areaScore, (c.font / maxFont) ** 1.5) : areaScore;
    const contrast = Math.min(1, (c.contrast - 1) / 10);
    const position = Math.max(0, 1 - 0.6 * ((c.y + c.h / 2) / h) - 0.2 * ((c.x + c.w / 2) / w));
    // Isolation (Von Restorff): a saturated colour that few other things of the same kind share
    // (a teal button still stands out from other fills when some small text is teal too).
    let isolation = 0;
    if (chroma(c.color) > 0.35) {
      const same = colourful.filter((o) => o !== c && o.kind === c.kind && Math.abs(((hue(o.color) - hue(c.color) + 540) % 360) - 180) < 30).length;
      isolation = same <= 2 ? 1 : same <= 5 ? 0.4 : 0;
    }
    const score = 0.4 * size + 0.25 * contrast + 0.2 * position + 0.15 * isolation + (c.kind === 'media' ? 0.15 : 0);
    return { ...c, score: Math.round(score * 100) / 100 };
  });
  return scored.sort((a, b) => b.score - a.score).map((c, i) => ({ rank: i + 1, kind: c.kind, label: c.label, score: c.score, x: c.x, y: c.y, w: c.w, h: c.h, primary: c.primary }));
}

// The top of the predicted attention order, and an issue when the primary action isn't among the first three.
function attentionReport(cands, w, h, primarySelector) {
  const ranked = attention(cands, w, h);
  const issues = [];
  const p = ranked.find((c) => c.primary);
  if (primarySelector && p && p.rank > 3) {
    issues.push({ type: 'primary-not-salient', label: p.label, rank: p.rank, first: ranked.slice(0, 3).map((c) => c.label || c.kind) });
  }
  return { attention: ranked.slice(0, 8), primaryRank: p ? p.rank : null, issues };
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

// Numbered outlines on the top five of the predicted attention order.
function drawAttention({ items }) {
  document.getElementById('prepon-tapmap')?.remove();
  const root = document.createElement('div');
  root.id = 'prepon-tapmap';
  items.slice(0, 5).forEach((t) => {
    const d = document.createElement('div');
    d.className = 'box';
    const c = t.primary ? '#7c3aed' : '#1d4ed8';
    Object.assign(d.style, { left: `${t.x}px`, top: `${t.y}px`, width: `${t.w}px`, height: `${t.h}px`, borderColor: c });
    const s = document.createElement('span');
    s.textContent = `${t.rank}${t.primary ? ' ★' : ''}`;
    s.style.background = c;
    d.appendChild(s);
    root.appendChild(d);
  });
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
        const cands = await page.evaluate(collectAttentionInPage, { primary: typeof a.primary === 'string' ? a.primary : null });
        const att = attentionReport(cands, w, h, a.primary);
        Object.assign(result, { attention: att.attention, primaryRank: att.primaryRank });
        result.issues.push(...att.issues);
        if (pageErrors.length) result.pageErrors = pageErrors;
        const blurFile = path.join(dir, `${slug}-blur@${w}.png`);
        await page.addStyleTag({ content: 'html { filter: blur(6px); }' });
        await page.screenshot({ path: blurFile, animations: 'disabled' });
        await page.addStyleTag({ content: 'html { filter: none !important; }' + OVERLAY_CSS });
        await page.evaluate(drawAttention, { items: att.attention });
        const attFile = path.join(dir, `${slug}-attention@${w}.png`);
        await page.screenshot({ path: attFile, animations: 'disabled' });
        await page.evaluate(() => document.getElementById('prepon-tapmap')?.remove());
        await page.evaluate(drawOverlay, { targets: result.targets, h, colors: ZONE_COLOR });
        const tapFile = path.join(dir, `${slug}-taps@${w}.png`);
        await page.screenshot({ path: tapFile, animations: 'disabled' });
        const rel = (f) => path.relative(root, f).split(path.sep).join('/');
        results.push({ route, finalUrl: page.url(), overlay: rel(tapFile), blur: rel(blurFile), attentionMap: rel(attFile), ...result });
      } catch (e) {
        results.push({ route, error: String(e.message || e).split('\n')[0] });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const issues = results.reduce((n, r) => n + ((r.issues && r.issues.length) || (r.error ? 1 : 0)), 0);
  process.stdout.write(JSON.stringify({
    viewport: `${w}x${h}`,
    legend: 'overlay boxes: green easy, amber stretch, red hard, purple too small; ★ primary',
    attentionNote: 'attention is a predicted order (size, contrast, position, colour), not measured eye-tracking; real heatmaps win',
    results,
  }, null, 2) + '\n');
  return issues ? 1 : 0;
}

if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exitCode = 1; });
}
module.exports = { thumbZone, analyze, attention, attentionReport, LIMITS, args, loadPlaywright };

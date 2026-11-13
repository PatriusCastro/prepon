#!/usr/bin/env node
// Prepon page check: loads routes in a real browser and reports problems only a rendered page shows.
// Usage: node check-page.js --base http://localhost:5173 --routes /,/login [--widths 360,1440] [--reduced-motion] [--storage-state file] [--wait-for selector]
// Output: JSON { results: [{ route, width, issues: [...] }] }. Exit 1 if any issues, 2 on usage error, 3 if Playwright is missing.
//
// Checks:
//   page-error           uncaught errors and console errors while loading
//   horizontal-overflow  the page scrolls sideways; lists the widest offenders
//   text-clipped         text cut off by an overflow:hidden box (ellipsis truncation is left alone)
//   text-covered         text hidden under another element (fixed and sticky bars are left alone)
//   content-hidden       text still invisible (opacity 0) after scrolling the whole page and waiting
//   line-too-long        paragraphs wider than about 90 characters a line
// Uses the project's own Playwright, like snapshot.js and tap-map.js.
'use strict';

const { resolveRoute } = require('./snapshot.js');
const { args, loadPlaywright } = require('./tap-map.js');

const MAX_EXAMPLES = 5;
const LONG_LINE = 90;

// Runs in the page after it has been scrolled through. Returns raw issue lists.
function inspect({ maxExamples, longLine }) {
  const W = document.documentElement.clientWidth;
  const H = window.innerHeight;
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    const text = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  };
  const inScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true;
    }
    return false;
  };
  const pinned = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };
  const shown = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (el.closest('[hidden], [aria-hidden="true"], details:not([open]) > :not(summary), dialog:not([open]), [inert]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    // Visually hidden text for screen readers (clip or 1px boxes) is deliberate.
    if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') return false;
    return true;
  };
  // Elements that directly hold readable text.
  const texty = [...document.body.querySelectorAll('*')].filter((el) => {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'svg', 'TEMPLATE'].includes(el.tagName)) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  });

  const out = { overflow: null, clipped: [], covered: [], hidden: [], long: [] };

  const sw = document.documentElement.scrollWidth;
  if (sw > W + 1) {
    const wide = [...document.body.querySelectorAll('*')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > W + 1 && r.width > 0 && !inScroller(el); })
      .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
      .filter((el, i, arr) => !arr.slice(0, i).some((p) => p.contains(el)))
      .slice(0, maxExamples)
      .map((el) => `${describe(el)} reaches ${Math.round(el.getBoundingClientRect().right)}px`);
    out.overflow = { scrollWidth: sw, viewport: W, offenders: wide };
  }

  for (const el of texty) {
    if (!shown(el)) continue;
    const s = getComputedStyle(el);
    // Clipped: content bigger than a box that hides overflow, unless truncation is intentional (ellipsis or line clamp).
    const hides = /hidden|clip/.test(s.overflow + s.overflowX + s.overflowY);
    const intentional = s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none' && s.webkitLineClamp !== '';
    if (hides && !intentional && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
      out.clipped.push(describe(el));
    }
    // Hidden: still transparent after the page has been scrolled through and given time to animate.
    let op = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    if (op < 0.05) out.hidden.push(describe(el));
    // Long lines: estimate characters per line from text length and the number of rendered lines.
    if (['P', 'LI', 'DD', 'BLOCKQUOTE'].includes(el.tagName)) {
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5;
      const lines = Math.round(el.getBoundingClientRect().height / lh);
      const chars = el.innerText.trim().length;
      if (lines >= 2 && chars / lines > longLine) out.long.push(`${describe(el)} ~${Math.round(chars / lines)} chars/line`);
    }
  }

  // Covered: sample the centre of each line of text in the current viewport and see what's on top.
  for (const el of texty) {
    if (!shown(el) || pinned(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > H) continue;
    const x = Math.min(W - 1, Math.max(0, r.left + Math.min(r.width, 40) / 2));
    const y = r.top + Math.min(r.height, 24) / 2;
    // Text scrolled out of view inside its own scroll box isn't covered, just scrolled away.
    let outside = false;
    for (let n = el.parentElement; n && n !== document.body && !outside; n = n.parentElement) {
      if (!/auto|scroll|hidden|clip/.test(getComputedStyle(n).overflow)) continue;
      const b = n.getBoundingClientRect();
      outside = y < b.top || y > b.bottom || x < b.left || x > b.right;
    }
    if (outside) continue;
    const top = document.elementFromPoint(x, y);
    if (!top || el.contains(top) || top.contains(el)) continue;
    if (pinned(top)) continue; // headers, tab bars, and toasts cover content by design
    const ts = getComputedStyle(top);
    if (ts.pointerEvents === 'none' && Number(ts.opacity) < 0.5) continue;
    out.covered.push(`${describe(el)} under ${describe(top)}`);
  }

  for (const k of ['clipped', 'covered', 'hidden', 'long']) out[k] = { count: out[k].length, examples: out[k].slice(0, maxExamples) };
  return out;
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.base || !a.routes) {
    process.stderr.write('usage: node check-page.js --base <url> --routes <a,b> [--widths 360,1440] [--reduced-motion] [--storage-state file] [--wait-for selector]\n');
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
  const widths = String(a.widths || '360,1440').split(',').map(Number);
  let browser;
  try { browser = await pw.chromium.launch(); } catch {
    process.stdout.write(JSON.stringify({ error: 'playwright-browser-missing', hint: 'Run in the foreground: npx playwright install chromium' }) + '\n');
    return 3;
  }
  const results = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: width < 600 ? 800 : 900 },
        reducedMotion: a['reduced-motion'] ? 'reduce' : 'no-preference',
        ...(typeof a['storage-state'] === 'string' ? { storageState: a['storage-state'] } : {}),
      });
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e.message || e).split('\n')[0]));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().split('\n')[0].slice(0, 200)); });
        const issues = [];
        try {
          await page.goto(resolveRoute(a.base, route), { waitUntil: 'networkidle', timeout: 30000 });
          if (typeof a['wait-for'] === 'string') await page.waitForSelector(a['wait-for'], { timeout: 10000 });
          await scrollThrough(page);
          const r = await page.evaluate(inspect, { maxExamples: MAX_EXAMPLES, longLine: LONG_LINE });
          if (errors.length) issues.push({ type: 'page-error', count: errors.length, examples: errors.slice(0, MAX_EXAMPLES) });
          if (r.overflow) issues.push({ type: 'horizontal-overflow', ...r.overflow });
          if (r.clipped.count) issues.push({ type: 'text-clipped', ...r.clipped });
          if (r.covered.count) issues.push({ type: 'text-covered', ...r.covered });
          if (r.hidden.count) issues.push({ type: 'content-hidden', ...r.hidden });
          if (r.long.count) issues.push({ type: 'line-too-long', ...r.long });
          results.push({ route, width, finalUrl: page.url(), issues });
        } catch (e) {
          results.push({ route, width, error: String(e.message || e).split('\n')[0], issues: errors.length ? [{ type: 'page-error', examples: errors.slice(0, MAX_EXAMPLES) }] : [] });
        }
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(JSON.stringify({ reducedMotion: !!a['reduced-motion'], results }, null, 2) + '\n');
  return results.some((r) => r.error || r.issues.length) ? 1 : 0;
}

if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exitCode = 1; });
}
module.exports = { inspect };

#!/usr/bin/env node
// Prepon snapshot: captures full-page screenshots of routes at several widths with the
// PROJECT's own Playwright install (this script adds no dependencies).
//
// Usage (run from the project root):
//   node snapshot.js --base http://localhost:5173 --routes /,/login --phase before [--stamp 20261112-1430]
//                    [--widths 360,768,1440] [--storage-state auth.json] [--wait-for "main"] [--viewport]
//   --viewport captures only the visible screen instead of the full page (use it to check sticky bars and above-the-fold layout)
//
// Writes .prepon/snapshots/<stamp>/<phase>/<route>@<width>.png, makes sure `.prepon/` is in
// the project's .gitignore, and prints JSON: { dir, stamp, shots: [{ route, width, file }], errors }.
// --out <dir> writes <dir>/snapshots/... instead (still run from the project, so its Playwright is found);
// nothing is added to .gitignore and the printed paths are absolute.
// Reuse the printed stamp for the "after" phase so both land in the same folder.
'use strict';
const fs = require('fs');
const path = require('path');

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

function loadPlaywright() {
  for (const name of ['playwright', '@playwright/test', 'playwright-core']) {
    try { return require(require.resolve(name, { paths: [process.cwd()] })); } catch { /* try next */ }
  }
  return null;
}

function ensureGitignored(root) {
  const file = path.join(root, '.gitignore');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!/^\/?\.prepon\/?\s*$/m.test(text)) {
    fs.appendFileSync(file, `${text && !text.endsWith('\n') ? '\n' : ''}.prepon/\n`);
  }
}

// Routes are relative to --base, so a site served under a base path (e.g. http://localhost:5173/prepon/)
// keeps it: "/demo" and "demo" both become .../prepon/demo. A route that already includes the base path,
// or a full URL, is used as is.
function resolveRoute(base, route) {
  if (/^https?:\/\//.test(route)) return route;
  const b = new URL(base.endsWith('/') ? base : base + '/');
  const prefix = b.pathname.replace(/^\/+/, ''); // "prepon/" (empty for a root base)
  let r = route.replace(/^\/+/, '');
  if (prefix && (r + '/').startsWith(prefix)) r = r.slice(prefix.length - 1).replace(/^\/+/, '');
  return new URL(r, b).href;
}

const slug = (route) => (route.replace(/^\/+|\/+$/g, '').replace(/[^\w-]+/g, '_') || 'root');

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.base || !a.routes || !a.phase) {
    process.stderr.write('usage: node snapshot.js --base <url> --routes </a,/b> --phase <before|after> [--stamp s] [--widths 360,768,1440] [--storage-state file] [--wait-for selector] [--viewport] [--out dir]\n');
    return 2;
  }
  const routes = String(a.routes).split(',');
  const mangled = routes.filter((r) => /^[A-Za-z]:[\\/]/.test(r));
  if (mangled.length) {
    process.stdout.write(JSON.stringify({ error: 'route-looks-like-a-file-path', routes: mangled, hint: 'Git Bash on Windows rewrites arguments that start with "/". Pass routes without the leading slash (demo/fleet), or set MSYS_NO_PATHCONV=1.' }) + '\n');
    return 2;
  }
  const pw = loadPlaywright();
  if (!pw) {
    process.stdout.write(JSON.stringify({ error: 'playwright-not-installed', hint: 'Ask the user before installing: npm i -D playwright && npx playwright install chromium' }) + '\n');
    return 3;
  }

  const root = process.cwd();
  const stamp = typeof a.stamp === 'string' ? a.stamp : new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const out = typeof a.out === 'string' ? path.resolve(a.out) : null;
  const dir = path.join(out || path.join(root, '.prepon'), 'snapshots', stamp, a.phase);
  fs.mkdirSync(dir, { recursive: true });
  if (!out) ensureGitignored(root);
  const show = (f) => (out ? f : path.relative(root, f)).split(path.sep).join('/');
  const widths = String(a.widths || '360,768,1440').split(',').map(Number);
  const heights = { 360: 800, 768: 1024, 1440: 900 };
  let browser;
  try {
    browser = await pw.chromium.launch();
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: 'playwright-browser-missing', detail: String(e.message || e).split('\n')[0], hint: 'Run in the foreground and wait for it to finish: npx playwright install chromium' }) + '\n');
    return 3;
  }
  const shots = [];
  const errors = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: heights[width] || 900 },
        deviceScaleFactor: 1,
        ...(typeof a['storage-state'] === 'string' ? { storageState: a['storage-state'] } : {}),
      });
      for (const route of routes) {
        const file = path.join(dir, `${slug(route)}${a.viewport ? '-viewport' : ''}@${width}.png`);
        const page = await context.newPage(); // fresh page per route, so one failed load can't break the next
        try {
          await page.goto(resolveRoute(a.base, route), { waitUntil: 'networkidle', timeout: 30000 });
          if (typeof a['wait-for'] === 'string') await page.waitForSelector(a['wait-for'], { timeout: 10000 });
          await page.screenshot({ path: file, fullPage: !a.viewport, animations: 'disabled' });
          shots.push({ route, width, file: show(file), finalUrl: page.url() });
        } catch (e) {
          errors.push({ route, width, error: String(e.message || e).split('\n')[0] });
        }
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(JSON.stringify({ dir: show(dir), stamp, shots, errors }, null, 2) + '\n');
  return errors.length ? 1 : 0;
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }, (e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exitCode = 1; });
}
module.exports = { resolveRoute };

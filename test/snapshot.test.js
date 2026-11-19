// Run: node --test test/*.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { resolveRoute } = require('../plugins/prepon/skills/prepon/scripts/snapshot.js');

const SITE = path.join(__dirname, '..', 'site');
const hasPw = (() => { try { require.resolve('playwright', { paths: [SITE] }); return true; } catch { return false; } })();

test('--out writes outside the project and leaves its .gitignore alone', { skip: !hasPw && 'Playwright not installed in site/' }, async () => {
  const server = http.createServer((_, res) => res.end('<h1>Hello</h1>')).listen(0);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'prepon-out-'));
  const ignore = path.join(SITE, '.gitignore');
  const before = fs.existsSync(ignore) ? fs.readFileSync(ignore, 'utf8') : null;
  try {
    const script = path.join(__dirname, '..', 'plugins', 'prepon', 'skills', 'prepon', 'scripts', 'snapshot.js');
    const args = [script, '--base', `http://localhost:${server.address().port}`, '--routes', '/', '--phase', 'audit', '--widths', '360', '--stamp', 't', '--out', out];
    // Run from site/ so the project's Playwright is found, as a user would from their project.
    const stdout = await new Promise((ok, fail) => execFile(process.execPath, args, { cwd: SITE }, (e, so) => (e ? fail(e) : ok(so))));
    const r = JSON.parse(stdout);
    assert.deepStrictEqual(r.errors, []);
    assert.ok(path.isAbsolute(r.shots[0].file), r.shots[0].file);
    assert.ok(r.shots[0].file.startsWith(out.split(path.sep).join('/')), r.shots[0].file);
    assert.ok(fs.existsSync(r.shots[0].file));
    assert.strictEqual(fs.existsSync(ignore) ? fs.readFileSync(ignore, 'utf8') : null, before);
    assert.ok(!fs.existsSync(path.join(SITE, '.prepon', 'snapshots', 't')));
  } finally {
    server.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('routes resolve against a base path', () => {
  const base = 'http://localhost:5173/prepon/';
  assert.strictEqual(resolveRoute(base, '/demo/fleet'), 'http://localhost:5173/prepon/demo/fleet');
  assert.strictEqual(resolveRoute(base, 'demo/fleet'), 'http://localhost:5173/prepon/demo/fleet');
  assert.strictEqual(resolveRoute(base, '/prepon/demo'), 'http://localhost:5173/prepon/demo');
  assert.strictEqual(resolveRoute('http://localhost:5173/prepon', '/'), 'http://localhost:5173/prepon/');
  assert.strictEqual(resolveRoute(base, 'prepon/demo'), 'http://localhost:5173/prepon/demo');
  assert.strictEqual(resolveRoute(base, 'prepon'), 'http://localhost:5173/prepon/');
  assert.strictEqual(resolveRoute(base, 'preponderance'), 'http://localhost:5173/prepon/preponderance');
  assert.strictEqual(resolveRoute('http://localhost:3000', '/login'), 'http://localhost:3000/login');
});

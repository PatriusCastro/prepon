// Run: node --test test/*.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { resolveRoute } = require('../plugins/prepon/skills/prepon/scripts/snapshot.js');

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

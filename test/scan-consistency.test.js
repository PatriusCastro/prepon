// Run: node --test test/
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const SCRIPT = path.join(__dirname, '../plugins/prepon/skills/prepon/scripts/scan-consistency.js');

function scanDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepon-c-'));
  for (const [name, src] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), src);
  try { return JSON.parse(execFileSync('node', [SCRIPT, dir], { encoding: 'utf8' })); }
  catch (e) { return JSON.parse(e.stdout); }
}

const btn = (cls) => `<button className="${cls}">Go</button>\n`;
const NORM = 'rounded-md bg-blue-600 text-white h-10 font-medium hover:bg-blue-700 focus-visible:ring-2 disabled:opacity-50';

test('flags the odd radius and the button missing states', () => {
  const r = scanDir({
    'A.tsx': btn(NORM).repeat(5) + btn('rounded-2xl bg-blue-600 text-white h-10 font-medium'),
    'b.css': '.card{border: 1px solid #e5e7eb; border-radius: 6px} p{ /* the border of the page */ }',
  });
  assert.ok(r.properties.radius.outliers.some((o) => o.value === '2xl'));
  assert.deepStrictEqual(r.buttons.missingStates.map((m) => m.missing).sort(), ['disabled', 'focus-visible', 'hover']);
  assert.strictEqual(r.buttons.variants.length, 2);
  // prose "border" and CSS border: don't count as Tailwind border classes
  assert.deepStrictEqual(r.properties['border-width'].values.map((v) => v.value), ['1px']);
  assert.ok(r.issues > 0);
});

test('consistent project is clean; state variants do not count as base colors', () => {
  const r = scanDir({ 'A.tsx': btn(NORM).repeat(6) });
  assert.strictEqual(r.issues, 0);
  assert.deepStrictEqual(r.properties.background.values.map((v) => v.value), ['blue-600']);
});

test('raw <button> outside an existing Button component is flagged', () => {
  const r = scanDir({
    'Button.tsx': `export function Button(p) { return <button className="${NORM}" {...p} /> }`,
    'Page.tsx': btn(NORM),
  });
  assert.strictEqual(r.buttons.bypassComponent.length, 1);
  assert.match(r.buttons.bypassComponent[0], /Page\.tsx:1$/);
});

test('token-based CSS: tokens are never outliers, raw literals among tokens are', () => {
  const css = 'a{font-size:var(--s1)} b{font-size:var(--s1)} c{font-size:var(--s2)} d{font-size:var(--s3)} e{font-size:13px} f{font-size:inherit}';
  const r = scanDir({ 'x.css': css });
  assert.deepStrictEqual(r.properties['font-size'].outliers.map((o) => o.value), ['13px']);
});

test('--summary keeps outliers with locations and drops the full value lists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepon-s-'));
  fs.writeFileSync(path.join(dir, 'A.tsx'), btn(NORM).repeat(5) + btn('rounded-2xl bg-blue-600 text-white h-10 font-medium'));
  let out;
  try { out = execFileSync('node', [SCRIPT, '--summary', dir], { encoding: 'utf8' }); } catch (e) { out = e.stdout; }
  const r = JSON.parse(out);
  assert.ok(r.properties.radius.outliers[0].locations[0].endsWith('A.tsx:6'));
  assert.strictEqual(r.properties.radius.values, undefined);
  assert.strictEqual(r.buttons.missingStatesTotal, 3);
});

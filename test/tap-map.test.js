// Run: node --test test/*.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { thumbZone, analyze } = require('../plugins/prepon/skills/prepon/scripts/tap-map.js');

test('thumb zones on a 360x800 phone', () => {
  assert.strictEqual(thumbZone(180, 700, 360, 800), 'easy');    // bottom centre
  assert.strictEqual(thumbZone(180, 300, 360, 800), 'stretch'); // middle
  assert.strictEqual(thumbZone(30, 40, 360, 800), 'hard');      // top-left corner
  assert.strictEqual(thumbZone(180, 40, 360, 800), 'stretch');  // top centre
});

test('flags small, crowded, unreachable primary, and busy screens', () => {
  const t = (label, x, y, w, h, extra = {}) => ({ label, x, y, w, h, firstScreen: y < 800, pinned: null, primary: false, ...extra });
  const many = Array.from({ length: 13 }, (_, i) => t(`item ${i}`, 10, 100 + i * 50, 340, 44));
  const r = analyze({
    targets: [
      t('Save', 10, 10, 60, 44, { primary: true }),   // primary in top-left: hard
      t('x', 74, 10, 20, 20),                         // fails WCAG and 4px from Save: crowded
      ...many,
      t('Footer link', 10, 1500, 100, 44),            // below the fold
    ],
    words: 120, fontSizes: ['14px', '16px'], pageHeight: 1600,
  }, 360, 800, 'button.primary');
  const types = r.issues.map((i) => i.type);
  assert.ok(types.includes('primary-hard-to-reach'));
  assert.ok(types.includes('small-target'));
  assert.ok(types.includes('crowded'));
  assert.ok(types.includes('busy-first-screen'));
  assert.strictEqual(r.targets.at(-1).zone, 'below-fold');
  assert.strictEqual(r.screensTall, 2);
});

test('inline links are exempt from target size', () => {
  const r = analyze({ targets: [{ label: 'OSM', x: 10, y: 700, w: 60, h: 15, firstScreen: true, inline: true }], words: 10, fontSizes: ['14px'], pageHeight: 800 }, 360, 800, null);
  assert.ok(!r.issues.some((i) => i.type === 'small-target'));
});

test('repeated primary judged by best match; overflow flagged', () => {
  const row = (y) => ({ label: 'Open', x: 10, y, w: 300, h: 48, firstScreen: y < 800, primary: true });
  const r = analyze({ targets: [row(600), row(900), row(1200)], words: 10, fontSizes: [], pageHeight: 1600, pageWidth: 878 }, 360, 800, '.row');
  const types = r.issues.map((i) => i.type);
  assert.ok(!types.includes('primary-below-fold'));
  assert.ok(types.includes('page-wider-than-viewport'));
});

// Run: node --test test/check-page.test.js  (needs Playwright; uses the copy installed in site/ if there is one)
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { inspect } = require('../plugins/prepon/skills/prepon/scripts/check-page.js');

let pw = null;
for (const p of [process.cwd(), path.join(__dirname, '..', 'site')]) {
  try { pw = require(require.resolve('playwright', { paths: [p] })); break; } catch { /* next */ }
}

const BROKEN = `<body style="margin:0;font:16px/1.5 sans-serif">
  <div style="width:1600px">too wide</div>
  <div style="width:80px;height:20px;overflow:hidden;white-space:nowrap">This label is cut off</div>
  <p style="opacity:0">Waiting for a scroll animation that never ran</p>
  <p>${'Long line of running text that keeps going without a measure. '.repeat(12)}</p>
  <div style="position:relative"><p>Hidden behind a box</p><div style="position:absolute;inset:0;background:#fff"></div></div>
  <div style="width:80px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Deliberately truncated text</div>
</body>`;

test('page check finds overflow, clipping, covering, hidden content, and long lines', { skip: !pw && 'Playwright not installed' }, async () => {
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.setContent(BROKEN);
    const r = await page.evaluate(inspect, { maxExamples: 5, longLine: 90 });
    assert.ok(r.overflow && r.overflow.scrollWidth > 1400);
    assert.strictEqual(r.clipped.count, 1, JSON.stringify(r.clipped));
    assert.strictEqual(r.hidden.count, 1);
    assert.strictEqual(r.covered.count, 1);
    assert.ok(r.long.count >= 1);
  } finally {
    await browser.close();
  }
});

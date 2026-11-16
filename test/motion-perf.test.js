// Run: node --test test/motion-perf.test.js  (the page test needs Playwright; uses the copy installed in site/ if there is one)
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { frameStats, inspectAnimations } = require('../plugins/prepon/skills/prepon/scripts/motion-perf.js');

let pw = null;
for (const p of [process.cwd(), path.join(__dirname, '..', 'site')]) {
  try { pw = require(require.resolve('playwright', { paths: [p] })); break; } catch { /* next */ }
}

test('frame stats: counts what the compositor began and dropped', () => {
  assert.deepStrictEqual(frameStats([], 3), { frames: 0, dropped: 0, droppedPct: 0, fps: 0 });
  const ev = [...Array(180).fill({ name: 'BeginFrame' }), ...Array(18).fill({ name: 'DroppedFrame' }), { name: 'Other' }];
  assert.deepStrictEqual(frameStats(ev, 3), { frames: 180, dropped: 18, droppedPct: 10, fps: 54 });
});

const PAGE = `<style>
  @keyframes grow { to { width: 300px } }
  @keyframes spin { to { transform: rotate(1turn) } }
  .grow { width: 10px; height: 10px; background: red; animation: grow 2s infinite }
  .spin { width: 10px; height: 10px; background: blue; animation: spin 2s infinite }
  .below { position: absolute; top: 3000px }
  .glass { position: fixed; inset: 0; backdrop-filter: blur(12px) }
</style>
<div class="grow"></div><div class="spin"></div><div class="spin below"></div><div style="opacity:0"><div class="spin ghost"></div></div><div class="glass"></div>`;

test('animation inspection: layout animation, loops off screen or under an invisible parent, and big blur flagged; a visible transform is not', { skip: !pw && 'Playwright not installed' }, async () => {
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
    await page.setContent(PAGE);
    const r = await page.evaluate(inspectAnimations, { maxExamples: 5 });
    assert.deepStrictEqual(r.main, ['div.grow grow: width']);
    assert.deepStrictEqual(r.offscreen, ['div.spin.below spin', 'div.spin.ghost spin']);
    assert.strictEqual(r.heavy.length, 1);
  } finally {
    await browser.close();
  }
});

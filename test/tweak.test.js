// Run: node --test test/*.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { run } = require('../plugins/prepon/skills/prepon/scripts/tweak.js');

const SITE = path.join(__dirname, '..', 'site');
const hasPw = (() => { try { require.resolve('playwright', { paths: [SITE] }); return true; } catch { return false; } })();
const skip = !hasPw && 'Playwright not installed in site/';

const PAGE = `<!doctype html><style>
  :root { --radius: 8px; }
  .btn { border-radius: var(--radius); padding: 12px 16px; background: #1c1b1a; color: #fff; border: 0; }
  .card { border-radius: var(--radius); padding: 16px; }
  #small { height: 20px; padding: 0 4px; color: #bbb; background: #fff; border: 0; }
</style><button class="btn">Save</button><button class="btn">Send</button><button class="btn">Pay</button>
<div class="card">Card</div><button id="small" onclick="window.clicked = true">x</button>`;

async function withServer(fn) {
  const server = http.createServer((_, res) => res.end(PAGE)).listen(0);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'prepon-tweak-'));
  const cwd = process.cwd();
  process.chdir(SITE); // so the project's Playwright is found, as when run from a user's project
  try {
    return await fn(`http://localhost:${server.address().port}/`, out);
  } finally {
    process.chdir(cwd);
    server.close();
    fs.rmSync(out, { recursive: true, force: true });
  }
}

const radii = (page) => page.evaluate(() => [...document.querySelectorAll('.btn, .card')].map((e) => getComputedStyle(e).borderRadius));

test('edits preview per scope, clicks never reach the app, and Done writes the change list', { skip }, () => withServer(async (url, out) => {
  const { code, result } = await run({ url, out, stamp: 't', headless: true, onPage: async (page) => {
    await page.waitForFunction(() => document.querySelector('prepon-tweak'));
    await page.click('.btn'); // real click: selects the element in the overlay
    await page.evaluate(() => window.__preponTweak.set('border-radius', '12px'));
    assert.deepStrictEqual(await radii(page), ['12px', '8px', '8px', '8px'], 'only this one');
    const scope = (s) => page.locator(`prepon-tweak [data-scope="${s}"]`).click();
    await scope('similar');
    assert.deepStrictEqual(await radii(page), ['12px', '12px', '12px', '8px'], 'all like it');
    await scope('token');
    assert.deepStrictEqual(await radii(page), ['12px', '12px', '12px', '12px'], 'token reaches the card too');

    await page.click('#small');
    assert.strictEqual(await page.evaluate(() => window.clicked), undefined, 'app click handler ran');
    await scope('element');
    await page.locator('prepon-tweak input[data-prop="font-size"]').fill('11px');
    // Dragging a field's label scrubs the value, 1 px per 3 px of travel.
    const label = await page.locator('prepon-tweak [data-scrub="border-radius"]').boundingBox();
    await page.mouse.move(label.x + 5, label.y + 5);
    await page.mouse.down();
    await page.mouse.move(label.x + 35, label.y + 5, { steps: 5 });
    await page.mouse.up();
    assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById('small')).borderRadius), '10px');
    await page.locator('prepon-tweak [data-reset="border-radius"]').click();
    await page.locator('prepon-tweak button.done').click();
  } });
  assert.strictEqual(code, 0, JSON.stringify(result));
  assert.strictEqual(result.status, 'done');
  assert.strictEqual(result.changes, 2);
  const [radius, font] = JSON.parse(fs.readFileSync(result.file, 'utf8')).changes;
  assert.strictEqual(radius.scope, 'token');
  assert.strictEqual(radius.token, '--radius');
  assert.deepStrictEqual([radius.property, radius.from, radius.to, radius.element.tag, radius.element.text], ['border-radius', '8px', '12px', 'button', 'Save']);
  assert.strictEqual(font.scope, 'element');
  assert.ok(font.warnings.some((w) => /24 px WCAG/.test(w)), font.warnings);
  assert.ok(font.warnings.some((w) => /contrast/.test(w)), font.warnings);
  assert.ok(font.warnings.some((w) => /11 px/.test(w)), font.warnings);
}));

test('states are forced and edited on their own; corners, sides, and shadow parts edit separately', { skip }, () => withServer(async (url, out) => {
  const { code, result } = await run({ url, out, stamp: 't', headless: true, onPage: async (page) => {
    await page.waitForFunction(() => document.querySelector('prepon-tweak'));
    const style = (sel, p) => page.evaluate(([s, q]) => getComputedStyle(document.querySelector(s)).getPropertyValue(q), [sel, p]);
    await page.click('.btn');
    await page.locator('prepon-tweak [data-state="hover"]').click();
    await page.waitForFunction(() => document.querySelector('.btn').hasAttribute('data-prepon-force'));
    await page.evaluate(() => window.__preponTweak.set('background-color', 'rgb(255, 0, 0)'));
    assert.strictEqual(await style('.btn', 'background-color'), 'rgb(255, 0, 0)', 'hover edit shows while hover is forced');
    await page.locator('prepon-tweak [data-state="default"]').click();
    await page.waitForFunction(() => !document.querySelector('.btn').hasAttribute('data-prepon-force'));
    assert.strictEqual(await style('.btn', 'background-color'), 'rgb(28, 27, 26)', 'default state is untouched');

    await page.locator('prepon-tweak [data-split="border-radius"]').click();
    await page.locator('prepon-tweak input[data-prop="border-top-left-radius"]').fill('20px');
    assert.deepStrictEqual([await style('.btn', 'border-top-left-radius'), await style('.btn', 'border-top-right-radius')], ['20px', '8px']);
    await page.evaluate(() => window.__preponTweak.set('shadow-y', '6px'));
    assert.match(await style('.btn', 'box-shadow'), / 0px 6px 12px 0px$/);

    await page.click('.card');
    await page.evaluate(() => window.__preponTweak.set('border-top-width', '3px'));
    assert.deepStrictEqual([await style('.card', 'border-top-width'), await style('.card', 'border-top-style')], ['3px', 'solid'], 'a width alone makes the line solid');
    await page.locator('prepon-tweak button.done').click();
  } });
  assert.strictEqual(code, 0, JSON.stringify(result));
  const changes = JSON.parse(fs.readFileSync(result.file, 'utf8')).changes;
  const by = (p) => changes.find((c) => c.property === p);
  assert.strictEqual(by('background-color').state, 'hover');
  assert.strictEqual(by('border-top-left-radius').state, 'default');
  assert.ok(by('box-shadow').to.includes('6px'));
  assert.strictEqual(by('border-top-style').to, 'solid');
}));

test('closing the window keeps the edits made so far', { skip }, () => withServer(async (url, out) => {
  const { result } = await run({ url, out, stamp: 't', headless: true, onPage: async (page) => {
    await page.waitForFunction(() => document.querySelector('prepon-tweak'));
    await page.click('.card');
    await page.evaluate(() => window.__preponTweak.set('padding-block', '24px'));
    await page.close();
  } });
  assert.strictEqual(result.status, 'closed');
  assert.strictEqual(JSON.parse(fs.readFileSync(result.file, 'utf8')).changes[0].to, '24px');
}));

// Run: node --test test/
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scan, RULES } = require('../plugins/prepon/skills/prepon/scripts/detect-slop.js');

function run(name, src) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prepon-')), name);
  fs.writeFileSync(f, src);
  return scan(f).map((x) => x.rule);
}

const SLOP = `import { Sparkles } from 'lucide-react';
export default function Hero() {
  return (
    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl shadow-2xl backdrop-blur-md">
      <div className="absolute rounded-full blur-3xl bg-pink-400" />
      <h1 className="bg-clip-text text-transparent">🚀 Elevate your workflow seamlessly</h1>
      <p className="text-gray-400 text-[11px]">Lorem ipsum</p>
      <div className="border-l-4 border-red-500 p-4">Alert</div>
      <button onClick={() => go()} className="h-6 w-6 outline-none bg-[#1e40af] animate-bounce transition-all duration-700">x</button>
      <motion.div whileInView={{ opacity: 1 }} />
      <input onChange={(e) => set(e.target.value)} placeholder="Email" />
    </div>
  );
}`;

const CLEAN = `export function Field({ id }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">Plate number</label>
      <input id={id} className="h-12 rounded-md border px-3 focus-visible:ring-2" placeholder="ABC 1234" />
      <button className="min-h-12 px-4 rounded-md bg-primary text-primary-foreground">Save vehicle</button>
      <p className="text-gray-400 dark:text-gray-400">ok</p>{/* prepon-ignore low-contrast-text */}
    </div>
  );
}`;

const NEW_CSS = '.a{box-shadow: 6px 6px 0 #000} .g{background-image: linear-gradient(to right, #8881 1px, transparent 1px)} .h{background: radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%)} .s{background: repeating-linear-gradient(45deg,#000 0 2px,#fff 2px 6px)} .t{letter-spacing:-0.05em} .e{transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)} @keyframes marquee{} @keyframes blink{} p{text-align: justify}';
const NEW_TSX = '<h1 className="font-serif italic text-6xl">Hi</h1><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/><p>Not just a tool. A platform for teams.</p><b>01</b><b>02</b><b>03</b><p>a — b — c — d — e — f</p>';
const TEMPLATE_CSS = '.c{box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04); background: linear-gradient(180deg, var(--surface), var(--bg))} .l{background: linear-gradient(90deg, transparent, var(--line), transparent)} .c:hover{transform: translateY(-2px)}';
const TEMPLATE_TSX = '<p className="eyebrow">a</p><h2>A</h2><p className="eyebrow">b</p><h2>B</h2><p className="text-xs uppercase tracking-widest">c</p>';
const PERF_CSS = '.p{transition: height 200ms, opacity 200ms} @keyframes glow{0%{box-shadow:0 0 4px red}100%{box-shadow:0 0 12px red}} .w1{will-change:transform}.w2{will-change:transform}.w3{will-change:opacity}.w4{will-change:transform}';
const PERF_TSX = "window.addEventListener('scroll', onScroll);\nel.addEventListener('touchmove', (e) => { e.preventDefault(); });";
const COPY_TSX = '<p>Delve into a tapestry of features.</p><p>I hope this helps!</p><p>Oops! Something went wrong.</p><a href="/fees">Learn more</a><p>Fast. Simple. Secure.</p><p>Saved!</p><p>Done!</p>';
const CARDS ='<Card><Card>inner</Card></Card>\n' + Array.from({ length: 6 }, () => '<div className="rounded-xl border p-4">x</div>').join('\n');

test('every rule fires on the slop fixture or the css fixture', () => {
  const hits = new Set([
    ...run('Cards.tsx', CARDS),
    ...run('Copy.tsx', COPY_TSX),
    ...run('perf.css', PERF_CSS),
    ...run('Perf.tsx', PERF_TSX),
    ...run('t.css', TEMPLATE_CSS),
    ...run('T.tsx', TEMPLATE_TSX),
    ...run('new.css', NEW_CSS),
    ...run('New.tsx', NEW_TSX),
    ...run('Hero.tsx', SLOP),
    ...run('a.css', 'body{font-family:"Inter",sans-serif} .b{outline:none; font-size:10px; border-radius:24px}'),
  ]);
  const missing = RULES.map((r) => r.id).filter((id) => !hits.has(id));
  assert.deepStrictEqual(missing, []);
});

test('clean, labelled, tokenised code passes', () => {
  assert.deepStrictEqual(run('Field.tsx', CLEAN), []);
});

test('react native: hitSlop and theme files are respected', () => {
  const rn = `<Pressable hitSlop={12} style={{ height: 32 }}><Text>Go</Text></Pressable>`;
  assert.deepStrictEqual(run('Btn.tsx', rn), []);
  assert.deepStrictEqual(run('theme.ts', `export const t = { color: '#123456' }`), []);
  assert.ok(run('Card.tsx', `const s = StyleSheet.create({ t: { color: '#999', fontSize: 10 } })`).includes('tiny-text'));
});

test('file-level and JSX-comment suppression', () => {
  const quoted = `{/* prepon-ignore-file gradient-text,filler-copy */}\n<code>bg-clip-text</code> <p>seamless</p> <p className="shadow-2xl" />`;
  assert.deepStrictEqual(run('Doc.tsx', quoted), ['heavy-shadow']);
  assert.deepStrictEqual(run('All.tsx', `// prepon-ignore-file\n<p className="shadow-2xl bg-clip-text" />`), []);
  assert.deepStrictEqual(run('Line.tsx', `<p className="shadow-2xl" />{/* prepon-ignore heavy-shadow */}`), []);
});

test('motion rules: short named transitions pass, slow ones do not', () => {
  assert.deepStrictEqual(run('ok.css', '.a{transition: transform 200ms ease-out, opacity 150ms}'), []);
  assert.deepStrictEqual(run('slow.css', '.a{transition: opacity 0.6s}'), ['slow-motion']);
  assert.deepStrictEqual(run('slow2.css', '.a{transition: transform 800ms}'), ['slow-motion']);
  assert.deepStrictEqual(run('fast.css', '.a{transition: opacity .3s, transform 0.25s}'), []);
});

test('motion performance: layout, paint, layers and listeners flagged; compositor-only motion passes', () => {
  assert.deepStrictEqual(run('a.css', '.p{transition: opacity 200ms, max-height .3s}'), ['layout-animation']);
  assert.deepStrictEqual(run('b.css', '@keyframes grow{from{width:0}to{width:100%}}'), ['layout-animation']);
  assert.deepStrictEqual(run('A.tsx', "<motion.div animate={{ height: 'auto', opacity: 1 }} /><div className=\"transition-[height]\" />"), ['layout-animation', 'layout-animation']);
  assert.deepStrictEqual(run('c.css', '.g{transition: backdrop-filter 200ms}'), ['paint-animation']);
  const ok = '.ok{transition: transform 200ms, opacity 200ms, border-width 100ms} @keyframes in{from{opacity:0;transform:translateY(8px);transform-origin: top left}} .x{will-change:transform} .y{animation: drift 8s linear infinite}';
  assert.deepStrictEqual(run('ok.css', ok), []);
  assert.deepStrictEqual(run('Ok.tsx', "el.addEventListener('touchstart', (e) => { go(e); }, { passive: true }); <motion.div animate={{ x: 0, opacity: 1 }} />"), []);
});

test('side-stripe: left/top stripes flagged, tab underline and hairlines are not', () => {
  assert.deepStrictEqual(run('a.css', '.alert{border-left: 4px solid var(--red)}'), ['side-stripe']);
  assert.deepStrictEqual(run('Row.tsx', 'const s = { borderLeftWidth: 4 }'), ['side-stripe']);
  assert.deepStrictEqual(run('Tab.tsx', '<a className="border-b-2 border-l border-primary">Tab</a>'), []);
  assert.deepStrictEqual(run('b.css', '.card{border-left: 1px solid #ddd}'), []);
});

test('new rules stay quiet on the craft baseline', () => {
  const ok = '.a{box-shadow: 0 1px 2px rgb(0 0 0/.05)} .t{letter-spacing:-0.02em} .e{transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1)} .r{background: radial-gradient(circle, #fff, #eee)}';
  assert.deepStrictEqual(run('ok.css', ok), []);
  assert.deepStrictEqual(run('Skel.tsx', '<div className="h-24 w-full rounded-full animate-pulse"/><ol><li>Step one</li></ol>'), []);
  assert.deepStrictEqual(run('Two.tsx', '<p>One — two — three.</p>'), []);
  assert.deepStrictEqual(run('Empty.ts', "const r = { a: '—', b: '—', c: \"—\", d: `—` }; <td>—</td><td> — </td>"), []);
});

test('template rules: flag the premium-dark kit, leave plain borders, shadows and single labels alone', () => {
  assert.deepStrictEqual(run('sheen.css', '.c{box-shadow: inset 0 1px 0 rgba(255,255,255,.06)}'), ['sheen-edge']);
  assert.deepStrictEqual(run('Sheen.tsx', '<div className="shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />'), ['sheen-edge']);
  assert.deepStrictEqual(run('grad.css', '.c{background: linear-gradient(to bottom, var(--card), var(--background))}'), ['gradient-surface']);
  assert.deepStrictEqual(run('Grad.tsx', '<div className="bg-gradient-to-b from-white/5 to-transparent" />'), ['gradient-surface']);
  assert.deepStrictEqual(run('Line.tsx', '<hr className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />'), ['fading-hairline']);
  assert.deepStrictEqual(run('lift.css', '.card { color: red }\n.card:hover, .card:focus { border-color: red; transform: translateY(-4px); }'), ['hover-lift']);
  assert.deepStrictEqual(run('Lift.tsx', '<a className="hover:-translate-y-1">x</a>'), ['hover-lift']);
  const ok = '.a{box-shadow: inset 0 1px 0 rgb(0 0 0 / .1), 0 1px 2px rgb(0 0 0/.05)} .b{background: linear-gradient(90deg, var(--accent), var(--accent-2))} .c{border-top: 1px solid var(--line)} .d:hover{background: var(--sunk)} .e{transform: translateY(-2px)} .f:hover{transform: translateX(2px)}';
  assert.deepStrictEqual(run('ok.css', ok), []);
  assert.deepStrictEqual(run('One.tsx', '<p className="eyebrow">Step 2 of 4</p><h1>Your business</h1><p className="eyebrow">Draft</p>'), []);
});

test('copy rules: generated-copy tells flagged, plain product copy and code pass', () => {
  assert.deepStrictEqual(run('Err.tsx', '<p>Uh-oh, an unexpected error occurred.</p>'), ['vague-error', 'vague-error']);
  assert.deepStrictEqual(run('Link.html', '<a href="/x">click here</a>'), ['vague-link']);
  assert.deepStrictEqual(run('Two.tsx', '<p>Saved!</p><p>Sent!</p>'), []);
  const ok = `const total = items!.length; if (!ok) return;
<p>Payment not sent. Your form is saved. Check your connection and try again.</p>
<a href="/fees">Read the fee schedule</a><a aria-label="Learn more about refunds" href="/r">Learn more</a>
<p>Most permits are approved within two working days.</p>`;
  assert.deepStrictEqual(run('Ok.tsx', ok), []);
});

test('card rules: five cards is fine, six is spam, nesting always flagged', () => {
  const five = Array.from({ length: 5 }, () => '<div className="rounded-lg border p-4">x</div>').join('\n');
  assert.deepStrictEqual(run('Five.tsx', five), []);
  const six = run('Six.tsx', five + '\n<div className="rounded-lg shadow p-6">y</div>');
  assert.deepStrictEqual(six, ['card-spam']);
  assert.deepStrictEqual(run('Nest.tsx', '<Card><CardContent><Card>x</Card></CardContent></Card>'), ['nested-card']);
  assert.deepStrictEqual(run('Siblings.tsx', '<Card>a</Card><Card>b</Card>'), []);
});

test('css: heavy shadows, glow blobs, one gradient-text per line; floating shadow ok', () => {
  assert.deepStrictEqual(run('h.css', '.a{box-shadow: 0 25px 50px rgba(0,0,0,.5)}'), ['heavy-shadow']);
  assert.deepStrictEqual(run('g.css', '.a{box-shadow: 0 0 40px #fff}'), ['heavy-shadow']);
  assert.deepStrictEqual(run('f.css', '.menu{box-shadow: 0 8px 24px rgb(0 0 0 / .18)}'), []);
  assert.deepStrictEqual(run('b.css', '.blob{filter: blur(80px)}'), ['blur-blob']);
  assert.deepStrictEqual(run('t.css', '.t{-webkit-background-clip: text; background-clip: text}'), ['gradient-text']);
});

test('hook: silent unless opted in, reports findings with exit 2 when on', () => {
  const { main } = require('../plugins/prepon/skills/prepon/scripts/hook-slop.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepon-hook-'));
  const file = path.join(dir, 'Hero.tsx');
  fs.writeFileSync(file, '<h1 className="bg-clip-text">Hi</h1>');
  const event = JSON.stringify({ cwd: dir, tool_input: { file_path: file } });
  const write = process.stderr.write;
  process.stderr.write = () => true;
  try {
    assert.strictEqual(main(event), 0);
    fs.mkdirSync(path.join(dir, '.prepon'));
    fs.writeFileSync(path.join(dir, '.prepon', 'hook-on'), '');
    assert.strictEqual(main(event), 2);
    assert.strictEqual(main(JSON.stringify({ cwd: dir, tool_input: { file_path: path.join(dir, 'notes.md') } })), 0);
  } finally {
    process.stderr.write = write;
  }
});

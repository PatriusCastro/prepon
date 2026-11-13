#!/usr/bin/env node
// Prepon consistency scan: inventories the visual values a project actually uses (radius, borders,
// colors, shadows, type) and how its buttons are styled, then flags outliers against the project's own norm.
// Usage: node scan-consistency.js [--summary] <file-or-dir> [...more]   (--summary: outliers, top values, button issues only)
// Output: JSON { properties: {...}, buttons: {...}, issues: n }. Exit 1 if any outliers or button issues.
//
// To track another property, append an object to PROPERTIES:
//   id        property name used in the report
//   patterns  list of [RegExp, normalize(match) => string|null, scope?]; null drops the match;
//             scope 'class' runs only inside class strings (className, cn(), @apply), else the whole file
//   ignore    optional values that never count as outliers (e.g. 'full' radius for pills and avatars)
'use strict';

const TW_PREFIX = String.raw`(?<![\w-])((?:[\w-]+:)*)`; // captures variant prefixes like "md:" or "hover:"
const COLOR = String.raw`(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|white|black|transparent|\[#[0-9a-fA-F]{3,8}\]|[a-z]+(?:-[a-z]+)*-(?:foreground|primary|secondary|muted|accent|border|destructive))`;
const base = (fn) => (m) => (/(?:^|:)(?:hover|focus|focus-visible|active|disabled|group-hover|dark|aria-[\w-]+|data-[\w-]+):$/.test(m[1] || '') ? null : fn(m));

const PROPERTIES = [
  {
    id: 'radius',
    ignore: ['full', 'none', '0'],
    patterns: [
      [new RegExp(TW_PREFIX + String.raw`rounded(?:-(?:[trbl]|tl|tr|bl|br|s|e|ss|se|es|ee))?(?:-(none|sm|md|lg|xl|2xl|3xl|full|\[[^\]]+\]))?(?![\w-])`, 'g'), base((m) => m[2] || 'DEFAULT'), 'class'],
      [/border-radius\s*:\s*([^;}"'\n]+)/g, (m) => m[1].trim()],
      [/borderRadius\s*:\s*([\d.]+)/g, (m) => m[1]],
    ],
  },
  {
    id: 'border-width',
    ignore: ['0'],
    patterns: [
      [new RegExp(TW_PREFIX + String.raw`border(?:-[trblxyse])?(?:-(0|2|4|8|\[\d+px\]))?(?![\w-])`, 'g'), base((m) => m[2] || '1'), 'class'],
      [/border(?:-(?:top|right|bottom|left))?(?:-width)?\s*:\s*(\d+(?:\.\d+)?px)/g, (m) => m[1]],
      [/borderWidth\s*:\s*([\d.]+)/g, (m) => m[1]],
    ],
  },
  {
    id: 'border-color',
    patterns: [
      [new RegExp(TW_PREFIX + String.raw`border(?:-[trblxyse])?-(` + COLOR + ')', 'g'), base((m) => m[2]), 'class'],
      [/border(?:-color)?\s*:[^;}\n]*?(#[0-9a-fA-F]{3,8}|var\(--[\w-]+\))/g, (m) => m[1].toLowerCase()],
      [/borderColor\s*:\s*['"]?([^'",}\s]+)/g, (m) => m[1]],
    ],
  },
  {
    id: 'background',
    patterns: [
      [new RegExp(TW_PREFIX + 'bg-(' + COLOR + ')', 'g'), base((m) => m[2]), 'class'],
      [/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|var\(--[\w-]+\))/g, (m) => m[1].toLowerCase()],
      [/backgroundColor\s*:\s*['"]?([^'",}\s]+)/g, (m) => m[1]],
    ],
  },
  {
    id: 'text-color',
    patterns: [
      [new RegExp(TW_PREFIX + 'text-(' + COLOR + ')', 'g'), base((m) => m[2]), 'class'],
      [/(?<![-\w])color\s*:\s*(#[0-9a-fA-F]{3,8}|var\(--[\w-]+\))/g, (m) => m[1].toLowerCase()],
    ],
  },
  {
    id: 'shadow',
    ignore: ['none'],
    patterns: [
      [new RegExp(TW_PREFIX + String.raw`shadow(?:-(none|sm|md|lg|xl|2xl|inner|\[[^\]]+\]))?(?![\w-])`, 'g'), base((m) => m[2] || 'DEFAULT'), 'class'],
      [/box-shadow\s*:\s*([^;}\n]+)/g, (m) => m[1].trim()],
      [/elevation\s*:\s*(\d+)/g, (m) => `elevation ${m[1]}`],
    ],
  },
  {
    id: 'font-size',
    patterns: [
      [new RegExp(TW_PREFIX + String.raw`text-(xs|sm|base|lg|xl|[2-9]xl|\[\d+(?:\.\d+)?(?:px|rem)\])(?![\w-])`, 'g'), base((m) => m[2]), 'class'],
      [/font-size\s*:\s*([^;}\n]+)/g, (m) => m[1].trim()],
      [/fontSize\s*:\s*([\d.]+)/g, (m) => m[1]],
    ],
  },
  {
    id: 'font-weight',
    patterns: [
      [new RegExp(TW_PREFIX + String.raw`font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?![\w-])`, 'g'), base((m) => m[2]), 'class'],
      [/font-weight\s*:\s*(\w+)/g, (m) => m[1]],
      [/fontWeight\s*:\s*['"]?(\w+)/g, (m) => m[1]],
    ],
  },
];

const fs = require('fs');
const path = require('path');

const CODE = ['js', 'jsx', 'ts', 'tsx'];
const SCAN_EXTS = new Set([...CODE, 'css', 'scss', 'html']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.expo', 'coverage', '.prepon', 'Pods', 'out']);
const TOKEN_FILE = /(?:theme|tokens?|colou?rs?|palette|tailwind\.config)\.[cm]?[jt]sx?$/i; // definitions, not usage
const MAX_LOCATIONS = 8;
const TOKEN_REF = /^(?:var\(--|theme\.|tokens?\.|colors\.|\$)/;
// A shorthand made only of tokens and zeros (e.g. '0 var(--r) var(--r) 0') is still a token use.
const isToken = (v) => TOKEN_REF.test(v) || v.split(/\s+/).every((p) => p === '0' || TOKEN_REF.test(p));
const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'currentColor', 'currentcolor', 'transparent', 'none', 'auto', '0']);
const CLASS_SEGMENT = /(?:className|class)\s*=\s*\{?\s*(["'`])([\s\S]*?)\1|\b(?:cn|clsx|classnames|cva|twMerge)\(([\s\S]*?)\)|@apply\s+([^;]+)/g;

function collect(p, out) {
  let st;
  try { st = fs.statSync(p); } catch { process.stderr.write(`prepon: cannot read ${p}\n`); return; }
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) if (!SKIP_DIRS.has(name)) collect(path.join(p, name), out);
  } else if (SCAN_EXTS.has(path.extname(p).slice(1).toLowerCase()) && !TOKEN_FILE.test(p)) {
    out.push(p);
  }
}

function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (idx) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

// Outliers: values used rarely when one value clearly dominates. A value is an outlier if it appears at most
// twice and the most-used value appears at least 4 times as often. ponytail: frequency heuristic; it can't know
// intended roles (a deliberate small radius for chips) or that Tailwind `md` and CSS `6px` are the same radius,
// so findings are questions for review, not verdicts. Upgrade path: map Tailwind scale names to px.
function summarize(map, ignore = []) {
  const values = [...map.entries()]
    .map(([value, locs]) => ({ value, count: locs.length, locations: locs.slice(0, MAX_LOCATIONS) }))
    .sort((a, b) => b.count - a.count);
  const total = values.reduce((n, v) => n + v.count, 0);
  // Token references (var(--x), theme.x) are deliberate roles, never outliers. If tokens are the norm,
  // any raw literal is the finding; otherwise compare raw literals by frequency.
  const tokenUses = values.filter((v) => isToken(v.value)).reduce((n, v) => n + v.count, 0);
  const raw = values.filter((v) => !isToken(v.value) && !KEYWORDS.has(v.value) && !ignore.includes(v.value));
  const top = raw.length ? raw[0].count : 0;
  const outliers = tokenUses * 2 >= total && tokenUses > 0
    ? raw.map((v) => ({ value: v.value, reason: 'raw value where tokens are the norm' }))
    : raw.filter((v) => v.count <= 2 && top >= 4 * v.count)
        .map((v) => ({ value: v.value, reason: `used ${v.count}x; most common is ${raw[0].value} (${top}x)` }));
  return { distinct: values.length, total, values, outliers };
}

const BUTTON_TAG = /<(button|Button|IconButton|Pressable|Touchable\w*)\b((?:=>|[^<>])*)>/g;
const STATE_CHECKS = {
  hover: /\bhover:/,
  'focus-visible': /\bfocus(?:-visible)?:/,
  disabled: /\bdisabled:|\baria-disabled|\bdisabled[=\s>{]/,
  pressed: /\bactive:|android_ripple|\bpressed\b/,
};

function analyzeButton(attrs) {
  const cls = (attrs.match(/(?:className|class)=\{?\s*["'`]([^"'`]*)["'`]/) || [])[1] || '';
  const pick = (re) => (cls.match(re) || [])[0] || '-';
  const signature = [
    pick(/(?<![\w:-])rounded(?:-[\w[\]]+)?/),
    pick(/(?<![\w:-])bg-[\w[\]#-]+/),
    pick(/(?<![\w:-])text-(?!xs|sm|base|lg|xl|\d)[\w[\]#-]+/),
    pick(/(?<![\w:-])(?:h|min-h)-[\w[\]]+/),
    pick(/(?<![\w:-])font-(?:medium|semibold|bold|normal)/),
  ].join(' ');
  const states = Object.keys(STATE_CHECKS).filter((k) => STATE_CHECKS[k].test(attrs));
  return { cls, signature, states };
}

// --summary keeps only what a review needs: outliers with their locations, the top values, and button issues.
function summaryOf(report) {
  const properties = {};
  for (const [id, p] of Object.entries(report.properties)) {
    properties[id] = {
      distinct: p.distinct,
      top: p.values.slice(0, 5).map((v) => `${v.value} (${v.count})`),
      outliers: p.outliers.map((o) => ({ ...o, locations: (p.values.find((v) => v.value === o.value) || {}).locations })),
    };
  }
  const b = report.buttons;
  return {
    filesScanned: report.filesScanned,
    properties,
    buttons: {
      styledInline: b.styledInline,
      variants: b.variants.length,
      topVariants: b.variants.slice(0, 3).map((v) => `${v.signature} (${v.count})`),
      missingStates: b.missingStates.slice(0, 10),
      missingStatesTotal: b.missingStates.length,
      bypassComponent: b.bypassComponent.slice(0, 10),
      bypassComponentTotal: b.bypassComponent.length,
    },
    issues: report.issues,
  };
}

function main(argv) {
  const summary = argv.includes('--summary');
  argv = argv.filter((x) => x !== '--summary');
  if (argv.length === 0) {
    process.stderr.write('usage: node scan-consistency.js [--summary] <file-or-dir> [...]\n');
    return 2;
  }
  const files = [];
  for (const p of argv) collect(p, files);

  const maps = Object.fromEntries(PROPERTIES.map((p) => [p.id, new Map()]));
  const buttonSigs = new Map();
  const buttons = [];
  const buttonComponentFiles = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lineOf = lineIndex(text);
    const rel = file.split(path.sep).join('/');
    const ext = path.extname(file).slice(1).toLowerCase();

    // Utility classes only count inside class strings, so the word "border" in prose or a CSS
    // `border:` declaration isn't mistaken for a Tailwind class.
    const segments = [];
    for (const m of text.matchAll(CLASS_SEGMENT)) {
      const seg = m[2] ?? m[3] ?? m[4];
      if (seg) segments.push({ text: seg, offset: m.index + m[0].indexOf(seg) });
    }
    for (const prop of PROPERTIES) {
      const map = maps[prop.id];
      for (const [re, norm, scope] of prop.patterns) {
        for (const { text: src, offset } of scope === 'class' ? segments : [{ text, offset: 0 }]) {
          for (const m of src.matchAll(re)) {
            const v = norm(m);
            if (v == null) continue;
            if (!map.has(v)) map.set(v, []);
            map.get(v).push(`${rel}:${lineOf(offset + m.index)}`);
          }
        }
      }
    }

    if (!CODE.includes(ext)) continue;
    if (/(?:export\s+(?:default\s+)?(?:function|const)\s+Button\b|forwardRef[^\n]*\bButton\b)/.test(text)) buttonComponentFiles.push(rel);
    for (const m of text.matchAll(BUTTON_TAG)) {
      const b = analyzeButton(m[2]);
      if (!b.cls) continue; // style comes from a component or StyleSheet; nothing to compare inline
      const loc = `${rel}:${lineOf(m.index)}`;
      buttons.push({ tag: m[1], loc, file: rel, ...b });
      if (!buttonSigs.has(b.signature)) buttonSigs.set(b.signature, []);
      buttonSigs.get(b.signature).push(loc);
    }
  }

  const properties = {};
  let issues = 0;
  for (const prop of PROPERTIES) {
    properties[prop.id] = summarize(maps[prop.id], prop.ignore);
    issues += properties[prop.id].outliers.length;
  }

  // Button states: a state that most styled buttons have but some lack is a behavior inconsistency.
  const missingStates = [];
  for (const state of Object.keys(STATE_CHECKS)) {
    const has = buttons.filter((b) => b.states.includes(state)).length;
    if (has > 0 && has / buttons.length >= 0.5) {
      for (const b of buttons) if (!b.states.includes(state)) missingStates.push({ location: b.loc, missing: state });
    }
  }
  // Raw <button> styled inline when the project already has a Button component.
  const bypassComponent = buttonComponentFiles.length
    ? buttons.filter((b) => b.tag === 'button' && !buttonComponentFiles.includes(b.file)).map((b) => b.loc)
    : [];
  const variants = [...buttonSigs.entries()]
    .map(([signature, locs]) => ({ signature, count: locs.length, locations: locs.slice(0, MAX_LOCATIONS) }))
    .sort((a, b) => b.count - a.count);
  issues += missingStates.length + bypassComponent.length;

  const report = {
    note: 'signature = radius bg text height weight; "-" means not set inline',
    filesScanned: files.length,
    properties,
    buttons: {
      styledInline: buttons.length,
      buttonComponent: buttonComponentFiles,
      variants,
      missingStates,
      bypassComponent,
    },
    issues,
  };
  process.stdout.write(JSON.stringify(summary ? summaryOf(report) : report, null, 2) + '\n');
  return issues ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { PROPERTIES, summarize };

#!/usr/bin/env node
// Prepon slop detector: scans JSX/TSX/JS/TS/CSS/HTML for mechanical "AI slop" tells.
// Usage: node detect-slop.js <file-or-dir> [...more]
// Output: JSON array of { rule, file, line, match, suggestion }. Exit 1 if any findings, 2 on usage error.
// Suppress a deliberate case with a comment containing `prepon-ignore` (optionally `prepon-ignore <rule-id>[,<rule-id>]`)
// on the same line or the line above. In JSX use {/* prepon-ignore <rule-id> */}.
// Suppress a whole file (e.g. docs that quote slop examples) with `prepon-ignore-file [<rule-id>,...]` anywhere in it.
//
// To add a rule, append an object to RULES (minCount: report once per file, only if the pattern matches that often):
//   id          rule id, matching a heading in references/slop-patterns.md
//   pattern     a global RegExp, run over the whole file (so it can span lines)
//   exts        optional list of file extensions the rule applies to (default: all scanned types)
//   when        optional RegExp the matched text must ALSO contain
//   unless      optional RegExp; if the matched text contains it, the match is skipped
//   skipFile    optional RegExp on the file path; matching files are skipped for this rule
//   suggestion  what to do instead (keep it short; slop-patterns.md has the long version)
'use strict';

const PURPLE_HEX = '#667eea|#764ba2|#8b5cf6|#7c3aed|#6d28d9|#6366f1|#4f46e5|#a855f7|#9333ea|#c026d3|#d946ef';
const CODE = ['js', 'jsx', 'ts', 'tsx'];
// One animation definition: a CSS transition list, a whole @keyframes block, a Tailwind transition-[…], or Framer's animate={{…}}.
const MOTION_SPAN = /transition(?:-property)?\s*:[^;}\n]*|@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}|\btransition-\[[^\]]*\]|\banimate=\{\{[^}]*\}\}/g;
const LAYOUT = 'width|height|max-height|max-width|min-height|min-width|top|left|right|bottom|inset|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?';
const LAYOUT_CAMEL = 'marginTop|marginBottom|marginLeft|marginRight|paddingTop|paddingBottom|maxHeight|maxWidth|minHeight';

const RULES = [
  {
    id: 'purple-gradient',
    pattern: new RegExp(
      String.raw`\b(?:from|via|to)-(?:purple|violet|indigo|fuchsia)-\d{2,3}\b` +
      String.raw`|(?:linear|radial|conic)-gradient\([^)]*(?:${PURPLE_HEX}|purple|violet|indigo)[^)]*\)` +
      String.raw`|colors=\{\[[^\]]*(?:${PURPLE_HEX})`,
      'gi'),
    suggestion: 'Use the brand color as a flat surface, or a tonal step of one hue for depth.',
  },
  {
    id: 'gradient-text',
    pattern: /\bbg-clip-text\b|(?<!-webkit-)background-clip\s*:\s*text/g,
    suggestion: 'Use solid ink or brand color; build emphasis with size, weight and space.',
  },
  {
    id: 'default-font',
    pattern: /font-family\s*:\s*['"]?(?:Inter|Poppins)\b|fontFamily\s*:\s*['"](?:Inter|Poppins)\b|\[\s*['"](?:Inter|Poppins)['"]|import\s*\{[^}]*\b(?:Inter|Poppins)\b[^}]*\}\s*from\s*['"]next\/font\/google['"]/g,
    suggestion: 'Use the brand typeface, or choose one for this job (tabular figures for data, a legible humanist sans for government). If Inter is right, say why.',
  },
  {
    id: 'glassmorphism',
    pattern: /\bbackdrop-blur(?:-[\w[\]]+)?\b|backdrop-filter\s*:\s*blur/g,
    suggestion: 'Use opaque surfaces with a tonal or border elevation step; blur is costly on mid-range Android.',
  },
  {
    id: 'blur-blob',
    // Tailwind: a rounded-full element with a big blur. CSS: a filter blur of 24px or more is a decorative glow.
    pattern: /["'`][^"'`\n]*\bblur-(?:2xl|3xl|\[\d+px\])[^"'`\n]*["'`]|filter\s*:\s*blur\(\s*(?:2[4-9]|[3-9]\d|\d{3})px/g,
    when: /\brounded-full\b|^filter/,
    suggestion: 'Remove decorative blobs; use relevant imagery or a quiet brand pattern if atmosphere is needed.',
  },
  {
    id: 'oversized-radius',
    pattern: /\brounded-(?:2xl|3xl)\b|border-radius\s*:\s*(?:[2-9]\d|1\d\d)px|borderRadius\s*:\s*[2-9]\d\b/g,
    suggestion: 'Define one radius scale in tokens (e.g. 4/8/12) and apply it by element role.',
  },
  {
    id: 'heavy-shadow',
    // CSS: a y-offset of 20px+ or a blur of 40px+ (glows included). Floating layers rarely need more than 0 8px 24px.
    pattern: /\bshadow-(?:xl|2xl)\b|box-shadow\s*:\s*-?\d+(?:px)?\s+(?:[2-9]\d|\d{3})px|box-shadow\s*:\s*-?\d+(?:px)?\s+-?\d+(?:px)?\s+(?:[4-9]\d|\d{3})px/g,
    suggestion: 'Use a border or tonal shift for resting cards; keep shadows for floating layers.',
  },
  {
    id: 'emoji-heading',
    exts: CODE,
    pattern: /<(?:h[1-6]|Heading|Title|CardTitle)\b[^<>]*>[^<]*\p{Extended_Pictographic}/gu,
    suggestion: 'Use a plain, specific heading; use an icon from the project set if recognition needs it.',
  },
  {
    id: 'filler-copy',
    exts: CODE,
    pattern: /\b(?:seamless(?:ly)?|elevate your|unlock (?:the|your) (?:power|potential|full)|supercharge|effortless(?:ly)?|cutting-edge|game-?changer|next-level|revolutioni[sz]e|empower(?:s|ing)?|lorem ipsum)\b/gi,
    suggestion: 'Say what the user can do and what happens next, in the domain\'s own words.',
  },
  {
    id: 'sparkle-icon',
    exts: CODE,
    pattern: /\b(?:Sparkles?|WandSparkles|MagicWand|AutoAwesome)\b/g,
    suggestion: 'Use an icon that names the action, or none. Label real AI features in words.',
  },
  {
    id: 'low-contrast-text',
    pattern: /(?<!dark:)\btext-(?:gray|slate|zinc|neutral|stone)-(?:200|300|400)\b|(?<!dark:)\bplaceholder-(?:gray|slate|zinc|neutral|stone)-(?:300|400)\b|(?<![-\w])color\s*:\s*['"]?#(?:9ca3af|94a3b8|a1a1aa|a3a3a3|a8a29e|d1d5db|cbd5e1|cccccc|ccc|aaaaaa|aaa|999999|999|bbbbbb|bbb)\b/gi,
    suggestion: 'Light gray on white fails 4.5:1. Use the 500/600 step or a muted token that passes.',
  },
  {
    id: 'tiny-text',
    pattern: /\btext-\[(?:\d|1[01])px\]|font-size\s*:\s*(?:\d|1[01])px|fontSize\s*:\s*(?:\d|1[01])\b/g,
    suggestion: 'Use 12px as the floor for incidental labels and 14–16px for anything read.',
  },
  {
    id: 'tiny-target',
    exts: CODE,
    pattern: /<(?:button|IconButton|Pressable|Touchable\w*)\b[^<]{0,400}?(?:\b(?:h|w|size)-(?:[3-7]|\[(?:1\d|2[0-7])px\])(?![\w-])|\b(?:height|width|minHeight)\s*:\s*(?:[12]\d|3\d)\b)/g,
    unless: /\bmin-h-(?:1[1-9]|[2-9]\d)\b|hitSlop/,
    suggestion: 'Make the hit area at least 44–48px (padding, min-h-11/12, or hitSlop); 24px is only the WCAG floor.',
  },
  {
    id: 'outline-removed',
    pattern: /(?:className|class)=\{?\s*["'`][^"'`]*\boutline-none\b[^"'`]*["'`]|outline\s*:\s*(?:none|0)\b/g,
    unless: /\bring\b|\bring-|focus-visible:outline|focus:outline-(?!none)/,
    suggestion: 'Keep a visible focus style: a focus-visible ring with 3:1 contrast.',
  },
  {
    id: 'decorative-motion',
    pattern: /\banimate-(?:bounce|ping)\b/g,
    suggestion: 'Use motion only to show cause and effect, and respect prefers-reduced-motion.',
  },
  {
    id: 'card-spam',
    exts: [...CODE, 'html'],
    minCount: 6,
    pattern: /<Card\b|["'`][^"'`\n]*\brounded-[^"'`\n]*["'`]/g,
    when: /^<Card|^(?=[\s\S]*\b(?:border|shadow)\b)(?=[\s\S]*\bp-\d)/,
    suggestion: 'Cards are for objects users act on. Group sections with headings and space; show records as list or table rows.',
  },
  {
    id: 'nested-card',
    exts: CODE,
    pattern: /<Card\b[^>]*>(?:(?!<\/Card>)[\s\S])*?<Card\b/g,
    suggestion: 'Never put cards inside cards; keep one surface level and separate parts with spacing or dividers.',
  },
  {
    id: 'side-stripe',
    pattern: /(?<![\w:-])(?:[\w-]+:)*border-(?:l|s|t)-(?:[2-8]|\[\d+px\])(?![\w-])|border-(?:left|top|inline-start)\s*:\s*(?:[2-9]|1\d)px\s+solid|border-(?:left|top|inline-start)-width\s*:\s*(?:[2-9]|1\d)px|border(?:Left|Top|Start)Width\s*:\s*(?:[2-9]|1\d)\b/g,
    suggestion: 'Drop the colored side stripe; show status with a tinted pill badge plus icon, and emphasis with type or a full soft-tint background.',
  },
  {
    id: 'transition-all',
    pattern: /\btransition-all\b|transition\s*:\s*all\b/g,
    suggestion: 'Name the properties (transition-colors, or transform/opacity); "all" animates layout too.',
  },
  {
    id: 'slow-motion',
    pattern: /\bduration-(?:[5-9]\d\d|1\d{3})\b|transition(?:-duration)?\s*:[^;}\n]*?\b(?:[5-9]\d\d|\d{4,})ms\b|transition(?:-duration)?\s*:[^;}\n]*?(?<![\d.])(?:0?\.[5-9]|[1-9](?:\.\d+)?)s\b/g,
    suggestion: 'Keep UI transitions to 100–300 ms (up to ~350 ms for sheets); exits faster than entrances.',
  },
  {
    id: 'scroll-reveal',
    exts: [...CODE, 'html'],
    pattern: /\bwhileInView\b|\bdata-aos=|\bAOS\.init\b/g,
    suggestion: 'Render content in place; keep motion for responses to user actions.',
  },
  {
    id: 'hardcoded-color',
    exts: CODE,
    skipFile: /(?:theme|tokens?|colou?rs?|palette|tailwind\.config)\.[cm]?[jt]sx?$/i,
    pattern: /\b(?:bg|text|border|from|via|to|fill|stroke|ring)-\[#[0-9a-fA-F]{3,8}\]|\b(?:color|backgroundColor|borderColor|tintColor)\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/g,
    suggestion: 'Use or add a theme token so colors stay consistent.',
  },
  {
    id: 'hard-offset-shadow',
    // A crisp shadow (no blur) pushed 4px or more: the neo-brutalist sticker look.
    pattern: /box-shadow\s*:\s*-?(?:[4-9]|\d\d)px\s+-?(?:[4-9]|\d\d)px\s+0(?:px)?\b|shadowOffset\s*:\s*\{[^}]*(?:width|height)\s*:\s*(?:[4-9]|\d\d)[^}]*\}[^}]*shadowRadius\s*:\s*0\b|\bshadow-\[-?(?:[4-9]|\d\d)px_-?(?:[4-9]|\d\d)px_0(?:px)?[_\]]/g,
    suggestion: 'Use the layering system (border plus a soft shadow), unless the brand is deliberately brutalist.',
  },
  {
    id: 'grid-background',
    pattern: /\bbg-grid(?:-[\w-]+)?\b|linear-gradient\(\s*(?:to (?:right|bottom)|90deg|0deg|180deg)\s*,[^;)]*?\b1px\s*,\s*transparent\s+1px/g,
    suggestion: 'Remove the decorative grid; keep grids for canvases, maps, and measuring tools.',
  },
  {
    id: 'glow-halo',
    // A radial gradient that fades to nothing: the soft spotlight or glow behind a hero or card.
    pattern: /radial-gradient\((?:[^()]|\([^()]*\))*\)/g,
    when: /\btransparent\b|rgba?\([^)]*[,/]\s*0(?:\.\d+)?\s*\)|#[0-9a-f]{6}00\b/i,
    suggestion: 'Guide attention with layout, contrast, and a heading instead of a glow behind the content.',
  },
  {
    id: 'stripe-pattern',
    pattern: /repeating-(?:linear|radial)-gradient\(/g,
    suggestion: 'Use a plain surface; stripes read as filler unless they mean something (a hazard, a disabled state).',
  },
  {
    id: 'italic-serif-display',
    exts: [...CODE, 'html'],
    pattern: /<(?:h[1-3]|Heading|Title)\b[^>]*\bclass(?:Name)?=["'`{][^"'`]*\b(?:font-serif\b[^"'`]*\bitalic\b|italic\b[^"'`]*\bfont-serif\b)/g,
    suggestion: 'Pick a display style for this product; the italic serif headline is a default, not a voice.',
  },
  {
    id: 'crushed-tracking',
    pattern: /\btracking-tighter\b|letter-spacing\s*:\s*-(?:0?\.0[4-9]\d*|0?\.[1-9]\d*)em\b|letter-spacing\s*:\s*-(?:[2-9]|\d\d)px\b|letterSpacing\s*:\s*-(?:[2-9]|\d\d)\b/g,
    suggestion: 'Tighten large headings by −0.01 to −0.02em at most; crushed tracking hurts reading, worst on phones.',
  },
  {
    id: 'bounce-easing',
    // A y control point outside 0–1 overshoots and springs back (x points must stay within 0–1, so any such number is a y).
    pattern: /cubic-bezier\([^)]*\)|\bease(?:In|Out|InOut)(?:Back|Elastic|Bounce)\b|\bbounce\s*:\s*0?\.[3-9]/g,
    when: /^(?!cubic)|,\s*(?:-\s*0?\.\d*[1-9]|-\s*[1-9]|1\.\d*[1-9]|[2-9])/,
    suggestion: 'Use ease-out curves that settle; overshoot and elastic easing feel toy-like in product UI.',
  },
  {
    id: 'pulsing-dot',
    pattern: /["'`][^"'`\n]*\banimate-(?:pulse|ping)\b[^"'`\n]*["'`]/g,
    when: /\brounded-full\b/,
    unless: /\b(?:h|w|size)-(?:[4-9]|\d\d)\b/,
    suggestion: 'Keep status dots still; pulse only something that is actually live, and stop with reduced motion.',
  },
  {
    id: 'marquee',
    pattern: /<marquee\b|\banimate-(?:marquee|scroll|infinite-scroll)\b|@keyframes\s+(?:marquee|ticker|scroll-x|infinite-scroll)\b/g,
    suggestion: 'Show the items still, or give the strip pause and browse controls (WCAG 2.2.2).',
  },
  {
    id: 'blinking-cursor',
    pattern: /@keyframes\s+(?:blink|caret|cursor)\w*|\banimate-(?:blink|caret|cursor)\b/g,
    suggestion: 'Drop decorative cursors; in a simulated terminal, stop blinking once the text has finished.',
  },
  {
    id: 'em-dash-copy',
    exts: [...CODE, 'html'],
    minCount: 5,
    pattern: /—/g,
    suggestion: 'Rewrite with full stops, commas, or parentheses; a dash in every sentence is a generated-copy habit.',
  },
  {
    id: 'forced-contrast',
    exts: [...CODE, 'html'],
    pattern: /\bNot (?:just |only |another )?(?:a|an)\s+[\w-]+(?:\s[\w-]+){0,3}[.,]\s+(?:It's\s+|It is\s+)?(?:[Aa]n?|[Tt]he)\s+\w/g,
    suggestion: 'State what it does directly; "Not a feature. A platform." framing says nothing.',
  },
  {
    id: 'justified-text',
    pattern: /\btext-justify\b|text-align\s*:\s*justify\b|textAlign\s*:\s*['"]justify['"]/g,
    suggestion: 'Align body text to the start; justified text leaves uneven gaps, worst at phone widths.',
  },
  {
    id: 'numbered-sections',
    exts: [...CODE, 'html'],
    minCount: 3,
    pattern: />\s*0[1-9]\s*(?:[./—–-]\s*)?</g,
    suggestion: 'Number only real sequences (steps, ranked items); "01 / 02 / 03" on ordinary sections is decoration.',
  },
  {
    id: 'placeholder-label',
    exts: CODE,
    pattern: /<(?:input|Input|TextInput|TextField)\b(?:=>|[^<>])*?\/?>/g,
    when: /\bplaceholder=/,
    unless: /aria-label|aria-labelledby|accessibilityLabel|\bid=|\blabel=|type=["'](?:hidden|search|submit|checkbox|radio)/,
    suggestion: 'Add a visible label (or label prop / accessibilityLabel); placeholders vanish while typing.',
  },
  // The current "premium dark" template: surfaces that glint, lines that fade, cards that float on hover.
  {
    id: 'sheen-edge',
    // A 1px white inner highlight along the top edge of a card, so it looks lit from above.
    pattern: /inset\s+0(?:px)?\s+1px\s+0(?:px)?\s+(?:rgba?\(\s*255[\s,]+255[\s,]+255\b[^)]*\)|#fff(?:fff)?(?:[0-9a-f]{2})?\b|white\b)|\bshadow-\[inset_0_1px_0(?:_0)?_(?:rgba?\(255|#fff|white)/gi,
    suggestion: 'Drop the inner highlight; separate surfaces with one border or a tonal step from your tokens.',
  },
  {
    id: 'gradient-surface',
    // A card filled with a vertical fade between two near-identical surfaces (or white at a few percent).
    pattern: /linear-gradient\(\s*(?:180deg|to bottom)\s*,\s*(?:var\(--[\w-]*(?:surface|card|panel|elevated|bg|background)[\w-]*\)|rgba?\(\s*255[\s,]+255[\s,]+255[\s,/]+0?\.0\d+\s*\))\s*,\s*(?:var\(--[\w-]*(?:surface|card|panel|elevated|bg|background)[\w-]*\)|transparent)\s*\)|\bbg-(?:gradient|linear)-to-b\s+from-(?:white\/(?:[1-9]|10)|(?:zinc|neutral|slate|gray|stone)-(?:8|9)\d0)\b/g,
    suggestion: 'Fill surfaces with one flat token; a gradient nobody can name is decoration.',
  },
  {
    id: 'fading-hairline',
    // A divider that fades out at both ends: transparent, a line color, transparent.
    pattern: /linear-gradient\(\s*(?:to (?:right|left|bottom|top)|-?\d+deg)\s*,\s*transparent\b(?:[^()]|\([^()]*\))*?,\s*transparent\s*\)|\bfrom-transparent\s+via-[\w/[\]#.-]+\s+to-transparent\b/g,
    suggestion: 'Use a plain 1px border, or let space and a heading separate the sections.',
  },
  {
    id: 'hover-lift',
    // Cards and buttons that rise on hover. Movement that says nothing about what a click will do.
    pattern: /:hover[^{}]*\{[^}]*translateY\(\s*-\s*\d|\bhover:-translate-y-(?:\d|px|\[)|whileHover=\{\{[^}]*\by\s*:\s*-\d/g,
    suggestion: 'Show hover with a color or border change; keep movement for responses to what the user did.',
  },
  {
    id: 'eyebrow-everywhere',
    exts: [...CODE, 'html'],
    minCount: 3,
    // A small label (often mono or spaced caps) over every heading on the page.
    pattern: /\bclass(?:Name)?=["'`][^"'`]*(?:\b(?:eyebrow|kicker|overline)\b|\buppercase\b[^"'`]*\btracking-(?:wide|wider|widest|\[0?\.\d+em\])(?![\w-])|\btracking-(?:wide|wider|widest)\b[^"'`]*\buppercase\b)[^"'`]*["'`]/g,
    suggestion: 'Let headings stand alone; keep a label only where it carries real context (a step, a category, a status).',
  },
  // Motion performance: what makes animation stutter on low-end phones. motion-perf.js measures it on a rendered page.
  {
    id: 'layout-animation',
    pattern: MOTION_SPAN,
    when: new RegExp(
      String.raw`(?:^|[\s{;,])(?:${LAYOUT}|${LAYOUT_CAMEL})\s*:` +
      String.raw`|^transition(?:-property)?\s*:(?:[^,]*,)*?\s*(?:${LAYOUT})(?=[\s,]|$)` +
      String.raw`|^transition-\[(?:[^\]]*,)?(?:${LAYOUT})(?=[,\]])`),
    suggestion: 'Animate transform and opacity: scaleX for bars, translate for slides, grid-template-rows 0fr→1fr for expanding. Size and position re-run layout every frame.',
  },
  {
    id: 'paint-animation',
    pattern: MOTION_SPAN,
    when: /^@keyframes[\s\S]*?(?:box-shadow\s*:|blur\(|backdrop-filter\s*:)|^animate=[\s\S]*?(?:boxShadow\s*:|blur\(|backdropFilter\s*:)|^transition(?:-property)?\s*:(?:[^,]*,)*?\s*(?:-webkit-)?backdrop-filter(?=[\s,]|$)|^transition-\[[^\]]*backdrop-filter/,
    suggestion: 'Fade a pseudo-element that already has the shadow or blur (animate its opacity) instead of animating the shadow or blur itself, which repaints every frame.',
  },
  {
    id: 'will-change-overuse',
    minCount: 4,
    pattern: /will-change\s*:\s*(?!auto\b)[^;}\n]+|\bwill-change-(?:transform|scroll|contents|\[[^\]]+\])/g,
    suggestion: 'Set will-change only on the few elements about to animate, ideally just before and removed after; each one holds a GPU layer that low-end phones run out of.',
  },
  {
    id: 'scroll-listener',
    exts: [...CODE, 'html'],
    pattern: /addEventListener\(\s*['"`]scroll['"`]|\bonScroll\s*=|\bwindow\.onscroll\s*=/g,
    suggestion: 'Use IntersectionObserver for "is it in view", or animation-timeline: scroll()/view() for scroll-linked motion; a scroll handler runs on the main thread every event.',
  },
  {
    id: 'blocking-touch-listener',
    exts: [...CODE, 'html'],
    pattern: /addEventListener\(\s*['"`](?:wheel|mousewheel|touchstart|touchmove)['"`][\s\S]{0,300}/g,
    unless: /passive\s*:\s*true/,
    suggestion: 'Pass { passive: true } so scrolling never waits for the handler; to stop scrolling, use CSS touch-action or overscroll-behavior instead of preventDefault.',
  },
];

const fs = require('fs');
const path = require('path');

const SCAN_EXTS = new Set([...CODE, 'css', 'scss', 'html']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.expo', 'coverage', '.prepon', 'Pods', 'out']);

function collect(p, out) {
  let st;
  try { st = fs.statSync(p); } catch { process.stderr.write(`prepon: cannot read ${p}\n`); return; }
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(p)) if (!SKIP_DIRS.has(name)) collect(path.join(p, name), out);
  } else if (SCAN_EXTS.has(path.extname(p).slice(1).toLowerCase())) {
    out.push(p);
  }
}

function scan(file) {
  const text = fs.readFileSync(file, 'utf8');
  const ext = path.extname(file).slice(1).toLowerCase();
  const lines = text.split('\n');
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (idx) => { // binary search: 1-based line number of a character index
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  const ignored = (line, id) => [lines[line - 1], lines[line - 2]].some((l) => {
    const m = l && l.match(/prepon-ignore(?!-file)(?:[ \t]+([\w,-]+))?/);
    return m && (!m[1] || m[1].split(',').includes(id));
  });
  const fileIgnore = text.match(/prepon-ignore-file(?:[ \t]+([\w,-]+))?/);

  const findings = [];
  for (const rule of RULES) {
    if (fileIgnore && (!fileIgnore[1] || fileIgnore[1].split(',').includes(rule.id))) continue;
    if (rule.exts && !rule.exts.includes(ext)) continue;
    if (rule.skipFile && rule.skipFile.test(file)) continue;
    rule.pattern.lastIndex = 0;
    const hits = [];
    for (const m of text.matchAll(rule.pattern)) {
      const hit = m[0];
      if (rule.when && !rule.when.test(hit)) continue;
      if (rule.unless && rule.unless.test(hit)) continue;
      const line = lineOf(m.index);
      if (ignored(line, rule.id)) continue;
      hits.push({ hit, line });
    }
    const out = (line, match) => findings.push({
      rule: rule.id, file: file.split(path.sep).join('/'), line, match: match.replace(/\s+/g, ' ').slice(0, 120), suggestion: rule.suggestion,
    });
    // minCount rules report once per file, at the first hit, only when the pattern repeats enough.
    if (rule.minCount) {
      if (hits.length >= rule.minCount) out(hits[0].line, `${hits.length} matches in this file, first: ${hits[0].hit}`);
    } else {
      for (const h of hits) out(h.line, h.hit);
    }
  }
  return findings;
}

function main(argv) {
  if (argv.length === 0) {
    process.stderr.write('usage: node detect-slop.js <file-or-dir> [...]\n');
    return 2;
  }
  const files = [];
  for (const p of argv) collect(p, files);
  const findings = files.flatMap(scan);
  process.stdout.write(JSON.stringify(findings, null, 2) + '\n');
  return findings.length ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { RULES, scan };

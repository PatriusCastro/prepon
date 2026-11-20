#!/usr/bin/env node
// Prepon tweak: opens the running app in a visible browser with an editing overlay, so a designer can
// resize buttons and cards, change radius, spacing, fonts, and colours live, and hand the edits back as a
// change list. It never edits source files; the skill applies the list afterwards (modes.md#tweak).
// Uses the PROJECT's own Playwright install (this script adds no dependencies).
//
// Usage (run from the project root, in the background: it waits until the designer clicks Done):
//   node tweak.js --url http://localhost:5173/settings [--storage-state auth.json] [--out dir] [--stamp s]
//
// Writes .prepon/tweaks/<stamp>.json after every edit (so closing the window loses nothing), makes sure
// `.prepon/` is in the project's .gitignore, and prints JSON: { file, status, changes, warnings }.
// status is "done" (Done clicked) or "closed" (window closed first). --out <dir> writes <dir>/tweaks/...
// instead, leaves .gitignore alone, and prints an absolute path.
'use strict';
const fs = require('fs');
const path = require('path');
const { args, loadPlaywright, ensureGitignored } = require('./snapshot.js');

// Runs inside the page (serialized by addInitScript), so it can't use anything from this file's scope.
function overlay() {
  if (window.top !== window || window.__preponTweak) return;
  // [property, label, options]. options: wide; sides (per-side or per-corner longhands, edited separately when the
  // field is split); corners (lay the sides out as a 2×2 grid); shadow (X, Y, blur, spread, colour); options (fixed chips).
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const sides = (f, labels = ['Top', 'Right', 'Bottom', 'Left']) => SIDES.map((s, i) => [f(s), labels[i]]);
  const GROUPS = [
    ['Size', [['width', 'Width'], ['height', 'Height'], ['min-height', 'Min height']]],
    ['Spacing', [
      ['padding', 'Padding', { sides: sides((s) => `padding-${s}`) }],
      ['margin', 'Margin', { sides: sides((s) => `margin-${s}`) }],
      ['gap', 'Gap', { sides: [['row-gap', 'Rows'], ['column-gap', 'Columns']] }],
    ]],
    ['Shape', [
      ['border-radius', 'Radius', { corners: true, sides: [['border-top-left-radius', 'Top left'], ['border-top-right-radius', 'Top right'], ['border-bottom-left-radius', 'Bottom left'], ['border-bottom-right-radius', 'Bottom right']] }],
      ['border-width', 'Border', { sides: sides((s) => `border-${s}-width`) }],
      ['border-style', 'Border style', { wide: true, options: ['solid', 'dashed', 'dotted', 'none'] }],
      ['box-shadow', 'Shadow', { shadow: true }],
    ]],
    ['Type', [['font-family', 'Font'], ['font-size', 'Size'], ['font-weight', 'Weight'], ['line-height', 'Line height'], ['letter-spacing', 'Letter spacing']]],
    ['Colour', [['color', 'Text'], ['background-color', 'Fill'], ['border-color', 'Border colour', { wide: true }]]],
    ['Effects', [
      ['opacity', 'Opacity'], ['transition-duration', 'Transition'], ['transform', 'Transform', { wide: true }],
      ['outline-width', 'Outline'], ['outline-offset', 'Outline offset'], ['outline-color', 'Outline colour', { wide: true }],
      ['cursor', 'Cursor', { wide: true, options: ['pointer', 'default', 'not-allowed', 'text'] }],
    ]],
  ];
  const fieldProps = ([p, , o = {}]) => [p, ...(o.sides || []).map(([s]) => s)];
  const COLOR_PROPS = ['color', 'background-color', 'border-color', 'outline-color'];
  const SCALE_PROPS = ['border-radius', 'font-size', 'font-family', 'font-weight', 'gap', 'padding', 'color', 'background-color', 'box-shadow'];
  // States: hover, pressed, and focus are forced through DevTools (like its :hov toggle); disabled sets the attribute.
  const STATES = [['default', 'Default'], ['hover', 'Hover'], ['active', 'Pressed'], ['focus-visible', 'Focus'], ['disabled', 'Disabled']];
  const STATE_LABEL = Object.fromEntries(STATES);
  const PSEUDO = { default: '', hover: ':hover', active: ':active', 'focus-visible': ':focus-visible', disabled: ':is(:disabled,[aria-disabled="true"])' };
  const stateOf = (c) => c.state || 'default';
  const INTERACTIVE = 'button,a[href],input,select,textarea,summary,[role=button],[role=link],[role=tab],[role=checkbox],[role=switch],[role=menuitem]';

  let changes = [];
  let editing = true;
  let selected = null;
  let hovered = null;
  let scope = 'element';
  let scales = null;
  let tokens = null;
  let nextId = 1;
  let state = 'default';
  const live = new Map(); // change id -> element, for this document only
  const save = () => { rebuild(); if (window.__preponTweakSave) window.__preponTweakSave(changes); };

  // ---- reading the page ----
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  function rgba(c) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }
  const hex = (c) => '#' + rgba(c).slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  const lum = ([r, g, b]) => [r, g, b].map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  // ponytail: solid backgrounds only; text over gradients or images reads as the colour beneath them.
  function backgroundOf(el) {
    const layers = [];
    for (let e = el; e && layers.length < 20; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) break;
    }
    return layers.reverse().reduce((under, [r, g, b, a]) => under.map((v, i) => v * (1 - a) + [r, g, b][i] * a), [255, 255, 255]);
  }
  function contrast(el) {
    const [r, g, b, a] = rgba(getComputedStyle(el).color);
    const bg = backgroundOf(el);
    const fg = [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  function warnings(el) {
    const out = [];
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (el.matches(INTERACTIVE)) {
      const size = `${Math.round(r.width)}×${Math.round(r.height)} px`;
      if (Math.min(r.width, r.height) < 24) out.push(`Target ${size} is under the 24 px WCAG 2.2 minimum`);
      else if (Math.min(r.width, r.height) < 44) out.push(`Target ${size} is under 44 px, small for a thumb`);
    }
    if (hasText(el) || el.matches('input,select,textarea')) {
      const px = parseFloat(cs.fontSize);
      const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
      const ratio = contrast(el);
      if (ratio < (large ? 3 : 4.5)) out.push(`Text contrast ${ratio.toFixed(2)}:1, needs ${large ? 3 : 4.5}:1`);
      if (px < 12) out.push(`Text is ${px} px, hard to read on phones`);
    }
    if (state === 'focus-visible' && !(cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) && cs.boxShadow === 'none') {
      out.push('No visible focus indicator in this state (WCAG 2.4.7)');
    }
    return out;
  }

  function component(el) {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    if (key) {
      const out = {};
      for (let f = el[key]; f; f = f.return) {
        if (!out.source && f._debugSource) out.source = `${f._debugSource.fileName}:${f._debugSource.lineNumber}`;
        const t = f.type && typeof f.type !== 'string' ? (f.type.render || f.type.type || f.type) : null;
        const name = t && (f.type.displayName || t.displayName || t.name);
        if (name) { out.name = name; break; }
      }
      return out;
    }
    const v = el.__vueParentComponent;
    return v ? { name: v.type.__name || v.type.name, source: v.type.__file } : {};
  }

  // ponytail: positional selector, up to 4 levels; good enough to re-find an element after a reload, and the
  // component, classes, and text are what the skill uses to find it in source.
  function selectorOf(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      if (e.id) { parts.unshift('#' + CSS.escape(e.id)); break; }
      const same = e.parentElement ? [...e.parentElement.children].filter((c) => c.tagName === e.tagName) : [];
      parts.unshift(e.tagName.toLowerCase() + (same.length > 1 ? `:nth-of-type(${same.indexOf(e) + 1})` : ''));
    }
    return parts.join(' > ');
  }
  const similar = (tag, cls) => (cls ? [...document.getElementsByTagName(tag)].filter((e) => e.getAttribute('class') === cls) : []);

  function pageScales() {
    const count = Object.fromEntries(SCALE_PROPS.map((p) => [p, new Map()]));
    const all = document.body.getElementsByTagName('*');
    for (let i = 0; i < all.length && i < 4000; i++) {
      if (all[i] === host) continue;
      const cs = getComputedStyle(all[i]);
      for (const p of SCALE_PROPS) {
        const v = cs.getPropertyValue(p);
        if (!v || /^(0px|normal|none|auto|rgba\(0, 0, 0, 0\))$/.test(v)) continue;
        if (/\s/.test(v) && !['font-family', 'box-shadow'].includes(p) && !COLOR_PROPS.includes(p)) continue; // per-side values like "0px 8px" aren't a scale step
        count[p].set(v, (count[p].get(v) || 0) + 1);
      }
    }
    for (const f of document.fonts) if (f.status === 'loaded') count['font-family'].set(f.family, (count['font-family'].get(f.family) || 0) + 1);
    return Object.fromEntries(SCALE_PROPS.map((p) => [p, [...count[p]].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v]) => v)]));
  }

  function rootTokens() {
    const names = new Set();
    const walk = (rules) => {
      for (const r of rules) {
        if (r.cssRules) walk(r.cssRules);
        if (r.style && /(^|,)\s*(:root|html)\b/.test(r.selectorText || '')) for (const p of r.style) if (p.startsWith('--')) names.add(p);
      }
    };
    for (const s of document.styleSheets) { try { walk(s.cssRules); } catch { /* cross-origin sheet */ } }
    for (const p of document.documentElement.style) if (p.startsWith('--')) names.add(p);
    return [...names];
  }
  // A token whose value equals the element's computed value. "Likely" only: equal values don't prove the
  // element uses that token, so the skill confirms it in source before editing the token.
  function tokenFor(prop, value) {
    tokens = tokens || rootTokens();
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    try {
      for (const t of tokens) {
        probe.style.cssText = '';
        probe.style.setProperty(prop, `var(${t})`);
        if (probe.style.getPropertyValue(prop) && getComputedStyle(probe).getPropertyValue(prop) === value) return t;
      }
    } finally { probe.remove(); }
    return null;
  }

  // ---- applying changes (preview only: one injected stylesheet, plus :root variables for tokens) ----
  // A stylesheet rather than inline styles, so a hover edit can beat a default edit: rules for "all like it" come first
  // and element rules after them at equal specificity, and a state's pseudo-class adds specificity over its default.
  let markN = 0;
  const marks = new WeakMap();
  const mark = (el) => { if (!marks.has(el)) { marks.set(el, ++markN); el.setAttribute('data-prepon-el', markN); } return marks.get(el); };
  const sheet = document.createElement('style');
  function targets(c) {
    if (c.scope === 'token') return [];
    if (c.scope === 'similar') return similar(c.element.tag, c.element.classes);
    const el = live.get(c.id);
    return el && el.isConnected ? [el] : [document.querySelector(c.element.selector)].filter(Boolean);
  }
  function rebuild() {
    const rules = { similar: [], element: [] };
    for (const c of changes) {
      if (c.scope === 'token' || (c.scope === 'element' && c.url !== location.pathname)) continue;
      const sels = c.scope === 'similar'
        ? [`${c.element.tag}[class="${c.element.classes.replace(/["\\]/g, '\\$&')}"]`]
        : targets(c).map((el) => `${c.element.tag}[data-prepon-el="${mark(el)}"]`);
      for (const s of sels) rules[c.scope].push(`${s}${PSEUDO[stateOf(c)]} { ${c.property}: ${c.to} !important; }`);
    }
    sheet.textContent = rules.similar.concat(rules.element).join('\n');
    if (!sheet.isConnected) (document.head || document.documentElement).appendChild(sheet);
  }
  function apply(c) {
    if (c.scope === 'token') document.documentElement.style.setProperty(c.token, c.to);
    else rebuild();
  }
  function revert(c) {
    if (c.scope === 'token') document.documentElement.style.removeProperty(c.token);
    // other scopes: the caller removes the change, and save() rebuilds the sheet without it
  }

  // Shadows are edited as parts of the first layer; any further layers are kept as they are.
  function parseShadow(v) {
    if (!v || v === 'none') return { layers: [], x: '0px', y: '4px', blur: '12px', spread: '0px', color: 'rgba(0, 0, 0, 0.15)', inset: false };
    const layers = v.split(/,(?![^(]*\))/).map((s) => s.trim());
    const color = (layers[0].match(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|(?:oklch|oklab|color|hsla?)\([^)]*\))/) || ['rgba(0, 0, 0, 0.15)'])[0];
    const rest = layers[0].replace(color, '');
    const [x = '0px', y = '0px', blur = '0px', spread = '0px'] = rest.replace(/\binset\b/, '').trim().split(/\s+/).filter(Boolean);
    return { layers, x, y, blur, spread, color, inset: /\binset\b/.test(rest) };
  }
  const composeShadow = (s) => [`${s.inset ? 'inset ' : ''}${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color}`, ...s.layers.slice(1)].join(', ');
  const SHADOW_PARTS = [['shadow-x', 'X', 'x'], ['shadow-y', 'Y', 'y'], ['shadow-blur', 'Blur', 'blur'], ['shadow-spread', 'Spread', 'spread']];
  const shadowKey = (p) => ({ 'shadow-color': 'color', ...Object.fromEntries(SHADOW_PARTS.map(([id, , k]) => [id, k])) })[p];
  // A colour picker gives opaque hex; keep the alpha the colour had.
  function withAlpha(hexValue, old) {
    const a = Math.round(rgba(old)[3] * 100) / 100;
    if (a >= 1) return hexValue;
    const n = parseInt(hexValue.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  function rescope(c, s) {
    revert(c);
    c.scope = s;
    c.token = null;
    c.note = null;
    if (s === 'token') {
      c.token = tokenFor(c.property, c.from);
      if (!c.token) { c.scope = 'similar'; c.note = 'no token matched this value; applied to all like it'; }
    }
    if (c.scope === 'similar' && !c.element.classes) { c.scope = 'element'; c.note = 'element has no class to match others by'; }
    c.matches = c.scope === 'similar' ? similar(c.element.tag, c.element.classes).length : c.scope === 'element' ? 1 : null;
    apply(c);
  }

  // quiet: typing, dragging a colour picker, or dragging the grip; the panel re-renders when the edit is committed
  function set(prop, value, quiet) {
    const el = selected;
    if (!el) return;
    if (shadowKey(prop)) {
      const s = parseShadow(getComputedStyle(el).boxShadow);
      s[shadowKey(prop)] = value;
      return set('box-shadow', composeShadow(s), quiet);
    }
    // A border or outline with a width but no style is invisible; make it solid, as a design tool would.
    const line = /^(border-(?:top|right|bottom|left)|border|outline)-width$/.exec(prop);
    if (line && parseFloat(value) > 0 && getComputedStyle(el).getPropertyValue(`${line[1]}-style`).split(' ').every((s) => s === 'none')) {
      set(`${line[1]}-style`, 'solid', true);
    }
    let c = changes.find((x) => x.property === prop && stateOf(x) === state && (live.get(x.id) === el
      || (!live.has(x.id) && x.url === location.pathname && x.element.selector === selectorOf(el))));
    if (c) live.set(c.id, el);
    if (!c) {
      const cs = getComputedStyle(el);
      const info = component(el);
      c = {
        id: nextId++, url: location.pathname, state, property: prop, from: cs.getPropertyValue(prop), to: value, scope: 'element', token: null,
        element: {
          selector: selectorOf(el), tag: el.tagName.toLowerCase(), classes: el.getAttribute('class') || '',
          text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60),
          component: info.name || null, source: info.source || null,
        },
      };
      live.set(c.id, el);
      changes.push(c);
      rescope(c, scope);
    } else {
      revert(c);
      c.to = value;
      apply(c);
      changes = changes.filter((x) => x !== c).concat(c); // most recent last, for Undo
    }
    if (!value.trim() || value === c.from) { revert(c); changes = changes.filter((x) => x !== c); }
    c.warnings = warnings(el);
    save();
    if (!quiet) render();
  }

  // ---- overlay UI (shadow DOM, so app styles can't reach it and it can't reach the app) ----
  // Lucide icons (ISC licence), inline so the overlay needs no network.
  const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    pointer: svg('<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>'),
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>'),
    reset: svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
    panel: svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>'),
    swap: svg('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    sides: svg('<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>'),
  };
  const host = document.createElement('prepon-tweak');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host { all: initial; }
    * { box-sizing: border-box; }
    .box { position: fixed; pointer-events: none; z-index: 2147483646; }
    .hover { outline: 1px dashed #9a3412; }
    .sel { outline: 2px solid #9a3412; }
    .tag { position: fixed; z-index: 2147483646; pointer-events: none; transform: translateY(-100%); padding: 2px 6px; border-radius: 4px 4px 0 0;
      background: #9a3412; color: #fff; font: 600 11px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; white-space: nowrap; }
    .tag span { font-weight: 400; opacity: 0.85; margin-left: 6px; }
    .grip { position: fixed; width: 14px; height: 14px; background: #9a3412; border: 2px solid #fff; border-radius: 3px; cursor: nwse-resize; z-index: 2147483647; touch-action: none; }
    .panel, .bar { font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; z-index: 2147483647; }
    .panel { position: fixed; top: 12px; right: 12px; width: 320px; max-height: calc(100vh - 88px); overflow: auto;
      background: #fff; color: #1c1b1a; border: 1px solid #8b8984; border-radius: 10px; box-shadow: 0 4px 16px rgb(28 27 26 / 0.18); }
    .panel.left { right: auto; left: 12px; }
    .panel[hidden] { display: none; }
    .bar { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; padding: 4px;
      background: #1c1b1a; border-radius: 12px; box-shadow: 0 4px 16px rgb(28 27 26 / 0.3); }
    .bar button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 40px; min-height: 40px; padding: 0 8px;
      border: 0; border-radius: 8px; background: transparent; color: #ecebe8; }
    .bar button:hover:not(:disabled) { background: #3a3835; }
    .bar button:focus-visible { outline: 2px solid #f0a27a; outline-offset: -2px; }
    .bar button[aria-pressed=true] { background: #9a3412; color: #fff; }
    .bar button[aria-pressed=true]:hover { background: #7c2a0e; }
    .bar .toggle-panel[aria-pressed=true] { background: #3a3835; } /* accent stays reserved for the Select mode */
    .bar .toggle-panel[aria-pressed=true]:hover { background: #5d5b57; }
    .bar button.danger { background: #8a2c0d; color: #fff; font-weight: 600; }
    .bar .done { background: #fafaf9; color: #1c1b1a; font-weight: 600; padding: 0 14px; margin-left: 4px; }
    .bar .done:hover:not(:disabled) { background: #e5e4e1; }
    .bar svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
    .bar .sep { width: 1px; height: 24px; background: #5d5b57; margin: 0 4px; }
    .bar .count { font: 600 11px/16px system-ui, sans-serif; min-width: 16px; padding: 0 4px; border-radius: 8px; background: #9a3412; color: #fff; }
    section { padding: 10px 12px; border-bottom: 1px solid #e5e4e1; }
    button { font: inherit; min-height: 32px; padding: 4px 10px; border: 1px solid #8b8984; border-radius: 6px; background: #fff; color: #1c1b1a; cursor: pointer; }
    button:hover:not(:disabled) { background: #f2f2f0; }
    button:disabled { opacity: 0.45; cursor: default; }
    .icon { min-width: 32px; padding: 4px 0; }
    button:focus-visible, input:focus-visible, summary:focus-visible, .scrub:focus-visible { outline: 2px solid #9a3412; outline-offset: 1px; }
    button[aria-pressed=true], .primary { background: #1c1b1a; color: #fafaf9; border-color: #1c1b1a; }
    button[aria-pressed=true]:hover, .primary:hover:not(:disabled) { background: #3a3835; }
    .danger { color: #8a2c0d; border-color: #8a2c0d; }
    .crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin: 0 0 2px; }
    .crumbs button { min-height: 24px; padding: 0 4px; border: 0; color: #5d5b57; }
    .crumbs i { color: #8b8984; font-style: normal; }
    .name { font-size: 15px; font-weight: 600; margin: 0; word-break: break-word; }
    .name span { font-weight: 400; color: #5d5b57; font-size: 13px; margin-left: 6px; }
    .meta { color: #5d5b57; font-size: 12px; word-break: break-all; margin: 2px 0 0; }
    .warn { display: flex; gap: 6px; color: #8a2c0d; background: #fdf0ea; border-radius: 6px; padding: 6px 8px; margin: 8px 0 0; }
    .seg { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 10px; border: 1px solid #8b8984; border-radius: 6px; overflow: hidden; }
    .seg button { border: 0; border-radius: 0; min-height: 30px; padding: 2px 4px; font-size: 12px; }
    .seg button + button { border-left: 1px solid #8b8984; }
    .seg button[aria-checked=true] { background: #1c1b1a; color: #fafaf9; }
    .seg-label { font-size: 12px; color: #5d5b57; margin: 10px 0 0; }
    details { border-bottom: 1px solid #e5e4e1; }
    summary { display: flex; align-items: center; gap: 6px; padding: 8px 12px; cursor: pointer; font-weight: 600; font-size: 12px; color: #5d5b57; list-style: none; }
    summary::-webkit-details-marker { display: none; }
    summary::before { content: '›'; display: inline-block; width: 10px; font-size: 14px; }
    details[open] > summary::before { transform: rotate(90deg); }
    summary b { margin-left: auto; color: #9a3412; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 12px 12px; }
    .field { min-width: 0; position: relative; }
    .field.wide { grid-column: 1 / -1; }
    .field.edited::before { content: ''; position: absolute; left: -7px; top: 22px; width: 3px; height: 22px; border-radius: 2px; background: #9a3412; }
    .scrub { display: inline-block; font-size: 12px; color: #5d5b57; margin-bottom: 2px; cursor: ew-resize; user-select: none; touch-action: none; }
    .field.edited .scrub { color: #9a3412; font-weight: 600; }
    .ctl { display: flex; gap: 4px; align-items: center; }
    input { font: inherit; min-height: 30px; width: 100%; min-width: 0; padding: 2px 6px; border: 1px solid #8b8984; border-radius: 6px; background: #fff; color: #1c1b1a; font-variant-numeric: tabular-nums; }
    input[type=color] { width: 30px; flex: none; padding: 1px; }
    .ctl button { min-height: 30px; min-width: 30px; padding: 0; flex: none; }
    .chips { display: flex; gap: 4px; margin-top: 4px; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px; }
    .chips button { min-height: 24px; padding: 0 6px; font-size: 12px; display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; flex: none; }
    .chips button[aria-pressed=true] { background: #fdf0ea; color: #8a2c0d; border-color: #9a3412; }
    .sw { width: 12px; height: 12px; border-radius: 3px; border: 1px solid #8b8984; }
    .shp { width: 14px; height: 14px; border-radius: 3px; background: #fff; border: 1px solid #e5e4e1; margin: 2px; }
    .fhead { display: flex; align-items: center; justify-content: space-between; gap: 4px; min-height: 20px; }
    .flabel { font-size: 12px; color: #5d5b57; }
    .field.edited .flabel { color: #9a3412; font-weight: 600; }
    .hint { font-size: 12px; color: #5d5b57; }
    .fhead .link { min-height: 24px; min-width: 24px; padding: 0; }
    .link svg, .ctl .link svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .sides { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .sides.two, .sides.corners { grid-template-columns: 1fr 1fr; }
    .sub { min-width: 0; }
    .sub .scrub { font-size: 12px; }
    .sub.edited .scrub { color: #9a3412; font-weight: 600; }
    .state-note { margin: 8px 0 0; padding: 6px 8px; border-radius: 6px; background: #f2f2f0; font-size: 12px; }
    .seg.five { grid-template-columns: repeat(5, 1fr); }
    ul { list-style: none; margin: 0; padding: 0 12px 10px; } li { display: flex; gap: 6px; align-items: start; padding: 4px 0; }
    li span { flex: 1; min-width: 0; word-break: break-word; } li small { display: block; color: #5d5b57; }
    li button { min-height: 28px; padding: 0 8px; font-size: 12px; }
    .empty { color: #5d5b57; margin: 0; }
    .help { margin: 8px 0 0; padding-left: 18px; color: #5d5b57; }
    .help li { display: list-item; padding: 2px 0; }
    kbd { font: 11px ui-monospace, Consolas, monospace; border: 1px solid #8b8984; border-radius: 3px; padding: 0 3px; }
  </style>
  <div class="box hover" hidden></div><div class="box sel" hidden></div><div class="tag" hidden></div><div class="grip" hidden title="Drag to resize"></div>
  <div class="panel" role="region" aria-label="Tweak properties"><div class="body"></div></div>
  <div class="bar" role="toolbar" aria-label="Prepon tweak">
    <button class="mode" aria-pressed="true" aria-label="Select elements" title="Select elements (off: use the app normally)">${ICON.pointer}</button>
    <span class="sep" aria-hidden="true"></span>
    <button class="undo-last" aria-label="Undo last edit" title="Undo last edit (Ctrl+Z)">${ICON.undo}</button>
    <button class="reset" aria-label="Reset all edits" title="Reset all edits">${ICON.reset}</button>
    <span class="sep" aria-hidden="true"></span>
    <button class="toggle-panel" aria-pressed="true" aria-label="Show panel" title="Show or hide the panel">${ICON.panel}</button>
    <button class="side" aria-label="Move panel to the other side" title="Move panel to the other side">${ICON.swap}</button>
    <button class="done">${ICON.check}<span>Done</span></button>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const [hoverBox, selBox, tag, grip, panel] = [$('.hover'), $('.sel'), $('.tag'), $('.grip'), $('.panel')];
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // Display only: 116.484px -> 116.5px, 13.3333px -> 13.3px, 0.15s stays. Colours are left alone (their alpha matters).
  const fmt = (v) => (/(rgb|hsl|lab|lch|color)\(/.test(v) ? String(v)
    : String(v).replace(/-?\d+\.\d+/g, (n) => String(Math.abs(n) >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100)));
  // What a designer recognises: a control's own label, else its tag and first class. The component goes in the meta
  // line instead, because the nearest React component is often the whole page.
  const nameOf = (el) => {
    const t = el.tagName.toLowerCase();
    const label = el.matches(INTERACTIVE) ? (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24) : '';
    return label ? `${t} “${label}”` : t + (el.classList[0] ? `.${el.classList[0]}` : '');
  };
  const changeFor = (el, prop) => changes.find((c) => c.property === prop && stateOf(c) === state && live.get(c.id) === el);
  let openGroups = new Set();
  let split = new Set(); // fields shown per side or per corner
  let confirmReset = false;

  const NOT_SCRUBBABLE = ['font-family', 'transform', 'cursor', 'border-style', ...COLOR_PROPS];
  const resetBtn = (p, label, c) => `<button data-reset="${p}" aria-label="Reset ${esc(label)} to ${esc(fmt(c.from))}" title="Reset to ${esc(fmt(c.from))}">↺</button>`;
  const textInput = (p, v, label) => `<input id="f-${p}" data-prop="${p}" value="${esc(fmt(v))}" spellcheck="false" autocomplete="off"${label ? ` aria-label="${esc(label)}"` : ''}>`;
  const scrubLabel = (p, label) => `<label class="scrub" for="f-${p}"${NOT_SCRUBBABLE.includes(p) ? '' : ` data-scrub="${p}"`} title="${p}${NOT_SCRUBBABLE.includes(p) ? '' : ' · drag left or right to adjust'}">${esc(label)}</label>`;
  function chipRow(p, label, v, values) {
    if (!values || !values.length) return '';
    const color = COLOR_PROPS.includes(p);
    const face = (s) => (p === 'box-shadow' ? `<i class="shp" style="box-shadow:${esc(s)}"></i>`
      : `${color ? `<i class="sw" style="background:${esc(s)}"></i>` : ''}${esc(p === 'font-family' ? s.split(',')[0].replace(/["']/g, '') : color ? hex(s) : fmt(s))}`);
    return `<div class="chips" aria-label="${esc(label)} values${p === 'border-style' || p === 'cursor' ? '' : ' used on this page'}">${values.map((s) => `<button data-chip="${p}" data-v="${esc(s)}" title="${esc(s)}"${p === 'box-shadow' ? ` aria-label="Shadow ${esc(s)}"` : ''} aria-pressed="${s === v}">${face(s)}</button>`).join('')}</div>`;
  }

  function field([p, label, o = {}]) {
    if (o.shadow) return shadowField(p, label);
    const cs = getComputedStyle(selected);
    const v = cs.getPropertyValue(p);
    const c = changeFor(selected, p);
    const color = COLOR_PROPS.includes(p);
    const subs = o.sides || [];
    const open = split.has(p);
    const what = o.corners ? 'corner' : subs.length === 2 ? 'direction' : 'side';
    const toggle = subs.length ? `<button class="link" data-split="${p}" aria-pressed="${open}" aria-label="${open ? `Edit ${esc(label)} as one value` : `Edit each ${what} of ${esc(label)} separately`}" title="${open ? 'One value for all' : `Each ${what} separately`}">${ICON.sides}</button>` : '';
    const edited = c || subs.some(([s]) => changeFor(selected, s));
    if (open) {
      return `<div class="field wide${edited ? ' edited' : ''}"><div class="fhead"><span class="flabel">${esc(label)}</span>${toggle}</div>
        <div class="sides${o.corners ? ' corners' : subs.length === 2 ? ' two' : ''}">${subs.map(([s, l]) => {
          const sc = changeFor(selected, s);
          return `<div class="sub${sc ? ' edited' : ''}">${scrubLabel(s, l)}<div class="ctl">${textInput(s, cs.getPropertyValue(s), `${label} ${l}`)}${sc ? resetBtn(s, `${label} ${l}`, sc) : ''}</div></div>`;
        }).join('')}</div></div>`;
    }
    const chips = chipRow(p, label, v, o.options || (scales && scales[p]));
    return `<div class="field${o.wide || chips || subs.length ? ' wide' : ''}${edited ? ' edited' : ''}">
      ${scrubLabel(p, label)}
      <div class="ctl">${color ? `<input type="color" data-color="${p}" value="${hex(v)}" aria-label="${esc(label)} colour picker">` : ''}${textInput(p, v)}${c ? resetBtn(p, label, c) : ''}${toggle}</div>
      ${chips}</div>`;
  }

  function shadowField(p, label) {
    const v = getComputedStyle(selected).getPropertyValue(p);
    const s = parseShadow(v);
    const c = changeFor(selected, p);
    return `<div class="field wide${c ? ' edited' : ''}"><div class="fhead"><span class="flabel">${esc(label)}</span>${v === 'none' ? '<span class="hint">None. Edit a value to add one</span>' : ''}${c ? resetBtn(p, label, c) : ''}</div>
      <div class="sides">${SHADOW_PARTS.map(([id, l, k]) => `<div class="sub">${scrubLabel(id, l)}<div class="ctl">${textInput(id, s[k], `Shadow ${l}`)}</div></div>`).join('')}</div>
      <div class="ctl" style="margin-top:6px"><input type="color" data-color="shadow-color" value="${hex(s.color)}" aria-label="Shadow colour picker">${textInput('shadow-color', s.color, 'Shadow colour')}</div>
      ${chipRow(p, label, v, scales && scales[p])}</div>`;
  }

  function changeList() {
    if (!changes.length) return '';
    const by = { element: 'this one', similar: 'all like it', token: 'token' };
    return `<details class="changes" data-group="Changes"${openGroups.has('Changes') ? ' open' : ''}><summary>Changes <b>${changes.length}</b></summary><ul>${changes.map((c) => `<li><span>${esc(c.element.tag)}${c.element.text ? ` “${esc(c.element.text.slice(0, 20))}”` : ''}${stateOf(c) !== 'default' ? ` · ${STATE_LABEL[c.state].toLowerCase()}` : ''} · ${esc(c.property)} ${esc(fmt(c.from))} → <b>${esc(fmt(c.to))}</b>
      <small>${c.scope === 'token' ? `token ${esc(c.token)}` : c.scope === 'similar' ? `${by.similar} (${c.matches})` : by.element}${c.url !== location.pathname ? ` · ${esc(c.url)}` : ''}${c.note ? ` · ${esc(c.note)}` : ''}</small></span>
      <button data-undo="${c.id}" aria-label="Undo ${esc(c.property)} change">Undo</button></li>`).join('')}</ul></details>`;
  }

  function render() {
    const body = $('.body');
    $('.done').innerHTML = `${ICON.check}<span>Done</span>${changes.length ? `<span class="count" aria-label="${changes.length} edits">${changes.length}</span>` : ''}`;
    $('.undo-last').disabled = !changes.length;
    const reset = $('.reset');
    reset.disabled = !changes.length;
    reset.innerHTML = confirmReset ? 'Reset all?' : ICON.reset;
    reset.setAttribute('aria-label', confirmReset ? 'Confirm: reset all edits' : 'Reset all edits');
    reset.classList.toggle('danger', confirmReset);
    if (!selected) {
      body.innerHTML = `<section>${editing
        ? `<p class="empty">Click any element on the page to edit it.</p><ul class="help">
            <li>Drag a field's label sideways to change its value. Arrow keys work too; hold <kbd>Shift</kbd> for steps of 10</li>
            <li>Drag the corner square to resize</li>
            <li>Turn off the pointer in the toolbar to use the app normally</li><li><kbd>Esc</kbd> deselects, <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes</li></ul>`
        : '<p class="empty">Selecting is off, so the app works normally. Turn on the pointer in the toolbar to pick elements.</p>'}</section>${changeList()}`;
      return;
    }
    const st = panel.scrollTop;
    const info = component(selected);
    const r = selected.getBoundingClientRect();
    const warns = warnings(selected);
    const count = similar(selected.tagName.toLowerCase(), selected.getAttribute('class')).length;
    const focusedProp = root.activeElement && root.activeElement.dataset.prop;
    const crumbs = [];
    for (let e = selected.parentElement, i = 1; e && e !== document.body && e !== document.documentElement && crumbs.length < 3; e = e.parentElement, i++) crumbs.unshift([i, nameOf(e)]);
    const seg = [['element', 'This one', false], ['similar', `All like it${count > 1 ? ` · ${count}` : ''}`, count < 2], ['token', 'Token', false]];
    body.innerHTML = `<section>
        ${crumbs.length ? `<p class="crumbs" aria-label="Parents">${crumbs.map(([i, n]) => `<button data-up="${i}" title="Select ${esc(n)}">${esc(n)}</button><i aria-hidden="true">›</i>`).join('')}</p>` : ''}
        <p class="name">${esc(nameOf(selected))}<span>${Math.round(r.width)} × ${Math.round(r.height)}</span></p>
        ${info.name || info.source ? `<p class="meta">${[info.name && `in ${esc(info.name)}`, info.source && esc(info.source)].filter(Boolean).join(' · ')}</p>` : ''}
        ${warns.map((w) => `<p class="warn" role="status"><span aria-hidden="true">⚠</span>${esc(w)}</p>`).join('')}
        <p class="seg-label" id="scope-label">Edits apply to</p>
        <div class="seg" role="radiogroup" aria-labelledby="scope-label">${seg.map(([v, l, off]) => `<button role="radio" data-scope="${v}" aria-checked="${scope === v}"${off ? ' disabled title="No other elements share its classes"' : ''}>${l}</button>`).join('')}</div>
        <p class="seg-label" id="state-label">State</p>
        <div class="seg five" role="radiogroup" aria-labelledby="state-label">${STATES.map(([v, l]) => `<button role="radio" data-state="${v}" aria-checked="${state === v}"${v === 'disabled' && !selected.matches(INTERACTIVE) ? ' disabled title="Only controls can be disabled"' : ''}>${l}</button>`).join('')}</div>
        ${state !== 'default' ? `<p class="state-note">Showing <b>${STATE_LABEL[state]}</b>. Edits apply only in this state.</p>` : ''}
      </section>
      ${GROUPS.map(([g, props]) => {
        const edited = props.filter((f) => fieldProps(f).some((p) => changeFor(selected, p))).length;
        return `<details data-group="${g}"${openGroups.has(g) ? ' open' : ''}><summary>${g}${edited ? `<b>${edited} edited</b>` : ''}</summary><div class="grid">${props.map(field).join('')}</div></details>`;
      }).join('')}
      ${changeList()}`;
    panel.scrollTop = st;
    if (focusedProp) { const i = root.querySelector(`input[data-prop="${focusedProp}"]`); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }

  // Hover, pressed, and focus are forced by the script through DevTools on the element marked data-prepon-force.
  let forcedEl = null;
  let undoDisabled = null;
  function setState(s, quiet) {
    if (forcedEl) forcedEl.removeAttribute('data-prepon-force');
    forcedEl = null;
    if (undoDisabled) undoDisabled();
    undoDisabled = null;
    state = selected ? s : 'default';
    const el = selected;
    if (el && ['hover', 'active', 'focus-visible'].includes(state)) { el.setAttribute('data-prepon-force', ''); forcedEl = el; }
    if (el && state === 'disabled') {
      if ('disabled' in el) { const was = el.disabled; el.disabled = true; undoDisabled = () => { el.disabled = was; }; }
      else { const was = el.getAttribute('aria-disabled'); el.setAttribute('aria-disabled', 'true'); undoDisabled = () => (was === null ? el.removeAttribute('aria-disabled') : el.setAttribute('aria-disabled', was)); }
    }
    if (state !== 'default') { openGroups.add('Colour'); openGroups.add('Effects'); }
    const forced = window.__preponTweakForce ? window.__preponTweakForce(forcedEl ? [state] : []) : Promise.resolve();
    return forced.then(() => { if (!quiet) render(); });
  }
  function deselect() {
    setState('default', true);
    selected = null;
    render();
  }

  function select(el) {
    if (el !== selected) {
      setState('default', true);
      panel.scrollTop = 0;
      // Open what this element is likely to need, plus anything already edited on it.
      const text = hasText(el) || el.matches(INTERACTIVE);
      const box = el.children.length > 0 || !text;
      openGroups = new Set(['Size', 'Shape', ...(text ? ['Type', 'Colour'] : []), ...(box ? ['Spacing'] : []), ...(openGroups.has('Changes') ? ['Changes'] : [])]);
      for (const [g, props] of GROUPS) if (props.some((f) => fieldProps(f).some((p) => changes.some((c) => c.property === p && live.get(c.id) === el)))) openGroups.add(g);
      // Split a field when its sides already differ, or one side was edited.
      const cs = getComputedStyle(el);
      split = new Set(GROUPS.flatMap(([, props]) => props).filter(([p, , o = {}]) => o.sides
        && (/\s/.test(cs.getPropertyValue(p)) || o.sides.some(([s]) => changes.some((c) => c.property === s && live.get(c.id) === el)))).map(([p]) => p));
      const mine = changes.find((c) => live.get(c.id) === el);
      if (mine) scope = mine.scope;
    }
    selected = el;
    scales = scales || pageScales();
    render();
  }

  // Numbers: arrow keys and label scrubbing share one stepper.
  const NUM = /^(-?[\d.]+)(px|rem|em|%|s|ms|deg)?$/;
  const stepOf = (prop, unit) => (prop === 'font-weight' ? 100 : prop === 'opacity' || unit === 's' ? 0.05 : unit === 'ms' ? 10 : unit === 'rem' || unit === 'em' ? 0.125 : 1);
  function numeric(prop) {
    if (shadowKey(prop)) { const v = fmt(parseShadow(getComputedStyle(selected).boxShadow)[shadowKey(prop)]); return NUM.test(v) ? v : null; }
    const v = fmt(getComputedStyle(selected).getPropertyValue(prop)).trim();
    if (NUM.test(v)) return v;
    if (prop === 'gap' || prop === 'letter-spacing') return '0px';
    if (prop === 'line-height') return `${Math.round(parseFloat(getComputedStyle(selected).fontSize) * 1.2)}px`;
    return null;
  }
  const bump = (v, prop, n) => { const m = NUM.exec(v); const s = stepOf(prop, m[2]); return `${+(parseFloat(m[1]) + n * s).toFixed(3)}${m[2] || ''}`; };

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.prop) set(t.dataset.prop, t.value, true);
    if (t.dataset.color) {
      const p = t.dataset.color;
      const old = shadowKey(p) ? parseShadow(getComputedStyle(selected).boxShadow).color : getComputedStyle(selected).getPropertyValue(p);
      const v = withAlpha(t.value, old);
      set(p, v, true);
      const i = root.getElementById(`f-${p}`);
      if (i) i.value = v;
    }
  });
  root.addEventListener('change', (e) => { if (e.target.dataset.prop || e.target.dataset.color) render(); });
  root.addEventListener('toggle', (e) => {
    const g = e.target.dataset && e.target.dataset.group;
    if (g) e.target.open ? openGroups.add(g) : openGroups.delete(g);
  }, true);
  root.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t.dataset.prop || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !NUM.test(t.value.trim())) return;
    e.preventDefault();
    t.value = bump(t.value.trim(), t.dataset.prop, (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1));
    set(t.dataset.prop, t.value);
  });

  let scrub = null;
  root.addEventListener('pointerdown', (e) => {
    const l = e.target.closest && e.target.closest('[data-scrub]');
    if (!l || !selected) return;
    const start = numeric(l.dataset.scrub);
    if (!start) return;
    e.preventDefault();
    l.setPointerCapture(e.pointerId);
    scrub = { prop: l.dataset.scrub, x: e.clientX, start, input: root.getElementById(`f-${l.dataset.scrub}`), moved: false };
  });
  root.addEventListener('pointermove', (e) => {
    if (!scrub) return;
    const n = Math.round((e.clientX - scrub.x) / (scrub.prop === 'font-weight' ? 12 : 3)) * (e.shiftKey ? 10 : 1);
    if (!n && !scrub.moved) return;
    scrub.moved = true;
    const v = bump(scrub.start, scrub.prop, n);
    if (scrub.input) scrub.input.value = v;
    set(scrub.prop, v, true);
  });
  root.addEventListener('pointerup', () => {
    if (!scrub) return;
    const { moved, input } = scrub;
    scrub = null;
    if (moved) render(); else if (input) input.focus(); // a plain click on the label focuses the field
  });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (!b.classList.contains('reset')) confirmReset = false;
    if (b.dataset.chip) set(b.dataset.chip, b.dataset.v);
    else if (b.dataset.reset) { const c = changeFor(selected, b.dataset.reset); if (c) { revert(c); changes = changes.filter((x) => x !== c); save(); } render(); }
    else if (b.dataset.undo) { const c = changes.find((x) => x.id === +b.dataset.undo); revert(c); changes = changes.filter((x) => x !== c); save(); render(); }
    else if (b.dataset.up) { let el = selected; for (let i = 0; i < +b.dataset.up; i++) el = el.parentElement; select(el); }
    else if (b.dataset.scope) {
      scope = b.dataset.scope;
      for (const c of changes) if (live.get(c.id) === selected) rescope(c, scope);
      save();
      render();
    }
    else if (b.dataset.state) setState(b.dataset.state);
    else if (b.dataset.split) {
      const p = b.dataset.split;
      split.has(p) ? split.delete(p) : split.add(p);
      render();
      const first = root.querySelector(split.has(p) ? `[data-split="${p}"]` : `#f-${p}`);
      if (first) first.focus();
    }
    else if (b.classList.contains('mode')) { editing = !editing; b.setAttribute('aria-pressed', editing); hovered = null; if (!editing) deselect(); else render(); }
    else if (b.classList.contains('side')) panel.classList.toggle('left');
    else if (b.classList.contains('toggle-panel')) { panel.hidden = !panel.hidden; b.setAttribute('aria-pressed', !panel.hidden); }
    else if (b.classList.contains('undo-last')) undoLast();
    else if (b.classList.contains('reset')) {
      if (!confirmReset) { confirmReset = true; render(); return; }
      confirmReset = false;
      changes.forEach(revert); changes = []; save(); render();
    }
    else if (b.classList.contains('done')) {
      setState('default', true);
      editing = false; selected = null; panel.hidden = false;
      $('.body').innerHTML = '<section><p class="empty">Sent to Claude. This window will close.</p></section>';
      if (window.__preponTweakDone) window.__preponTweakDone();
    }
  });

  // Picking elements: capture phase on window, so the app never sees these events while Select is on.
  const inOverlay = (e) => e.composedPath().includes(host);
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick']) {
    window.addEventListener(type, (e) => {
      if (!editing || inOverlay(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (type === 'click') select(e.target.closest(INTERACTIVE) || e.target);
    }, true);
  }
  window.addEventListener('mousemove', (e) => { hovered = editing && !inOverlay(e) ? e.target : null; }, true);
  function undoLast() {
    const c = changes[changes.length - 1];
    if (!c) return;
    revert(c);
    changes = changes.slice(0, -1);
    save();
    render();
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected) deselect();
    // Ctrl/Cmd+Z undoes the last edit, unless the focus is in a field, where it undoes typing as usual.
    const t = e.composedPath()[0];
    if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey && changes.length && !(t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) && !(t && t.isContentEditable)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      undoLast();
    }
  }, true);

  // Resize grip: dragging sets width and height; the skill turns that into padding or min-height in source.
  let drag = null;
  grip.addEventListener('pointerdown', (e) => {
    const r = selected.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, w: r.width, h: r.height };
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointermove', (e) => {
    if (!drag) return;
    set('width', `${Math.max(1, Math.round(drag.w + e.clientX - drag.x))}px`, true);
    set('height', `${Math.max(1, Math.round(drag.h + e.clientY - drag.y))}px`, true);
  });
  grip.addEventListener('pointerup', () => { drag = null; openGroups.add('Size'); render(); });

  const place = (box, el) => {
    if (!el || !el.isConnected) { box.hidden = true; return null; }
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    box.hidden = false;
    return r;
  };
  let tagText = '';
  (function frame() {
    place(hoverBox, hovered !== selected ? hovered : null);
    const r = place(selBox, selected);
    grip.hidden = tag.hidden = !r;
    if (r) {
      grip.style.left = `${r.right - 7}px`; grip.style.top = `${r.bottom - 7}px`;
      const t = `${esc(nameOf(selected))}${state !== 'default' ? ` · ${STATE_LABEL[state]}` : ''}<span>${Math.round(r.width)} × ${Math.round(r.height)}</span>`;
      if (t !== tagText) { tag.innerHTML = tagText = t; }
      tag.style.left = `${Math.max(0, r.left - 1)}px`; tag.style.top = `${Math.max(r.top, 20)}px`;
    }
    requestAnimationFrame(frame);
  })();

  async function start() {
    document.documentElement.appendChild(host);
    changes = (window.__preponTweakLoad && (await window.__preponTweakLoad())) || [];
    nextId = changes.reduce((n, c) => Math.max(n, c.id + 1), 1);
    // ponytail: re-applies once on load and once after 1.5 s for late-rendering SPAs; a MutationObserver if that misses
    const reapply = () => changes.filter((c) => c.scope === 'token' || c.url === location.pathname).forEach(apply);
    reapply();
    setTimeout(reapply, 1500);
    render();
  }
  window.__preponTweak = { select, set, state: setState, scope: (s) => { scope = s; }, changes: () => changes };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}

async function run({ url, out, stamp, storageState, headless = false, onPage } = {}) {
  const pw = loadPlaywright();
  if (!pw) return { code: 3, result: { error: 'playwright-not-installed', hint: 'Ask the user before installing: npm i -D playwright && npx playwright install chromium' } };
  const root = process.cwd();
  const dir = path.join(out ? path.resolve(out) : path.join(root, '.prepon'), 'tweaks');
  fs.mkdirSync(dir, { recursive: true });
  if (!out) ensureGitignored(root);
  const file = path.join(dir, `${stamp || new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')}.json`);
  const show = (out ? file : path.relative(root, file)).split(path.sep).join('/');
  const session = { url, startedAt: new Date().toISOString(), status: 'open', changes: [] };
  const write = () => fs.writeFileSync(file, JSON.stringify(session, null, 2) + '\n');

  let browser;
  try {
    browser = await pw.chromium.launch({ headless });
  } catch (e) {
    return { code: 3, result: { error: 'playwright-browser-missing', detail: String(e.message || e).split('\n')[0], hint: 'Run in the foreground and wait for it to finish: npx playwright install chromium' } };
  }
  let finish;
  const finished = new Promise((ok) => { finish = ok; });
  try {
    const context = await browser.newContext({ viewport: headless ? { width: 1280, height: 800 } : null, ...(storageState ? { storageState } : {}) });
    await context.exposeBinding('__preponTweakSave', (_, changes) => { session.changes = changes; write(); });
    await context.exposeBinding('__preponTweakLoad', () => session.changes);
    await context.exposeBinding('__preponTweakDone', () => { session.status = 'done'; finish(); });
    // Forces :hover, :active, or :focus-visible on the element the overlay marked, the way DevTools' :hov toggle does,
    // so the page shows its real state styles. Chromium only, which is the browser this script launches.
    const forcedNode = new WeakMap(); // page -> { cdp, nodeId }
    await context.exposeBinding('__preponTweakForce', async ({ page }, states) => {
      let f = forcedNode.get(page);
      if (!f) {
        f = { cdp: await context.newCDPSession(page), nodeId: null };
        await f.cdp.send('DOM.enable');
        await f.cdp.send('CSS.enable');
        forcedNode.set(page, f);
      }
      if (f.nodeId) await f.cdp.send('CSS.forcePseudoState', { nodeId: f.nodeId, forcedPseudoClasses: [] }).catch(() => {});
      f.nodeId = null;
      if (!states.length) return;
      await f.cdp.send('DOM.getDocument', { depth: 0 });
      const { result } = await f.cdp.send('Runtime.evaluate', { expression: 'document.querySelector("[data-prepon-force]")' });
      if (!result.objectId) return;
      const { nodeId } = await f.cdp.send('DOM.requestNode', { objectId: result.objectId });
      await f.cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states });
      f.nodeId = nodeId;
    });
    await context.addInitScript(overlay);
    const page = await context.newPage();
    page.on('close', () => finish());
    browser.on('disconnected', () => finish());
    write();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      return { code: 1, result: { error: 'page-load-failed', detail: String(e.message || e).split('\n')[0], hint: 'Is the dev server running at that URL?' } };
    }
    if (onPage) onPage(page).catch((e) => { session.error = String(e.message || e); finish(); });
    await finished;
  } finally {
    if (session.status === 'open') session.status = 'closed';
    session.finishedAt = new Date().toISOString();
    write();
    await browser.close().catch(() => {});
  }
  const warnings = session.changes.reduce((n, c) => n + (c.warnings || []).length, 0);
  return { code: session.error ? 1 : 0, result: { file: show, status: session.status, changes: session.changes.length, warnings, ...(session.error ? { error: session.error } : {}) } };
}

if (require.main === module) {
  const a = args(process.argv.slice(2));
  if (typeof a.url !== 'string') {
    process.stderr.write('usage: node tweak.js --url <http://localhost:5173/route> [--storage-state file] [--out dir] [--stamp s]\n');
    process.exitCode = 2;
  } else {
    run({ url: a.url, out: typeof a.out === 'string' ? a.out : null, stamp: typeof a.stamp === 'string' ? a.stamp : null, storageState: typeof a['storage-state'] === 'string' ? a['storage-state'] : null, headless: !!a.headless })
      .then(({ code, result }) => { process.stdout.write(JSON.stringify(result, null, 2) + '\n'); process.exitCode = code; },
        (e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exitCode = 1; });
  }
}
module.exports = { run };

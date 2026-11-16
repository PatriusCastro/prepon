import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Monitor, Smartphone, ChevronsLeftRight } from 'lucide-react';
import detectSrc from '../../plugins/prepon/skills/prepon/scripts/detect-slop.js?raw';
import { Link } from './router';
import { SESSION, SLOP_SAMPLE, FITTED_SAMPLE } from './content/showcase';

/* ---------- Reduced motion ---------- */

const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
const useReducedMotion = () => useSyncExternalStore((cb) => {
  reduceQ.addEventListener('change', cb);
  return () => reduceQ.removeEventListener('change', cb);
}, () => reduceQ.matches);

/** True once the element has been at least `threshold` visible. Never goes back to false. */
function useSeenOnce<T extends Element>(threshold: number) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/* ---------- Simulated Claude Code session ---------- */

const GLYPH = { user: '>', tool: '●', out: '⎿', text: '', done: '●' } as const;
const SPOKEN = { user: 'You', tool: 'Tool call', out: 'Output', text: 'Claude', done: 'Claude' } as const;

export function Session() {
  const reduced = useReducedMotion();
  const [ref, seen] = useSeenOnce<HTMLDivElement>(0.4);
  // Reduced motion starts on the final frame with Replay. Otherwise the session plays once when it's in view.
  const [shown, setShown] = useState(() => (reduceQ.matches ? SESSION.length : 0));
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const controls = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  // Follow new lines like a terminal, unless the reader has scrolled up to read something.
  const stick = useRef(true);
  const done = shown >= SESSION.length;

  useEffect(() => {
    if (seen && !reduced && !started.current) { started.current = true; setPlaying(true); }
  }, [seen, reduced]);

  useEffect(() => {
    if (!playing) return;
    if (done) { setPlaying(false); return; }
    const line = SESSION[shown];
    if (line.kind === 'user' && !reduced && typed < line.text.length) {
      const t = setTimeout(() => setTyped(typed + 1), 24);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setShown(shown + 1); setTyped(0); }, line.kind === 'user' ? 450 : line.pause ?? 550);
    return () => clearTimeout(t);
  }, [playing, shown, typed, reduced, done]);

  useEffect(() => {
    const el = body.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [shown, typed]);

  const replay = () => { stick.current = true; started.current = true; setShown(0); setTyped(0); setPlaying(true); };
  const progress = Math.min(1, (shown + (typed ? typed / SESSION[Math.min(shown, SESSION.length - 1)].text.length : 0)) / SESSION.length);

  return (
    <div className="session" ref={ref}>
      {/* Kept for screen readers (it names the transcript region); sighted users get the "Simulation" badge in the bar. */}
      <p className="visually-hidden" id="session-label">
        Simulated session: the skill’s real commands, with the project and output shortened.
      </p>
      <div className="term">
        <div className="term-bar" aria-hidden="true">
          <span className="term-lights"><i /><i /><i /></span>
          <span className="term-title">claude · dispatch-console</span>
          <span className="term-badge">Simulation</span>
        </div>
        {/* Focusable so keyboard users can scroll it; the lines are read as they appear in the DOM. */}
        <div className="term-body" ref={body} tabIndex={0} role="region" aria-labelledby="session-label"
          onScroll={(e) => { /* prepon-ignore scroll-listener: only notes whether the reader scrolled up; no layout writes */ const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}>
          {SESSION.map((l, i) => {
            const visible = i < shown;
            const typing = i === shown && l.kind === 'user' && typed > 0;
            return (
              <div key={i} className={`term-line is-${l.kind}${visible ? ' is-in' : typing ? ' is-typing' : ' is-pending'}`}>
                <span className="term-glyph" aria-hidden="true">{GLYPH[l.kind]}</span>
                <span className="visually-hidden">{SPOKEN[l.kind]}: </span>
                <span className="term-text">{typing ? l.text.slice(0, typed) : l.text}{typing && <span className="term-caret" />}</span>
              </div>
            );
          })}
        </div>
        <div className="term-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </div>
      <div className="session-controls" ref={controls}>
        {done ? (
          <button type="button" className="btn" onClick={replay}><RotateCcw aria-hidden size={16} />Replay</button>
        ) : playing ? (
          <button type="button" className="btn" onClick={() => setPlaying(false)}><Pause aria-hidden size={16} />Pause</button>
        ) : (
          <button type="button" className="btn" onClick={() => { started.current = true; setPlaying(true); }}><Play aria-hidden size={16} />{shown || typed ? 'Resume' : 'Play'}</button>
        )}
        {!done && <button type="button" className="btn btn-quiet" onClick={() => {
          setPlaying(false); setShown(SESSION.length); setTyped(0); stick.current = true;
          // This button disappears once the run is shown, so keep focus on the toggle (now "Replay").
          requestAnimationFrame(() => controls.current?.querySelector('button')?.focus());
        }}><SkipForward aria-hidden size={16} />Show the whole run</button>}
      </div>
    </div>
  );
}

/* ---------- Slop detector toy: runs the detector's own rules in the browser ---------- */

type Rule = { id: string; pattern: RegExp; exts?: string[]; when?: RegExp; unless?: RegExp; minCount?: number; suggestion: string };
type Finding = { rule: string; line: number; match: string; suggestion: string };

// Evaluate only the RULES block of scripts/detect-slop.js, so the toy and the real detector can't drift apart.
// The file is Node CommonJS, so it can't be imported whole into the browser.
const RULES: Rule[] = (() => {
  try {
    const start = detectSrc.indexOf('const PURPLE_HEX');
    const end = detectSrc.indexOf('const fs = require');
    return new Function(detectSrc.slice(start, end) + '\nreturn RULES;')();
  } catch { return []; }
})();
export const RULE_COUNT = RULES.length;

function detect(text: string): Finding[] {
  const lineOf = (i: number) => text.slice(0, i).split('\n').length;
  const out: Finding[] = [];
  for (const r of RULES) {
    if (r.exts && !r.exts.includes('tsx')) continue;
    const hits = [...text.matchAll(r.pattern)].filter((m) => (!r.when || r.when.test(m[0])) && !(r.unless && r.unless.test(m[0])));
    const add = (m: RegExpExecArray | RegExpMatchArray, match: string) =>
      out.push({ rule: r.id, line: lineOf(m.index ?? 0), match: match.replace(/\s+/g, ' ').slice(0, 80), suggestion: r.suggestion });
    if (r.minCount) { if (hits.length >= r.minCount) add(hits[0], `${hits.length} matches, first: ${hits[0][0]}`); }
    else hits.forEach((m) => add(m, m[0]));
  }
  return out.sort((a, b) => a.line - b.line);
}

const FIRST = 5;
type Group = { rule: string; suggestion: string; lines: number[]; matches: string[]; count: number };

// `head` renders at the top of the editor column, so on wide screens the section heading stays pinned with the editor.
export function SlopToy({ head }: { head?: ReactNode }) {
  const [code, setCode] = useState(SLOP_SAMPLE);
  const [all, setAll] = useState(false);
  const [active, setActive] = useState(0);
  // Lines of the finding under the mouse, lit in the editor so pointing at a finding shows the code it's about.
  const [peek, setPeek] = useState<number[]>([]);
  const list = useRef<HTMLOListElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLPreElement>(null);
  // Cached: hovering a finding re-renders this component, and re-running every rule on each hover cost frames on slow phones.
  const findings = useMemo(() => detect(code), [code]);
  // Rules the loaded sample already trips. Any other rule is new from the visitor's edits, so it goes first
  // and is tagged; otherwise a tell typed low in the sample lands past the fold of the collapsed list.
  const [base, setBase] = useState(() => new Set(detect(SLOP_SAMPLE).map((f) => f.rule)));
  // One entry per rule: new rules first, then the rest in order of their first line (findings are sorted by line).
  const groups = [...findings.reduce((m, f) => {
    const g = m.get(f.rule) ?? { rule: f.rule, suggestion: f.suggestion, lines: [], matches: [], count: 0 };
    g.count++;
    if (!g.lines.includes(f.line)) g.lines.push(f.line);
    if (!g.matches.includes(f.match)) g.matches.push(f.match);
    return m.set(f.rule, g);
  }, new Map<string, Group>()).values()].sort((a, b) => Number(base.has(a.rule)) - Number(base.has(b.rule)));
  const flagged = new Set(findings.map((f) => f.line));
  const lines = code.split('\n');
  const visible = all ? groups : groups.slice(0, FIRST);
  const preset = code === SLOP_SAMPLE ? 'slop' : code === FITTED_SAMPLE ? 'fitted' : null;
  const load = (c: string) => { setCode(c); setActive(0); setBase(new Set(detect(c).map((f) => f.rule))); };

  // Select the line in the editor so the finding and the code it's about are seen together.
  const goTo = (line: number) => {
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    area.current?.focus({ preventScroll: true });
    area.current?.setSelectionRange(start, start + lines[line - 1].length);
    mirror.current?.children[line - 1]?.scrollIntoView({ block: 'nearest', behavior: reduceQ.matches ? 'auto' : 'smooth' });
    setActive(line);
  };

  if (!RULES.length) return <p className="toy-error">The detector rules didn’t load, so the live scan is off. The rules are listed on the <Link to="/docs/slop-patterns">slop patterns</Link> page.</p>;

  return (
    <div className="toy">
      {/* On wide screens the editor column is sticky, so it stays in view beside a long findings list. */}
      <div className="toy-input">
        {head}
        <div className="toy-window">
          <div className="toy-bar">
            <label htmlFor="toy-code" className="toy-label"><span className="visually-hidden">Code to scan, </span>Hero.tsx</label>
            <div className="segmented" role="group" aria-label="Sample code">
              <button type="button" aria-pressed={preset === 'slop'} onClick={() => load(SLOP_SAMPLE)}>Generic</button>
              <button type="button" aria-pressed={preset === 'fitted'} onClick={() => load(FITTED_SAMPLE)}>Fitted</button>
            </div>
          </div>
        {/* A mirror behind a transparent textarea draws line numbers and flagged-line highlights. Both share one
            grid cell and the same type and padding, so they wrap identically; the editor scrolls as one. */}
        <div className="toy-editor">
          <pre className="toy-mirror" ref={mirror} aria-hidden="true">
            {lines.map((l, n) => (
              <div key={n} className={[flagged.has(n + 1) && 'is-flagged', active === n + 1 && 'is-active', peek.includes(n + 1) && 'is-peek'].filter(Boolean).join(' ') || undefined}>{l || ' '}</div>
            ))}
          </pre>
          <textarea id="toy-code" className="toy-code" ref={area} value={code} onChange={(e) => { setCode(e.target.value); setActive(0); }}
            spellCheck={false} autoCapitalize="off" autoCorrect="off" />
        </div>
        </div>
        <p className="toy-hint">Edit the code or paste your own JSX or CSS. Findings update as you type.</p>
      </div>
      <div className="toy-output">
        <p className="toy-count" role="status">
          <strong>{findings.length}</strong> {findings.length === 1 ? 'tell' : 'tells'} from {groups.length} of the detector’s {RULES.length} rules
        </p>
        <span className="toy-meter" aria-hidden="true"><i style={{ '--v': groups.length / RULES.length } as CSSProperties} /></span>
        {findings.length ? (
          <>
            <ol className="toy-findings" ref={list} tabIndex={-1} aria-label="Findings">
              {visible.map((g) => (
                <li key={g.rule} onPointerEnter={() => setPeek(g.lines)} onPointerLeave={() => setPeek([])}>
                  <p className="toy-head">
                    <code>{g.rule}</code>{g.count > 1 && <span className="toy-times">×{g.count}</span>}
                    {!base.has(g.rule) && <span className="toy-new">new</span>}
                    {g.lines.map((l) => (
                      <button key={l} type="button" className="toy-line" aria-pressed={active === l} onClick={() => goTo(l)}>
                        <span className="visually-hidden">Select </span>line {l}<span className="visually-hidden"> in the code</span>
                      </button>
                    ))}
                  </p>
                  <p className="toy-match">{g.matches.map((m) => <code key={m}>{m}</code>)}</p>
                  <p className="toy-fix"><span aria-hidden="true">→ </span>{g.suggestion}</p>
                </li>
              ))}
            </ol>
            {groups.length > FIRST && (
              <button type="button" className="btn btn-quiet toy-more" aria-expanded={all}
                onClick={() => { setAll(!all); if (all) list.current?.focus(); }}>
                {all ? 'Show fewer' : `Show all ${groups.length} rules`}
              </button>
            )}
          </>
        ) : (
          <p className="toy-clean">No mechanical tells. The judgment tells still need a reviewer’s eye; <Link to="/docs/slop-patterns">slop patterns</Link> lists them.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Before/after comparison over real captures ---------- */

const SIZES = { 1440: { w: 1440, h: 900, label: 'Desktop', Icon: Monitor }, 360: { w: 360, h: 740, label: 'Phone', Icon: Smartphone } } as const;

export function Compare({ id, name }: { id: string; name: string }) {
  const [size, setSize] = useState<360 | 1440>(() => (matchMedia('(min-width: 48rem)').matches ? 1440 : 360));
  const [pos, setPos] = useState(50);
  const view = useRef<HTMLDivElement>(null);
  const s = SIZES[size];
  const src = (phase: string) => `${import.meta.env.BASE_URL}gallery/${id}-${phase}@${size}.jpg`;

  // A mouse moves the divider just by hovering; touch and pen still drag, so scrolling past never moves it.
  const fromPointer = (e: PointerEvent) => {
    const r = view.current!.getBoundingClientRect();
    setPos(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))));
  };

  return (
    <figure className="compare">
      {/* A window frame: the Before/After legend sits in its bar, so nothing covers the capture itself. */}
      <div className={`compare-frame is-${size}`}>
        <div className="compare-bar" aria-hidden="true">
          <span className="compare-tag is-before">Before</span>
          <span className="compare-name">{name} · {size} px</span>
          <span className="compare-tag is-after">After</span>
        </div>
        <div ref={view} className="compare-view" style={{ '--pos': `${pos}%` } as CSSProperties}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
          onPointerMove={(e) => { if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e); }}>
          <img src={src('before')} width={s.w} height={s.h} loading="lazy" draggable={false} alt={`Before: ${name}, first screen at ${size} px.`} />
          {/* The clip box slides right by --pos while the image inside slides left by the same amount: the image stays
              put and only the visible part changes, all with transforms, so the divider moves on the GPU. */}
          <span className="compare-clip">
            <img src={src('after')} width={s.w} height={s.h} loading="lazy" draggable={false} alt={`After: ${name}, first screen at ${size} px.`} className="compare-after" />
          </span>
          <span className="compare-handle" aria-hidden="true"><ChevronsLeftRight size={18} /></span>
        </div>
      </div>
      <figcaption className="compare-controls">
        <label className="compare-range">
          <span className="visually-hidden">Divider position: before on the left, after on the right</span>
          <span className="compare-end" aria-hidden="true">Before</span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)}
            aria-valuetext={`${pos}% before, ${100 - pos}% after`} />
          <span className="compare-end" aria-hidden="true">After</span>
        </label>
        <div className="segmented" role="group" aria-label="Screen width">
          {([1440, 360] as const).map((k) => {
            const { label, Icon } = SIZES[k];
            return <button key={k} type="button" aria-pressed={size === k} onClick={() => setSize(k)}><Icon aria-hidden size={16} />{label}</button>;
          })}
        </div>
      </figcaption>
    </figure>
  );
}

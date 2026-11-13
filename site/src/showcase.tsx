import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from 'react';
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
      <p className="session-label" id="session-label">
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
          onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; }}>
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

export function SlopToy() {
  const [code, setCode] = useState(SLOP_SAMPLE);
  const [all, setAll] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const findings = detect(code);
  const visible = all ? findings : findings.slice(0, FIRST);
  const preset = code === SLOP_SAMPLE ? 'slop' : code === FITTED_SAMPLE ? 'fitted' : null;

  if (!RULES.length) return <p className="toy-error">The detector rules didn’t load, so the live scan is off. The rules are listed on the <Link to="/docs/slop-patterns">slop patterns</Link> page.</p>;

  return (
    <div className="toy">
      <div className="toy-input">
        <div className="segmented" role="group" aria-label="Sample code">
          <button type="button" aria-pressed={preset === 'slop'} onClick={() => setCode(SLOP_SAMPLE)}>Generic hero</button>
          <button type="button" aria-pressed={preset === 'fitted'} onClick={() => setCode(FITTED_SAMPLE)}>Fitted version</button>
        </div>
        <label htmlFor="toy-code" className="toy-label">Code to scan <span>(edit it, or paste your own JSX or CSS)</span></label>
        <textarea id="toy-code" className="toy-code" value={code} onChange={(e) => setCode(e.target.value)}
          spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" rows={Math.min(18, code.split('\n').length + 1)} />
      </div>
      <div className="toy-output">
        <p className="toy-count" role="status">
          <strong>{findings.length}</strong>{findings.length === 1 ? 'tell' : 'tells'} found by the detector’s {RULES.length} rules
        </p>
        {findings.length ? (
          <>
            <ol className="toy-findings" ref={list} tabIndex={-1} aria-label="Findings">
              {visible.map((f) => (
                <li key={`${f.rule}:${f.line}:${f.match}`}>
                  <p className="toy-head"><code>{f.rule}</code> <span className="toy-line">line {f.line}</span></p>
                  <p>{f.suggestion}</p>
                </li>
              ))}
            </ol>
            {findings.length > FIRST && (
              <button type="button" className="btn btn-quiet toy-more" aria-expanded={all}
                onClick={() => { setAll(!all); if (all) list.current?.focus(); }}>
                {all ? 'Show fewer' : `Show all ${findings.length}`}
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

  const fromPointer = (e: PointerEvent) => {
    const r = view.current!.getBoundingClientRect();
    setPos(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))));
  };

  return (
    <figure className="compare">
      <div ref={view} className={`compare-view is-${size}`} style={{ '--pos': `${pos}%` } as CSSProperties}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e); }}>
        <img src={src('before')} width={s.w} height={s.h} loading="lazy" draggable={false} alt={`Before: ${name}, first screen at ${size} px.`} />
        <img src={src('after')} width={s.w} height={s.h} loading="lazy" draggable={false} alt={`After: ${name}, first screen at ${size} px.`} className="compare-after" />
        <span className="compare-handle" aria-hidden="true"><ChevronsLeftRight size={18} /></span>
        <span className="compare-tag is-before" aria-hidden="true">Before</span>
        <span className="compare-tag is-after" aria-hidden="true">After</span>
      </div>
      <figcaption className="compare-controls">
        <label className="compare-range">
          <span>Divider: before on the left, after on the right</span>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)}
            aria-valuetext={`${pos}% before, ${100 - pos}% after`} />
        </label>
        <div className="segmented" role="group" aria-label="Screen width">
          {([1440, 360] as const).map((k) => {
            const { label, Icon } = SIZES[k];
            return <button key={k} type="button" aria-pressed={size === k} onClick={() => setSize(k)}><Icon aria-hidden size={16} />{label}, {k} px</button>;
          })}
        </div>
      </figcaption>
    </figure>
  );
}

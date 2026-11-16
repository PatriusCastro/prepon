import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '../router';
import { CodeBlock, useReveal } from '../ui';
import { Session, SlopToy, Compare, RULE_COUNT } from '../showcase';

const INSTALL = 'claude plugin marketplace add PatriusCastro/prepon\nclaude plugin install prepon@prepon';

const i = (n: number) => ({ '--i': n }) as CSSProperties;

// Hero lens (canvas round 2, direction E): real detector rules flow along curves into the π lens and come out as the
// fix Prepon applies. Each pair shares a delay, so a fix leaves exactly as its rule arrives. CSS only, on
// compositor-only properties so it stays smooth on slow phones; the button pauses it (WCAG 2.2.2). [rule, fix, path 1-3]
const FLOW: [string, string, number][] = [
  ['purple-gradient', 'brand colour', 1], ['emoji-heading', 'plain task title', 2], ['tiny-target', '44 px targets', 3],
  ['card-spam', 'rows for records', 1], ['low-contrast-text', '6.5:1 text', 2], ['placeholder-label', 'visible labels', 3],
];

// Mouse play, decorative (the stage is aria-hidden): the π looks toward the pointer anywhere in the hero, and resting
// on a chip stops the flow so it can be read, lighting that rule and the fix it becomes.
const look = (e: PointerEvent<HTMLElement>) => {
  const ring = e.currentTarget.querySelector('.lens-ring');
  if (e.pointerType !== 'mouse' || !ring) return;
  const r = ring.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 400) / d;
  e.currentTarget.style.setProperty('--lx', (dx * k).toFixed(3));
  e.currentTarget.style.setProperty('--ly', (dy * k).toFixed(3));
};
const unlook = (e: PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty('--lx', '0'); e.currentTarget.style.setProperty('--ly', '0'); };

function Lens() {
  const [paused, setPaused] = useState(false);
  const [lit, setLit] = useState<number | null>(null);
  // Off screen, the loop pauses (styles.css .is-off): an endless animation nobody sees still costs frames on a slow phone.
  const [off, setOff] = useState(false);
  const fig = useRef<HTMLElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOff(!e.isIntersecting));
    if (fig.current) io.observe(fig.current);
    return () => io.disconnect();
  }, []);
  const chip = (text: string, kind: string, path: number, n: number) => (
    <span key={kind + n} className={`lens-chip ${kind} p${path}${n > 2 ? ' is-extra' : ''}${lit === n ? ' is-lit' : ''}`} style={{ animationDelay: `${-n}s` }}
      onPointerEnter={() => setLit(n)} onPointerLeave={() => setLit(null)}>{text}</span>
  );
  return (
    <>
      <figure ref={fig} className={`lens rise${paused ? ' is-paused' : ''}${off ? ' is-off' : ''}`} style={i(1)}>
        <figcaption className="visually-hidden">Simulation: detector rules such as purple-gradient, emoji-heading and tiny-target flow into Prepon and come out as fixes: brand colour, a plain task title, 44 px targets.</figcaption>
        <div className={lit === null ? 'lens-stage' : 'lens-stage has-lit'} aria-hidden="true">
          {FLOW.map(([rule, , p], n) => chip(rule, 'is-in', p, n))}
          {FLOW.map(([, fix, p], n) => chip(fix, 'is-out', p, n))}
          <div className="lens-ring"><i /><i /><span>π</span></div>
        </div>
      </figure>
      <div className="hero-actions rise" style={i(2)}>
        <a className="btn btn-primary" href="#install">Install the skill</a>
        <a className="btn" href="#detector">Try the detector</a>
        <button type="button" className="btn btn-quiet lens-pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>
          {paused ? 'Play motion' : 'Pause motion'}
        </button>
      </div>
    </>
  );
}

export function Home() {
  useReveal('.section > .wrap > :not(.toy), .toy > *');
  return (
    <>
      <section className="hero" aria-labelledby="intro-h" onPointerMove={look} onPointerLeave={unlook}>
        <div className="wrap hero-center">
          <div className="hero-copy rise" style={i(0)}>
            <p className="eyebrow"><span lang="grc">πρέπον</span> · what is fitting</p>
            <h1 id="intro-h" tabIndex={-1}>Generic in. Fitting out.</h1>
            <p className="lede">A Claude Code skill that reads your codebase, catches the generic AI look with {RULE_COUNT} rules, and replaces each tell with the choice your users need.</p>
          </div>
          <Lens />
        </div>
      </section>

      <section className="section is-band" id="detector" aria-labelledby="detector-h">
        <div className="wrap">
          <SlopToy head={
            <div className="section-head">
              <h2 id="detector-h">Generated UI has tells</h2>
              <p>Purple gradients, glass cards, emoji headings, 11 px grey text. This hero is typical of what an AI writes; Prepon’s {RULE_COUNT} rules name every tell in it. Edit it and the list updates.</p>
            </div>
          } />
        </div>
      </section>

      <section className="section" aria-labelledby="session-h">
        <div className="wrap split">
          <div className="section-head">
            <h2 id="session-h">So Prepon reads your project first</h2>
            <p>Your tokens, your components, who uses the screen. Then it builds, runs those same rules on its own output, and fixes what they catch before you see it.</p>
          </div>
          <Session />
        </div>
      </section>

      <section className="section" aria-labelledby="compare-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="compare-h">The result fits its product</h2>
            <p>One build run on the fleet dispatch demo: the vehicles that need attention now lead, not four equal KPI cards. Move the divider to compare.</p>
          </div>
          <Compare id="fleet" name="Fleet dispatch console" />
          <p className="more-link"><Link to="/gallery">All three before/after pairs <ArrowRight aria-hidden size={16} /></Link></p>
        </div>
      </section>

      <section className="section is-band" id="install" aria-labelledby="install-h">
        <div className="wrap split">
          <div className="section-head">
            <h2 id="install-h">Use it on your next screen</h2>
            <p>Needs a recent Claude Code (tested on 2.1.322) and Node.js 18 or later for the bundled scripts. While the repository is private, your git credentials need read access to it.</p>
            <p>Then run <code>/prepon:prepon</code> with a request. It picks one of six modes from what you ask: {(['build', 'audit', 'fix', 'cite', 'refs', 'canvas'] as const).map((m, n) => <span key={m}>{n ? (n === 5 ? ', or ' : ', ') : ''}<Link to={`/docs/${m}`}><code>{m}</code></Link></span>)}. Audit, cite, and refs never edit code.</p>
          </div>
          <div className="install">
            <CodeBlock label="Install in Claude Code" code={INSTALL} primary />
            <CodeBlock label="Try it for one session, without installing" code="claude --plugin-dir /path/to/prepon/plugins/prepon" />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="name-h">
        <div className="wrap entry">
          <div className="entry-head">
            <h2 id="name-h"><span lang="grc">πρέπον</span><span className="visually-hidden">, the name</span></h2>
            <p className="entry-gloss"><i>prépon</i> · Greek · what is fitting</p>
          </div>
          <ol className="entry-senses">
            <li><span className="entry-domain">Rhetoric.</span> In classical rhetoric, <i>to prepon</i> is fitting the speech to the speaker, the subject, and the audience. Aristotle treats it in the <i>Rhetoric</i>; Cicero carried it into Latin as <i>decorum</i>.</li>
            <li><span className="entry-domain">This skill.</span> Prepon asks the same of interfaces: not “is this good design?” but “is this fitting for this project and these users?” So it gathers context first, then stays <strong>conventional in behavior</strong>, so users already know how things work, and <strong>distinctive in identity</strong>, so the product looks like itself.</li>
          </ol>
        </div>
      </section>
    </>
  );
}

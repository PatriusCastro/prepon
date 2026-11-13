import { useEffect, useState, type CSSProperties } from 'react';
import { Eye, PencilLine, ArrowRight, Pause, Play } from 'lucide-react';
import { Link } from '../router';
import { CodeBlock } from '../ui';
import { Session, SlopToy, Compare } from '../showcase';

const INSTALL = 'claude plugin marketplace add PatriusCastro/prepon\nclaude plugin install prepon@prepon';

const MODES = [
  { name: 'build', edits: 'Edits code', does: 'Creates or changes UI, mobile-first, then runs a slop scan and an accessibility checklist, captures before and after, and ends with a rationale table.',
    example: '/prepon:prepon build a vehicle detail drawer for the dispatch console' },
  { name: 'audit', edits: 'Read-only', does: 'Reviews existing UI, scores five areas out of 10 each, and writes docs/ui-audit-YYYY-MM-DD.md.',
    example: '/prepon:prepon audit src/pages/PermitApplication.tsx' },
  { name: 'fix', edits: 'Edits code', does: 'Applies the latest audit’s findings in severity order, with before/after screenshots.',
    example: '/prepon:prepon fix A1-A3' },
  { name: 'cite', edits: 'Read-only', does: 'Explains an existing design decision by decision, with the principle behind each and an honest status, as a Markdown table.',
    example: '/prepon:prepon cite the transfer review screen' },
  { name: 'refs', edits: 'Read-only', does: 'Finds 3 to 5 real, well-regarded examples of a pattern, with links and what to adapt.',
    example: '/prepon:prepon refs multi-step identity verification' },
  { name: 'canvas', edits: 'Edits code after you pick', does: 'Publishes three visual directions as artboards, reviews each, then builds the one you pick.',
    example: '/prepon:prepon canvas mobile banking settings screen' },
];

const i = (n: number) => ({ '--i': n }) as CSSProperties;

// Hero backdrop chips: real detector rules (struck through, since Prepon removes them) and the six modes.
// [label, is a slop rule, x %, y %, loop seconds]. Six, in the bands above and below the text, so the hero stays calm.
const DRIFT: [string, boolean, number, number, number][] = [
  ['card-spam', true, 10, 5, 14], ['build', false, 48, 4, 17], ['audit', false, 86, 6, 19],
  ['glow-halo', true, 10, 93, 15], ['fix', false, 40, 95, 13], ['blur-blob', true, 66, 93, 16],
];

function HeroBackdrop() {
  const [paused, setPaused] = useState(false);
  return (
    <>
      <div className={paused ? 'hero-bg is-paused' : 'hero-bg'} aria-hidden="true">
        {DRIFT.map(([label, slop, x, y, d], n) => (
          <span key={label} className={slop ? 'drift is-slop' : 'drift'}
            style={{ '--x': `${x}%`, '--y': `${y}%`, '--d': `${d}s`, '--n': n } as CSSProperties}>{label}</span>
        ))}
      </div>
      {/* WCAG 2.2.2: the backdrop loops for more than 5 s, so it gets a pause. */}
      <button type="button" className="btn btn-quiet hero-pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>
        {paused ? <Play aria-hidden size={16} /> : <Pause aria-hidden size={16} />}Pause background
      </button>
    </>
  );
}

// Scroll reveal: each block below the hero rises in once, the first time it enters the viewport, then stays.
// CSS only hides it while .reveal is on and .is-in isn't, and never under reduced motion.
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.section .wrap > *')];
    // Revealing a block also reveals every block before it, so jumping down the page (End key, a link) leaves no gaps.
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      els.slice(0, els.indexOf(e.target as HTMLElement) + 1).forEach((el) => { el.classList.add('is-in'); io.unobserve(el); });
    }), { rootMargin: '0px 0px -10% 0px' });
    els.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
    return () => io.disconnect();
  }, []);
}

export function Home() {
  useReveal();
  return (
    <>
      <section className="hero" aria-labelledby="intro-h">
        <HeroBackdrop />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="hero-copy rise" style={i(0)}>
              <p className="hero-gloss"><span lang="grc">πρέπον</span> · Greek rhetoric: what is fitting</p>
              <h1 id="intro-h" tabIndex={-1}>Interface design that fits the project it’s in</h1>
              <p className="lede">A Claude Code skill for portals, banking apps, dashboards, and form-heavy workflows. It reads your codebase first, explains every decision, and flags the generic AI look.</p>
            </div>
            <div className="hero-install rise" style={i(1)}>
              <CodeBlock label="Install" code={INSTALL} primary />
              <p className="small">Then run <code>/prepon:prepon</code> with a request.</p>
            </div>
          </div>
          <div className="rise" style={i(2)}><Session /></div>
        </div>
      </section>

      <section className="section" aria-labelledby="modes-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="modes-h">Six modes</h2>
            <p>Pass the mode as the first word, or describe the task and Prepon infers it. Three of the six never touch your code.</p>
          </div>
          <ul className="modes">
            {MODES.map((m) => (
              <li key={m.name}>
                <p className="mode-name">
                  <Link to={`/docs/${m.name}`}>{m.name}</Link>
                  <span className="mode-tag">{m.edits === 'Read-only' ? <Eye aria-hidden size={14} /> : <PencilLine aria-hidden size={14} />}{m.edits}</span>
                </p>
                <p>{m.does}</p>
                <p className="mode-example"><span className="visually-hidden">Example: </span><code>{m.example}</code></p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="detector-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="detector-h">Try the slop detector</h2>
            <p>The same rules <code>detect-slop.js</code> runs after every build, running in your browser. Switch samples or edit the code.</p>
          </div>
          <SlopToy />
        </div>
      </section>

      <section className="section" aria-labelledby="compare-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="compare-h">Before and after a run</h2>
            <p>The fleet dispatch demo before and after a build run, cropped to the first screen. Drag across the image or use the slider.</p>
          </div>
          <Compare id="fleet" name="Fleet dispatch console" />
          <p className="more-link"><Link to="/gallery">All three before/after pairs <ArrowRight aria-hidden size={16} /></Link></p>
        </div>
      </section>

      <section className="section" aria-labelledby="install-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="install-h">Requirements and a trial run</h2>
            <p>A recent Claude Code (tested on 2.1.322) and Node.js 18 or later for the bundled scripts. While the repository is private, your git credentials need read access to it.</p>
          </div>
          <div className="install">
            <CodeBlock label="Try it for one session without installing" code="claude --plugin-dir /path/to/prepon/plugins/prepon" />
            <p className="small">Prepon picks the mode from your request. <Link to="/docs/choosing-a-mode">How modes are chosen</Link></p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="name-h">
        <div className="wrap"><div className="prose">
          <h2 id="name-h">Why “prepon”</h2>
          <p>In classical rhetoric, <i>to prepon</i> is fitting the speech to the speaker, the subject, and the audience. Aristotle treats it in the <i>Rhetoric</i>; Cicero carried it into Latin as <i>decorum</i>.</p>
          <p>Prepon asks the same of interfaces: not “is this good design?” but “is this fitting for this project and these users?” So it gathers context first, then stays <strong>conventional in behavior</strong>, so users already know how things work, and <strong>distinctive in identity</strong>, so the product looks like itself.</p>
        </div></div>
      </section>
    </>
  );
}

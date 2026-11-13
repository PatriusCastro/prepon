import type { CSSProperties } from 'react';
import { Eye, PencilLine, ArrowRight } from 'lucide-react';
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

export function Home() {
  return (
    <>
      <section className="hero" aria-labelledby="intro-h">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="hero-copy rise" style={i(0)}>
              <p className="hero-gloss"><span lang="grc">πρέπον</span> · Greek rhetoric: what is fitting</p>
              <h1 id="intro-h" tabIndex={-1}>Interface design that fits the project it’s in</h1>
              <p className="lede">A Claude Code skill for government portals, banking apps, operations dashboards, and form-heavy workflows. It reads your codebase before it designs anything, names the principle behind each decision, and flags the generic look AI-generated interfaces share.</p>
            </div>
            <div className="hero-install rise" style={i(1)}>
              <CodeBlock label="Install" code={INSTALL} primary />
              <p className="small">Then type <code>/prepon:prepon</code> and a request, or just ask for UI work. <a href="#install-h">Requirements and a one-session trial</a></p>
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

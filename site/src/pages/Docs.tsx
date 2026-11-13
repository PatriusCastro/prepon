import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Eye, PencilLine } from 'lucide-react';
import { Link, href } from '../router';
import { DOCS, type Doc } from '../routes';
import { modeDocs } from '../content/modes';
import { referenceDocs } from '../content/reference';

const BODIES: Record<string, ReactNode> = { ...modeDocs, ...referenceDocs };
const GROUPS = ['Modes', 'Reference'] as const;
// Whether a mode can change your code is what people choose a mode by, so the overview says so.
const READ_ONLY = new Set(['audit', 'cite', 'refs']);
const REPO = 'https://github.com/PatriusCastro/prepon/blob/main/';

/** The docs sidebar: a filter box over the page list. "/" focuses the filter from anywhere on a docs page. */
function DocsNav({ id }: { id: string }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || t.closest('input, textarea, select, [contenteditable]') || !input.current?.offsetParent) return;
      e.preventDefault(); input.current.focus();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  const match = (d: Doc) => !q || `${d.title} ${d.nav} ${d.summary}`.toLowerCase().includes(q.trim().toLowerCase());
  const shown = DOCS.filter(match);
  return (
    <>
      <div className="docs-filter">
        <label htmlFor={id} className="visually-hidden">Filter docs pages</label>
        <input id={id} ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter pages" autoComplete="off" />
        <kbd aria-hidden="true">/</kbd>
      </div>
      {!q && <ul className="docs-nav-top"><li><Link to="/docs">Overview</Link></li></ul>}
      {GROUPS.map((g) => {
        const items = shown.filter((d) => d.group === g);
        return items.length ? (
          <div key={g} className="docs-nav-group">
            <p>{g}</p>
            <ul aria-label={g}>
              {items.map((d) => (
                <li key={d.slug}><Link to={`/docs/${d.slug}`}>{g === 'Modes' ? <code>{d.nav}</code> : d.nav}</Link></li>
              ))}
            </ul>
          </div>
        ) : null;
      })}
      {!shown.length && <p className="docs-empty" role="status">No pages match “{q}”.</p>}
    </>
  );
}

/** "On this page": the article's h2s, read from the DOM after render, so the content files need no changes. */
function OnThisPage({ slug }: { slug: string }) {
  const [items, setItems] = useState<[string, string][]>([]);
  const [current, setCurrent] = useState('');
  useEffect(() => {
    const hs = [...document.querySelectorAll<HTMLHeadingElement>('.doc h2')];
    hs.forEach((h) => { if (!h.id) h.id = h.textContent!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
    setItems(hs.map((h) => [h.id, h.textContent!]));
    // The section you're reading is the last heading that has passed the top third of the screen.
    const io = new IntersectionObserver(() => {
      const passed = hs.filter((h) => h.getBoundingClientRect().top < innerHeight / 3);
      setCurrent(passed.length ? passed[passed.length - 1].id : '');
    }, { rootMargin: '0px 0px -66% 0px', threshold: [0, 1] });
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [slug]);
  if (items.length < 3) return null;
  return (
    <nav className="docs-onpage" aria-label="On this page">
      <p>On this page</p>
      <ul>{items.map(([id, t]) => <li key={id}><a href={`#${id}`} aria-current={id === current ? 'location' : undefined}>{t}</a></li>)}</ul>
    </nav>
  );
}

function Layout({ slug, crumbs, children }: { slug: string; crumbs: string[]; children: ReactNode }) {
  return (
    <div className="wrap docs">
      <nav className="docs-side" aria-label="Docs pages"><DocsNav id="filter-side" /></nav>
      <div className="docs-main">
        <details className="docs-toc">
          <summary>Docs menu</summary>
          <nav aria-label="Docs pages"><DocsNav id="filter-menu" /></nav>
        </details>
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/docs">Docs</Link></li>
            {crumbs.map((c, n) => <li key={c} aria-current={n === crumbs.length - 1 ? 'page' : undefined}>{c}</li>)}
          </ol>
        </nav>
        {children}
      </div>
      <OnThisPage slug={slug} />
    </div>
  );
}

export function DocsIndex() {
  return (
    <Layout slug="overview" crumbs={['Overview']}>
      <article className="doc" key="overview">
        <header className="page-head">
          <h1 tabIndex={-1}>Overview</h1>
          <p className="lede">Prepon is a Claude Code skill for UI work. Each mode has its own page; the reference pages cover what the modes read before they act. In the skill these are files Claude loads on demand; here they are rewritten for people.</p>
        </header>
        <section className="start" aria-labelledby="start-h">
          <h2 id="start-h">Start here</h2>
          <ol>
            <li><a href={`${href('/')}#install`}>Install the plugin</a><span>Two commands in Claude Code.</span></li>
            <li><Link to="/docs/build">Build one screen</Link><span>Ask for a screen you need; read the rationale it ends with.</span></li>
            <li><Link to="/docs/audit">Audit one you already have</Link><span>A scored report, and no code changes.</span></li>
          </ol>
        </section>
        {GROUPS.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`}>{g}</h2>
            <dl className="doc-list">
              {DOCS.filter((d) => d.group === g).map((d) => (
                <div key={d.slug}>
                  <dt>
                    <Link to={`/docs/${d.slug}`}>{d.title}</Link>
                    {g === 'Modes' && (READ_ONLY.has(d.slug)
                      ? <span className="mode-tag is-safe"><Eye aria-hidden size={14} />Read-only</span>
                      : <span className="mode-tag"><PencilLine aria-hidden size={14} />Edits code</span>)}
                  </dt>
                  <dd>{d.summary}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </article>
    </Layout>
  );
}

export function DocPage({ doc }: { doc: Doc }) {
  const i = DOCS.indexOf(doc);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  return (
    <Layout slug={doc.slug} crumbs={[doc.group, doc.title]}>
      <article className="doc" key={doc.slug}>
        <header className="page-head">
          <h1 tabIndex={-1}>{doc.title}</h1>
          <p className="lede">{doc.summary}</p>
        </header>
        {BODIES[doc.slug]}
        <footer className="doc-foot">
          <a href={REPO + doc.source}><PencilLine aria-hidden size={14} />Edit this page on GitHub</a>
          <span>Written from <code>{doc.source}</code></span>
        </footer>
        <nav className="pager" aria-label="Previous and next page">
          {prev ? <Link to={`/docs/${prev.slug}`} rel="prev"><span><ArrowLeft aria-hidden size={14} />Previous</span>{prev.title}</Link> : <span />}
          {next ? <Link to={`/docs/${next.slug}`} rel="next"><span>Next<ArrowRight aria-hidden size={14} /></span>{next.title}</Link> : <span />}
        </nav>
      </article>
    </Layout>
  );
}

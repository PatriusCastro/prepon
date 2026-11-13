import type { ReactNode } from 'react';
import { Link } from '../router';
import { DOCS, type Doc } from '../routes';
import { modeDocs } from '../content/modes';
import { referenceDocs } from '../content/reference';

const BODIES: Record<string, ReactNode> = { ...modeDocs, ...referenceDocs };
const GROUPS = ['Modes', 'Reference'] as const;

function DocsNav() {
  return GROUPS.map((g) => (
    <div key={g} className="docs-nav-group">
      <p>{g}</p>
      <ul aria-label={g}>
        {DOCS.filter((d) => d.group === g).map((d) => (
          <li key={d.slug}><Link to={`/docs/${d.slug}`}>{g === 'Modes' ? <code>{d.nav}</code> : d.nav}</Link></li>
        ))}
      </ul>
    </div>
  ));
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="wrap docs">
      <nav className="docs-side" aria-label="Docs pages"><DocsNav /></nav>
      <div className="docs-main">
        <details className="docs-toc">
          <summary>All docs pages</summary>
          <nav aria-label="Docs pages"><DocsNav /></nav>
        </details>
        {children}
      </div>
    </div>
  );
}

export function DocsIndex() {
  return (
    <Layout>
      <article className="doc">
        <h1 tabIndex={-1}>Docs</h1>
        <p className="lede">Each mode has its own page. The reference pages cover the material the modes read before they act. In the skill these are files Claude loads on demand; here they are rewritten for people.</p>
        {GROUPS.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`}>{g}</h2>
            <dl className="doc-list">
              {DOCS.filter((d) => d.group === g).map((d) => (
                <div key={d.slug}>
                  <dt><Link to={`/docs/${d.slug}`}>{d.title}</Link></dt>
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
    <Layout>
      <article className="doc">
        <p className="eyebrow">{doc.group}</p>
        <h1 tabIndex={-1}>{doc.title}</h1>
        <p className="lede">{doc.summary}</p>
        {BODIES[doc.slug]}
        <p className="source">Written from <code>{doc.source}</code>.</p>
        <nav className="pager" aria-label="Previous and next page">
          {prev ? <Link to={`/docs/${prev.slug}`} rel="prev"><span>Previous</span> {prev.title}</Link> : <span />}
          {next ? <Link to={`/docs/${next.slug}`} rel="next"><span>Next</span> {next.title}</Link> : <span />}
        </nav>
      </article>
    </Layout>
  );
}

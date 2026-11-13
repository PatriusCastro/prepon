import { StrictMode, useEffect, useRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, usePath } from './router';
import { DOCS } from './routes';
import { Home } from './pages/Home';
import { DocsIndex, DocPage } from './pages/Docs';
import { DemoIndex, Gallery, NotFound } from './pages/Placeholders';
import { FleetLogin, FleetDashboard } from './demos/fleet/Fleet';
import { Permit, permitTitle } from './demos/permit/Permit';
import { Expenses } from './demos/expenses/Expenses';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import './styles.css';

function page(path: string): [string, ReactNode] {
  if (path === '/') return ['Prepon: fitting UI design for Claude Code', <Home />];
  if (path === '/docs') return ['Docs · Prepon', <DocsIndex />];
  const doc = path.startsWith('/docs/') && DOCS.find((d) => `/docs/${d.slug}` === path);
  if (doc) return [`${doc.title} · Prepon docs`, <DocPage doc={doc} />];
  if (path === '/demo') return ['Demo screens · Prepon', <DemoIndex />];
  if (path === '/demo/fleet') return ['Sign in · Larkmoor Freight dispatch (Prepon demo)', <FleetLogin />];
  if (path === '/demo/fleet/dashboard') return ['Northgate depot · Larkmoor Freight dispatch (Prepon demo)', <FleetDashboard />];
  if (path === '/demo/expenses') return ['Expense approvals · Ashby & Lowe (Prepon demo)', <Expenses />];
  if (path === '/demo/permit' || path.startsWith('/demo/permit/')) return [permitTitle(path), <Permit path={path} />];
  if (path === '/gallery') return ['Before/after gallery · Prepon', <Gallery />];
  return ['Page not found · Prepon', <NotFound />];
}

function App() {
  const path = usePath();
  const [title, content] = page(path);
  const main = useRef<HTMLDivElement>(null);
  const prev = useRef(path);

  useEffect(() => {
    document.title = title;
    // Compare paths rather than a "first run" flag: StrictMode runs effects twice on mount,
    // which made the first load focus the h1 as if it were a navigation.
    if (prev.current === path) return;
    prev.current = path;
    // On client-side navigation, move focus to the new page's heading so screen readers announce it.
    scrollTo(0, 0);
    main.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [path, title]);

  const section = '/' + (path.split('/')[1] ?? '');
  const nav = [['/docs', 'Docs'], ['/demo', 'Demo screens'], ['/gallery', 'Gallery']];

  // The demos are their own made-up products, so they render without the site's header and footer.
  if (/^\/demo\/(fleet|permit|expenses)(\/|$)/.test(path)) return <div ref={main}>{content}</div>;

  return (
    <div className="site">
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="wordmark"><span className="wordmark-mark" aria-hidden="true">π</span>Prepon <span className="wordmark-greek" lang="grc">πρέπον</span></Link>
          <nav className="site-nav" aria-label="Site">
            <ul>
              {nav.map(([to, label]) => (
                <li key={to}><Link to={to} className={section === to ? 'is-current' : undefined}>{label}</Link></li>
              ))}
              <li><a href="https://github.com/PatriusCastro/prepon">GitHub</a></li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" ref={main}>{content}</main>
      <footer className="site-footer">
        <div className="wrap footer-row">
          <p>Prepon 0.1.0, a Claude Code plugin, built with its own build mode.</p>
          <p>Design rationale: <code>site/README.md</code></p>
        </div>
      </footer>
    </div>
  );
}

// Inside the demo page's live preview: hide "Back to demo screens" (the viewer is already there),
// and send any other link that leaves the demos to the main window.
if (window.top !== window.self) {
  document.documentElement.classList.add('is-embedded');
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest?.('a');
    if (!a || a.origin !== location.origin || /\/demo\/(fleet|permit|expenses)(\/|$)/.test(a.pathname)) return;
    e.preventDefault(); e.stopPropagation();
    window.top!.location.href = a.href;
  }, true);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

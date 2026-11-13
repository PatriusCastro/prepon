import { StrictMode, useEffect, useRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, usePath, href } from './router';
import { Download } from 'lucide-react';
import { DOCS } from './routes';
import { CursorLens } from './ui';
import { Home } from './pages/Home';
import { DocsIndex, DocPage } from './pages/Docs';
import { DemoIndex, Gallery, NotFound } from './pages/Placeholders';
import { FleetLogin, FleetDashboard } from './demos/fleet/Fleet';
import { Permit, permitTitle } from './demos/permit/Permit';
import { Expenses } from './demos/expenses/Expenses';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
// Greek, for πρέπον in the hero label and the name entry (otherwise it falls back to a system face).
import '@fontsource/ibm-plex-sans/greek-400.css';
import '@fontsource/ibm-plex-sans/greek-500.css';
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
  const nav = [['/docs', 'Docs'], ['/demo', 'Demo screens'], ['/gallery', 'Before/after']];

  // The demos are their own made-up products, so they render without the site's header and footer.
  if (/^\/demo\/(fleet|permit|expenses)(\/|$)/.test(path)) return <div ref={main}>{content}</div>;

  return (
    <div className="site">
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap header-row">
          <div className="brand">
            <Link to="/" className="wordmark"><span className="wordmark-mark" aria-hidden="true">π</span>Prepon</Link>
            <span className="header-version">v0.1.0</span>
          </div>
          <nav className="site-nav" aria-label="Site">
            <ul>
              {nav.map(([to, label]) => (
                <li key={to}><Link to={to} className={section === to ? 'is-current' : undefined} aria-current={section === to ? 'page' : undefined}>{label}</Link></li>
              ))}
            </ul>
          </nav>
          <div className="header-actions">
            <a className="header-icon" href="https://github.com/PatriusCastro/prepon" aria-label="Prepon on GitHub" title="Prepon on GitHub">
              {/* GitHub's mark (octicons, MIT); lucide no longer ships brand icons. */}
              <svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" /></svg>
            </a>
            {/* Plain anchor: on other pages it loads the home page at the install section. */}
            <a className="btn btn-primary header-cta" href={path === '/' ? '#install' : `${href('/')}#install`}><Download aria-hidden size={16} />Install</a>
          </div>
        </div>
      </header>
      <main id="main" ref={main}>{content}</main>
      <footer className="site-footer">
        <div className="wrap footer-row">
          <p>Prepon 0.1.0, a Claude Code plugin, built with its own build mode.</p>
          <p>Design rationale: <code>site/README.md</code></p>
        </div>
      </footer>
      <CursorLens />
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

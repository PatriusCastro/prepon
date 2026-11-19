import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '../router';
import './demobar.css';

// Prepon's bar above every demo: the way back, what's made up, and the controls that change the demo itself.
// It belongs to the site, not the made-up product, so it looks the same in every demo and stays in English.
export function DemoBar({ note, wrap, children }: { note: ReactNode; wrap?: string; children?: ReactNode }) {
  return (
    <aside className="demobar" lang="en" aria-label="About this demo">
      <div className={`demobar-row${wrap ? ` ${wrap}` : ''}`}>
        <Link to="/demo" className="demobar-back"><ArrowLeft aria-hidden />All demos</Link>
        <p className="demobar-note"><span className="demobar-tag">Demo</span>{note}</p>
        {children && <div className="demobar-tools">{children}</div>}
      </div>
    </aside>
  );
}

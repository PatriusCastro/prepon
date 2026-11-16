import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react';
import { Link, href } from '../router';
import { DOCS } from '../routes';
import { Compare } from '../showcase';
import { COMPARISONS } from '../content/showcase';
import { useInView } from '../ui';

type Demo = { id: string; name: string; type: string; shows: string; screens: [string, string][] };

const DEMOS: Demo[] = [
  { id: 'fleet', name: 'Fleet dispatch console', type: 'Operations dashboard',
    screens: [['/demo/fleet', 'Sign-in'], ['/demo/fleet/dashboard', 'Dispatch board']],
    shows: 'Sign-in and dashboard for Larkmoor Freight, a made-up regional haulier. An exceptions-first queue beside a map, a searchable vehicle table, a detail drawer, status that doesn’t rely on color, and switchable loading, empty, error, and offline states.' },
  { id: 'permit', name: 'Business permit application', type: 'Government portal and form-heavy workflow',
    screens: [['/demo/permit', 'Start'], ['/demo/permit/business', 'Your business'], ['/demo/permit/payment', 'How you’ll pay'], ['/demo/permit/check', 'Review']],
    shows: 'A Mayor’s Permit application for Marilag City, a made-up Philippine city, for first-time applicants on mid-range Android phones. English and Filipino, a requirements checklist, a live peso fee estimate in a thumb-reach bar, inline validation, uploads with previews, saved answers, a review step, and a confirmation with a status tracker.' },
  { id: 'expenses', name: 'Expense approvals', type: 'Internal finance tool, audited then fixed',
    screens: [['/demo/expenses', 'Approvals']],
    shows: 'Expense approvals for Ashby & Lowe, a made-up firm. A deliberately generic screen scored 8/50 in an audit; fix mode then put the pending queue first, made Approve and Reject real buttons with a reason and undo, and added a claim drawer, a phone sheet, paging, and a dark theme.' },
];

const DEVICES = {
  desktop: { w: 1280, h: 800, label: 'Desktop', Icon: Monitor },
  tablet: { w: 820, h: 1000, label: 'Tablet', Icon: Tablet },
  phone: { w: 390, h: 760, label: 'Phone', Icon: Smartphone },
} as const;
type Device = keyof typeof DEVICES;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function Segmented<T extends string>({ label, value, options, onChange, className = 'segmented' }: { label: string; value: T; options: [T, ReactNode][]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={className} role="group" aria-label={label}>
      {options.map(([v, content]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{content}</button>)}
    </div>
  );
}

/** The demos running live in a framed preview, at a real device width scaled to fit. */
function DemoViewer() {
  const [demo, setDemo] = useState<Demo>(() => DEMOS.find((d) => '#' + d.id === location.hash) ?? DEMOS[0]);
  const [device, setDevice] = useState<Device>(() => (innerWidth < 700 ? 'phone' : 'desktop'));
  const [src, setSrc] = useState(demo.screens[0][0]);
  const [path, setPath] = useState(src);
  const [reloads, setReloads] = useState(0);
  const [avail, setAvail] = useState(1280);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAvail(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Show the frame's current route in the address bar. The demos navigate with pushState and fire popstate.
  const onLoad = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const update = () => setPath(w.location.pathname.slice(BASE.length).replace(/\/$/, '') || '/');
    update();
    w.addEventListener('popstate', update);
  };

  const pick = (d: Demo) => {
    setDemo(d); setSrc(d.screens[0][0]); setPath(d.screens[0][0]);
    history.replaceState(null, '', '#' + d.id);
  };
  const go = (to: string) => { setSrc(to); setPath(to); setReloads((n) => n + 1); };

  const { w, h } = DEVICES[device];
  const scale = Math.min(1, avail / w);

  return (
    <section className="viewer" aria-label="Live preview">
      <Segmented label="Demo" className="demo-picker" value={demo.id} onChange={(id) => pick(DEMOS.find((d) => d.id === id)!)}
        options={DEMOS.map((d) => [d.id, d.name])} />
      <div className="viewer-info">
        <p className="demo-meta"><span>{demo.type}</span></p>
        <p>{demo.shows}</p>
      </div>
      <div className="viewer-bar">
        <div className="viewer-screens">
          <span aria-hidden="true">Screen</span>
          <Segmented label="Screen" value={path} onChange={go} options={demo.screens.map(([to, label]) => [to, label] as [string, ReactNode])} />
        </div>
        <Segmented label="Device width" value={device} onChange={setDevice}
          options={(Object.keys(DEVICES) as Device[]).map((k) => {
            const { Icon, label } = DEVICES[k];
            return [k, <><Icon aria-hidden size={16} />{label}</>];
          })} />
      </div>
      <div className="viewer-stage" ref={stage}>
        <div className={`browser is-${device}`} style={{ width: w * scale }}>
          <div className="browser-bar">
            <span className="term-lights" aria-hidden="true"><i /><i /><i /></span>
            <span className="browser-url" title={path}>localhost/prepon{path}</span>
            <span className="browser-actions">
              <button type="button" className="icon-btn" aria-label="Reload the demo" onClick={() => setReloads((n) => n + 1)}><RotateCw aria-hidden size={16} /></button>
              <a className="icon-btn" href={href(path)} aria-label="Open this screen full page"><ExternalLink aria-hidden size={16} /></a>
            </span>
          </div>
          <div className="browser-view" style={{ height: h * scale }}>
            <iframe key={`${src}-${reloads}`} ref={frame} src={href(src)} onLoad={onLoad} title={`${demo.name}, live demo at ${w} px wide`}
              width={w} height={h} style={{ transform: `scale(${scale})` }} />
          </div>
        </div>
      </div>
      <p className="viewer-note">
        Everything runs in your browser and nothing you type is sent anywhere. Each demo’s dark top bar switches its states.
        {scale < 1 && <> Shown at {Math.round(scale * 100)}% of its real {w} px width.</>}
      </p>
    </section>
  );
}

export function DemoIndex() {
  return (
    <div className="wrap page">
      <header className="page-head is-row">
        <h1 tabIndex={-1}>Demo screens</h1>
        <p className="lede">Three made-up enterprise products, built or fixed with Prepon. They run live below: click through them, switch the device width, or open one full page.</p>
      </header>
      <DemoViewer />
      <p className="prose">The <Link to="/docs/project-types">project types</Link> page describes what Prepon looks for in each kind of screen, and the <Link to="/gallery">gallery</Link> shows each demo before and after.</p>
    </div>
  );
}

export function Gallery() {
  // Each capture's divider sweeps once when it first comes on screen, to show it can be dragged.
  useInView('.compare');
  return (
    <div className="wrap page">
      <header className="page-head is-row">
        <h1 tabIndex={-1}>Before/after gallery</h1>
        <p className="lede">Captures from Prepon runs on the three demo screens, cropped to the first screen at 1440 and 360 px. Each note comes from that run’s own change summary.</p>
        <p>Prepon’s rule is never to describe a visual result nobody has seen, so every image here is a real capture taken during the run. The procedure is in <Link to="/docs/before-after">Before and after</Link>.</p>
      </header>
      {COMPARISONS.map((c) => (
        <section key={c.id} className="gallery-item" aria-labelledby={`g-${c.id}`}>
          <div className="gallery-head">
            <h2 id={`g-${c.id}`}>{c.name}</h2>
            <p className="demo-meta"><span>Run: {c.run}</span> <span aria-hidden="true">·</span> <Link to={c.route}>Open the demo</Link></p>
          </div>
          <Compare id={c.id} name={c.name} />
          <ul className="gallery-notes">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

export function NotFound() {
  return (
    <div className="wrap page">
      <header className="page-head">
        <h1 tabIndex={-1}>Page not found</h1>
        <p className="lede">There’s no page at this address. It may have moved when the docs were reorganized.</p>
      </header>
      <p className="page-actions">
        <Link to="/docs" className="btn btn-primary">Docs index</Link>
        <Link to="/" className="btn">Home page</Link>
      </p>
      <section className="lost" aria-labelledby="lost-h">
        <h2 id="lost-h">Docs pages</h2>
        <ul>{DOCS.map((d) => <li key={d.slug}><Link to={`/docs/${d.slug}`}>{d.title}</Link></li>)}</ul>
      </section>
    </div>
  );
}

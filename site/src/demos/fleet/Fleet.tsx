import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type KeyboardEvent as KeyEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import {
  ArrowBigUpDash, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Bell, ChartColumn, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, CloudOff,
  Eye, EyeOff, Info, KeyRound, LayoutDashboard, LoaderCircle, LockKeyhole, LogIn, LogOut, Mail, Navigation, OctagonAlert, Package,
  Phone, RefreshCw, Search, TriangleAlert, Truck, Users, Warehouse, WifiOff, X, type LucideIcon,
} from 'lucide-react';
import { Link, navigate } from '../../router';
import { useOnline } from '../useOnline';
import { DEPOT, LAST_GOOD, PLACES, SHIFT, USER, VEHICLES, type LatLng, type Severity, type Vehicle } from './data';
import './fleet.css';

// ---------- shared ----------

const clock = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const age = (s: number) => (s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} min ago`);
const initials = (name: string) => name.split(' ').filter(Boolean).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');
const toMin = (s: string) => { const m = /(\d\d):(\d\d)/.exec(s); return m ? +m[1] * 60 + +m[2] : null; };

// The board and the sign-in both open at desktop width with the map beside the work, and stack below it.
const WIDE = '(min-width: 64rem)';
const useWide = () => useSyncExternalStore((cb) => {
  const m = matchMedia(WIDE);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}, () => matchMedia(WIDE).matches);

function DemoBar({ children }: { children?: ReactNode }) {
  return (
    <div className="f-demobar">
      <div className="f-demobar-row">
        <p><Info className="f-icon" aria-hidden />Prepon demo. Larkmoor Freight is a made-up company and every name and number here is fictional.</p>
        {children}
        <Link to="/demo" className="f-demobar-back"><ArrowLeft className="f-icon" aria-hidden />Back to demo screens</Link>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="f-wordmark">
      <span className="f-logo" aria-hidden><Truck /></span>
      <span className="f-wordmark-text">
        <span className="f-wordmark-name">Larkmoor Freight</span>
        <span className="f-wordmark-product">Dispatch</span>
      </span>
    </span>
  );
}

// The shift as a line from start to end with "now" on it: how much of the day is left to recover late drops.
// Shared by the board and the sign-in, so both screens carry the same signature element.
function ShiftBar() {
  const s = toMin(SHIFT.start)!, e = toMin(SHIFT.end)!, n = toMin(SHIFT.now)!;
  const left = Math.max(0, e - n);
  return (
    <div className="f-shift">
      <p className="f-shift-text">
        <span><Clock className="f-icon" aria-hidden />{DEPOT.shift}</span>
        <span className="f-shift-left">{SHIFT.now} · {Math.floor(left / 60)} h {left % 60} min left</span>
      </p>
      <span className="f-shift-bar" aria-hidden style={{ '--f-done': Math.min(1, (n - s) / (e - s)) } as CSSProperties} />
    </div>
  );
}

function SevIcon({ sev }: { sev: Severity }) {
  // Octagon for critical, triangle for warning: the shape reads without color.
  const Icon = sev === 'critical' ? OctagonAlert : TriangleAlert;
  return <Icon className="f-icon" aria-hidden />;
}

function Avatar({ name }: { name: string }) {
  return <span className="f-avatar" aria-hidden>{name === 'Unassigned' ? '–' : initials(name)}</span>;
}

type Ack = { at: string; pending: boolean };

function Status({ v, ack }: { v: Vehicle; ack?: Ack }) {
  if (!v.issue) {
    const Icon = v.atDepot ? Warehouse : Navigation;
    return <span className="f-quiet"><Icon className="f-icon" aria-hidden />{v.atDepot ? 'At depot' : 'On plan'}</span>;
  }
  return (
    <span className="f-status">
      <span className={`f-pill f-pill--${v.issue.severity}`}>
        <SevIcon sev={v.issue.severity} />
        <span className="visually-hidden">{v.issue.severity === 'critical' ? 'Critical: ' : 'Warning: '}</span>
        {v.issue.kind}
      </span>
      {ack && <span className="f-pill f-pill--handled"><Check className="f-icon" aria-hidden />Handled {ack.at}</span>}
    </span>
  );
}

function UserMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // <details> gives the toggle and keyboard support; this adds outside-click and Escape to close.
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        d.open = false;
        d.querySelector('summary')?.focus();
      } else if (!d.contains(e.target as Node)) d.open = false;
    };
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    return () => { removeEventListener('pointerdown', close); removeEventListener('keydown', close); };
  }, []);
  return (
    <details ref={ref} className="f-menu">
      <summary>
        <span className="f-avatar" aria-hidden>{initials(USER.name)}</span>
        <span className="f-menu-name"><span className="visually-hidden">Account menu: </span>{USER.name}</span>
        <ChevronDown className="f-icon f-menu-chev" aria-hidden />
      </summary>
      <div className="f-menu-pop">
        <p className="f-menu-who"><strong>{USER.name}</strong><span>{USER.role}, {DEPOT.name}</span></p>
        <Link to="/demo/fleet" className="f-menu-item"><LogOut className="f-icon" aria-hidden />Sign out</Link>
      </div>
    </details>
  );
}

// Light grey basemap without place names: the places are fictional, so their labels are drawn as markers below.
// Esri's base layer needs no key (CARTO's keyless tiles now return an "API key required" watermark).
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
// Same basemap in dark grey for the dashboard's dark theme (checked: keyless, no labels, no watermark).
const TILES_DARK = TILES.replace('Light_Gray', 'Dark_Gray');
const DARK = '(prefers-color-scheme: dark)';

// Both maps follow the system theme: add the basemap and swap it when the theme changes. Returns the cleanup.
function themedTiles(map: L.Map) {
  const dark = matchMedia(DARK);
  const tiles = L.tileLayer(dark.matches ? TILES_DARK : TILES, { attribution: ATTRIBUTION, maxZoom: 16 }).addTo(map);
  const theme = () => tiles.setUrl(dark.matches ? TILES_DARK : TILES);
  dark.addEventListener('change', theme);
  return () => dark.removeEventListener('change', theme);
}
const ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Labels south of the depot sit below their point, so they don't collide with vehicles heading out to them.
const placeClass = (at: LatLng) => (at[0] < DEPOT.at[0] - 0.04 ? 'f-place f-place--below' : 'f-place');

// ---------- login ----------

// The area this board covers: same tiles, depot pin, place labels, and shift line as the board, without any vehicles
// (nothing about the fleet shows before sign-in). Static: no dragging, zoom, or keyboard stop.
// Only mounted on wide screens, so phones on mobile data don't fetch tiles to sign in.
function LoginMap() {
  const box = useRef<HTMLDivElement>(null);
  const [depot] = useState(() => document.createElement('div'));
  useEffect(() => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(box.current!, {
      zoomControl: false, dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false,
      keyboard: false, zoomAnimation: false, fadeAnimation: !still, zoomSnap: 0.25, maxZoom: 16,
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const untheme = themedTiles(map);
    map.getPane('markerPane')?.setAttribute('aria-hidden', 'true'); // the caption names the depot
    const pin = (at: LatLng, html: string | HTMLElement, z = 0) =>
      L.marker(at, { icon: L.divIcon({ html, className: 'f-mk', iconSize: undefined }), keyboard: false, interactive: false, zIndexOffset: z }).addTo(map);
    PLACES.forEach((p) => pin(p.at, `<div><span class="${placeClass(p.at)}">${p.name}</span></div>`));
    pin(DEPOT.at, depot, 500);
    const bounds = L.latLngBounds([DEPOT.at, ...PLACES.map((p) => p.at)]);
    // Extra room at the bottom left for the shift caption that floats there.
    const fit = () => { map.invalidateSize(); map.fitBounds(bounds, { paddingTopLeft: [64, 64], paddingBottomRight: [64, 160] }); };
    const ro = new ResizeObserver(fit);
    ro.observe(box.current!);
    return () => { ro.disconnect(); untheme(); map.remove(); };
  }, [depot]);
  return (
    <figure className="f-login-map">
      <div ref={box} className="f-map" />
      {createPortal(<span className="f-depot"><span className="f-depot-mark"><Warehouse /></span>Northgate</span>, depot)}
      <figcaption className="f-login-cap">
        <strong>{DEPOT.name}</strong>
        <ShiftBar />
      </figcaption>
    </figure>
  );
}

export function FleetLogin() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; pw?: string }>({});
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const [tried, setTried] = useState(false);
  const online = useOnline();
  const wide = useWide();
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    const err: typeof errors = {};
    const em = email.trim();
    if (!em) err.email = 'Enter your work email address, for example d.okafor@larkmoor.example.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) err.email = 'Enter the full email address, including the part after the @.';
    if (!pw) err.pw = 'Enter your password.';
    setErrors(err);
    if (err.email) return emailRef.current?.focus();
    if (err.pw) return pwRef.current?.focus();
    if (!online) return;
    setPhase('busy');
    // ponytail: fake sign-in; any valid-looking email and non-empty password gets in. A short "Signed in" beat
    // confirms it worked before the board replaces the form (same 0.7 s total a real round trip would take).
    setTimeout(() => setPhase('done'), 450);
    setTimeout(() => navigate('/demo/fleet/dashboard'), 700);
  };
  const capsCheck = (e: KeyEvent) => setCaps(e.getModifierState('CapsLock'));
  const pwDesc = [errors.pw && 'f-pw-err', caps && 'f-pw-caps'].filter(Boolean).join(' ') || undefined;

  return (
    <div className="fleet f-entry">
      <a className="skip" href="#fleet-main">Skip to sign in</a>
      <DemoBar />
      <main id="fleet-main" className="f-login">
        <div className="f-login-pane">
          <div className="f-login-col">
            <header className="f-login-brand"><Wordmark /></header>
            <div className="f-login-form">
              <div className="f-login-intro">
                <p className="f-eyebrow">{DEPOT.name} · Calder Mills · Fenwick Quay</p>
                <h1 tabIndex={-1}>Sign in to dispatch</h1>
                <p className="f-lede">For Larkmoor dispatchers and shift supervisors.</p>
              </div>

              {!online && (
                <div className="f-callout f-callout--warning" role="status">
                  <WifiOff className="f-icon" aria-hidden />
                  <div>
                    <p className="f-callout-title">You’re offline</p>
                    <p>{tried
                      ? 'Couldn’t sign in without a connection. Your details are still filled in, so choose Sign in again when you’re back online.'
                      : 'Signing in needs a connection. You can fill in your details now and sign in when you’re back online.'}</p>
                  </div>
                </div>
              )}

              <form className="f-form" onSubmit={submit} noValidate>
                <div className="f-field">
                  <label htmlFor="f-email">Work email</label>
                  <div className="f-input-group">
                    <Mail className="f-icon f-input-lead" aria-hidden />
                    <input id="f-email" ref={emailRef} type="email" inputMode="email" autoComplete="username" spellCheck={false}
                      value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                      aria-invalid={!!errors.email} aria-describedby={errors.email ? 'f-email-err' : undefined} />
                  </div>
                  {errors.email && <p id="f-email-err" className="f-error"><CircleAlert className="f-icon" aria-hidden />{errors.email}</p>}
                </div>

                <div className="f-field">
                  <label htmlFor="f-pw">Password</label>
                  <div className="f-input-group">
                    <LockKeyhole className="f-icon f-input-lead" aria-hidden />
                    <input id="f-pw" ref={pwRef} type={show ? 'text' : 'password'} autoComplete="current-password"
                      value={pw} onChange={(e) => { setPw(e.target.value); if (errors.pw) setErrors({ ...errors, pw: undefined }); }}
                      onKeyDown={capsCheck} onKeyUp={capsCheck} onBlur={() => setCaps(false)}
                      aria-invalid={!!errors.pw} aria-describedby={pwDesc} />
                    <button type="button" className="f-btn f-btn--ghost f-btn--small f-input-action" aria-pressed={show} onClick={() => setShow(!show)}>
                      {show ? <EyeOff key="hide" className="f-icon f-swap" aria-hidden /> : <Eye key="show" className="f-icon f-swap" aria-hidden />}
                      {show ? 'Hide' : 'Show'}<span className="visually-hidden"> password</span>
                    </button>
                  </div>
                  {caps && <p id="f-pw-caps" className="f-caps"><ArrowBigUpDash className="f-icon" aria-hidden />Caps Lock is on.</p>}
                  {errors.pw && <p id="f-pw-err" className="f-error"><CircleAlert className="f-icon" aria-hidden />{errors.pw}</p>}
                </div>

                <button type="submit" className={phase === 'done' ? 'f-btn f-btn--primary f-btn--block f-btn--done' : 'f-btn f-btn--primary f-btn--block'}
                  disabled={phase !== 'idle'}>
                  {phase === 'idle' && <><LogIn className="f-icon" aria-hidden />Sign in</>}
                  {phase === 'busy' && <><LoaderCircle className="f-icon f-spin" aria-hidden />Signing in…</>}
                  {phase === 'done' && <><CircleCheck className="f-icon f-swap" aria-hidden />Signed in</>}
                </button>
                <p role="status" className="visually-hidden">{phase === 'done' ? 'Signed in. Opening the dispatch board.' : ''}</p>
              </form>

              <div className="f-or"><span>or</span></div>
              <button type="button" className="f-btn f-btn--secondary f-btn--block" onClick={() => navigate('/demo/fleet/dashboard')}>
                <KeyRound className="f-icon" aria-hidden />Sign in with Larkmoor single sign-on
              </button>

              <p className="f-hint"><Info className="f-icon" aria-hidden />Demo: any email address and password will sign you in.</p>
            </div>
            <p className="f-help">Can’t sign in? Call the IT service desk on <a href="tel:03005550142">0300 555 0142</a>, open 24 hours.</p>
          </div>
        </div>
        {wide && <LoginMap />}
      </main>
    </div>
  );
}

// ---------- dashboard ----------

type DemoState = 'live' | 'loading' | 'empty' | 'error' | 'offline';
type Filter = 'all' | 'attention' | 'onplan' | 'depot';

const FILTERS: [Filter, string][] = [['all', 'All'], ['attention', 'Needs attention'], ['onplan', 'On plan'], ['depot', 'At depot']];
const SIZES = [10, 25, 50];
const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1 };
const matches = (f: Filter, v: Vehicle) =>
  f === 'all' || (f === 'attention' ? !!v.issue : f === 'depot' ? !!v.atDepot : !v.issue && !v.atDepot);

// Sortable columns. Default is status: critical, warning, on plan, at depot, which is the order dispatchers triage in.
type SortKey = 'unit' | 'status' | 'driver' | 'eta' | 'ping' | 'speed';
const SORT_KEYS: SortKey[] = ['unit', 'status', 'driver', 'eta', 'ping', 'speed'];
// Severity, then oldest exception first: the same order as the Needs attention queue.
const rank = (v: Vehicle) => (v.issue ? SEV_ORDER[v.issue.severity] * 1e4 + (toMin(v.issue.since) ?? 0) : v.atDepot ? 3e4 : 2e4);
const sortVal = (k: SortKey, v: Vehicle): string | number | null =>
  k === 'unit' ? v.id : k === 'driver' ? v.driver : k === 'eta' ? (v.atDepot ? null : toMin(v.eta))
  : k === 'ping' ? v.pingSec : k === 'speed' ? v.speed : rank(v);
// Missing values (unknown ETA, vehicles in the yard) stay at the bottom in both directions. Array sort is stable,
// so ties keep the feed's order and rows never jump on a position refresh.
const bySort = (k: SortKey, desc: boolean) => (a: Vehicle, b: Vehicle) => {
  const x = sortVal(k, a), y = sortVal(k, b);
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  const c = typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number);
  return desc ? -c : c;
};
// Planned vs actual: minutes the ETA runs past the delivery window. Only lateness is shown; on time stays quiet.
const lateBy = (v: Vehicle) => {
  const eta = toMin(v.eta), end = toMin(v.window.split('–')[1] ?? '');
  return !v.atDepot && eta !== null && end !== null && eta > end ? eta - end : 0;
};

// Only Dispatch exists in this demo; the other destinations say so when chosen. Phones show the first four.
const NAV: [string, LucideIcon][] = [
  ['Dispatch', LayoutDashboard], ['Vehicles', Truck], ['Drivers', Users], ['Deliveries', Package], ['Reports', ChartColumn],
];

function MainNav({ className, onSoon }: { className: string; onSoon: (label: string) => void }) {
  return (
    <nav className={className} aria-label="Main">
      <ul>
        {NAV.map(([label, Icon], i) => (
          <li key={label}>
            {i === 0
              ? <Link to="/demo/fleet/dashboard" className="f-nav-item" title={label}><Icon className="f-icon" aria-hidden /><span className="f-nav-label">{label}</span></Link>
              : <button type="button" className="f-nav-item" title={label} onClick={() => onSoon(label)}><Icon className="f-icon" aria-hidden /><span className="f-nav-label">{label}</span></button>}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// A square status tile leads every vehicle row: severity shape and tint for exceptions, quiet grey for the rest.
function Tile({ v, ack }: { v: Vehicle; ack?: Ack }) {
  const Icon = ack ? Check : v.issue ? (v.issue.severity === 'critical' ? OctagonAlert : TriangleAlert) : v.atDepot ? Warehouse : Navigation;
  return <span className={`f-tile f-tile--${ack ? 'handled' : v.issue?.severity ?? 'quiet'}`} aria-hidden><Icon /></span>;
}

function VehicleButton({ v, ack, since, dialog, onOpen }: { v: Vehicle; ack?: Ack; since: number; dialog: boolean; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="f-row" data-vid={v.id} aria-haspopup={dialog ? 'dialog' : undefined} onClick={() => onOpen(v.id)}>
      <Tile v={v} ack={ack} />
      <span className="f-row-main">
        <span className="f-row-top">
          <strong className="f-id">{v.id}</strong>
          {v.issue
            ? <span className={`f-kind f-kind--${ack ? 'handled' : v.issue.severity}`}>
                <span className="visually-hidden">{v.issue.severity === 'critical' ? 'Critical: ' : 'Warning: '}</span>{v.issue.kind}
                {ack && <span>, handled {ack.at}</span>}
              </span>
            : <span className="f-kind">{v.atDepot ? 'At depot' : 'On plan'}</span>}
          <span className="f-row-time">{v.issue ? <><span className="visually-hidden">since </span>{v.issue.since}</> : v.atDepot ? '' : <>ETA {v.eta}</>}</span>
        </span>
        <span className="f-row-text">{v.issue ? v.issue.detail : v.nextStop}</span>
        <span className="f-row-meta">{v.driver} · {v.plate} · position {age(v.pingSec + since)}</span>
      </span>
      <ChevronRight className="f-icon f-row-go" aria-hidden />
    </button>
  );
}

function FleetMap({ vehicles, acks, selected, onOpen }: {
  vehicles: Vehicle[]; acks: Record<string, Ack>; selected: string | null; onOpen: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const road = vehicles.filter((v) => !v.atDepot);
  const flagged = road.filter((v) => v.issue);
  const atDepot = vehicles.length - road.length;
  // One DOM slot per marker: Leaflet positions the slot, React renders into it through a portal.
  const [slots] = useState(() => new Map<string, HTMLElement>());
  const slot = (key: string) => {
    if (!slots.has(key)) slots.set(key, document.createElement('div'));
    return slots.get(key)!;
  };

  useEffect(() => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(box.current!, {
      zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, // keep page scroll on phones; pinch and buttons still zoom
      zoomAnimation: !still, fadeAnimation: !still, markerZoomAnimation: !still, zoomSnap: 0.25, maxZoom: 16,
    });
    mapRef.current = map;
    // Zoom sits bottom right, under the thumb on tablets and out of the way of the legend.
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const untheme = themedTiles(map);
    map.getPane('markerPane')?.setAttribute('aria-hidden', 'true'); // the summary paragraph and the lists carry this
    const pin = (key: string, at: LatLng, z: number, title?: string, open?: () => void) => {
      const m = L.marker(at, { icon: L.divIcon({ html: slot(key), className: 'f-mk', iconSize: undefined }), keyboard: false,
        interactive: !!open, zIndexOffset: z, title }).addTo(map);
      if (open) m.on('click', open);
    };
    PLACES.forEach((p) => pin(p.name, p.at, -1000));
    pin('depot', DEPOT.at, 500);
    road.forEach((v) => pin(v.id, v.at, v.issue ? 1000 : 0, `${v.id}: open details`, () => onOpen(v.id)));
    // Room at the top for the legend that floats over the map.
    map.fitBounds(L.latLngBounds([DEPOT.at, ...PLACES.map((p) => p.at), ...road.map((v) => v.at)]),
      { paddingTopLeft: [40, 72], paddingBottomRight: [64, 40] });
    // The pane resizes with the window and the layout; Leaflet only watches the window.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(box.current!);
    return () => { ro.disconnect(); untheme(); map.remove(); mapRef.current = null; };
    // Vehicles are a fixed set while this map is mounted; acks and selection only change marker content, which the portals handle.
  }, []);

  // Opening a vehicle brings it into view, so the detail and its place on the map are read together.
  useEffect(() => {
    const v = road.find((r) => r.id === selected);
    const map = mapRef.current;
    if (!v || !map || map.getBounds().pad(-0.15).contains(v.at)) return;
    map.panTo(v.at, { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 0.3 });
  }, [selected]);

  return (
    <>
      <p className="visually-hidden">
        {`Map: ${road.length} vehicles on the road and ${atDepot} at ${DEPOT.name}. Needing attention: ${flagged.map((v) => `${v.id}, ${v.issue!.kind}`).join('; ') || 'none'}. The same vehicles are listed in Needs attention and All vehicles.`}
      </p>
      <div ref={box} className="f-map" aria-label="Vehicle map. Arrow keys pan, plus and minus zoom." />
      {PLACES.map((p) => createPortal(<span className={placeClass(p.at)}>{p.name}</span>, slot(p.name), p.name))}
      {createPortal(<span className="f-depot"><span className="f-depot-mark"><Warehouse /></span>Northgate · {atDepot}</span>, slot('depot'), 'depot')}
      {road.map((v) => {
        const a = acks[v.id];
        const on = selected === v.id ? ' f-flag--on' : '';
        return createPortal(v.issue
          ? <span className={`f-flag f-flag--${a ? 'handled' : v.issue.severity}${on}`}>{a ? <Check className="f-icon" /> : <SevIcon sev={v.issue.severity} />}{v.id}</span>
          : on ? <span className={`f-flag${on}`}><Navigation className="f-icon" />{v.id}</span> : <span className="f-dot" />, slot(v.id), v.id);
      })}
      <ul className="f-legend" aria-hidden="true">
        <li><span className="f-dot f-dot--static" />On plan</li>
        <li><OctagonAlert className="f-icon f-crit" />Critical</li>
        <li><TriangleAlert className="f-icon f-warn" />Warning</li>
        <li><Check className="f-icon" />Handled</li>
        <li><span className="f-depot-mark"><Warehouse /></span>Depot, vehicles in yard</li>
      </ul>
    </>
  );
}

// What a dispatcher needs to act on one vehicle. Shown in a sheet or side panel below desktop width,
// and in place of the queue on desktop so the map stays in view beside it.
function DetailBody({ v, ack, offline, onAck }: { v: Vehicle; ack?: Ack; offline: boolean; onAck: (id: string) => void }) {
  return (
    <>
      <Status v={v} ack={ack} />
      {v.issue && (
        <div className={`f-callout f-callout--${v.issue.severity}`}>
          <SevIcon sev={v.issue.severity} />
          <div>
            <p className="f-callout-title">{v.issue.kind} since {v.issue.since}</p>
            <p>{v.issue.detail}</p>
          </div>
        </div>
      )}
      <div className="f-drawer-actions">
        {v.phone && (
          <a className="f-btn f-btn--primary" href={`tel:${v.phone.replace(/\s/g, '')}`}>
            <Phone className="f-icon" aria-hidden />Call {v.driver.split(' ')[0]} · {v.phone}
          </a>
        )}
        {v.issue && !ack && (
          <button type="button" className="f-btn f-btn--secondary" onClick={() => onAck(v.id)}>
            <Check className="f-icon" aria-hidden />Mark as handled
          </button>
        )}
        {ack && (
          <p className="f-done"><CircleCheck className="f-icon" aria-hidden />
            <span>Marked as handled by you at {ack.at}.{ack.pending || offline ? ' Saved on this device; it will sync when you’re back online.' : ''}</span>
          </p>
        )}
      </div>
      <div className="f-driver">
        <Avatar name={v.driver} />
        <div><p className="f-driver-name">{v.driver}</p><p className="f-sub">Driver · {v.trailer}</p></div>
      </div>
      <dl className="f-facts">
        {([
          ['Route', v.route], ['Next stop', v.nextStop], ['ETA', v.eta],
          ['Delivery window', v.window], ['Speed', `${v.speed} km/h`],
        ] as const).map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
      </dl>
    </>
  );
}

function Drawer({ v, ack, offline, onAck, onClose }: {
  v: Vehicle | null; ack?: Ack; offline: boolean; onAck: (id: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Keep the last vehicle rendered while the drawer animates closed.
  const last = useRef(v);
  if (v) last.current = v;
  const shown = v ?? last.current;
  useEffect(() => {
    const d = ref.current;
    if (v && !d?.open) d?.showModal();
    if (!v && d?.open) d.close(); // the window grew to desktop width: the detail moves into the triage pane
  }, [v]);
  const close = () => ref.current?.close();
  return (
    // Native <dialog>: focus trap, Escape, and focus return come with it. Clicking the backdrop closes it too.
    <dialog ref={ref} className="f-drawer" aria-labelledby="f-drawer-h" onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      {shown && (
        <div className="f-drawer-body">
          <div className="f-drawer-head">
            <h2 id="f-drawer-h">{shown.id} <span className="f-plate">{shown.plate}</span></h2>
            <button type="button" className="f-btn f-btn--ghost f-btn--icon" aria-label="Close" title="Close" onClick={close}>
              <X className="f-icon" aria-hidden />
            </button>
          </div>
          <DetailBody v={shown} ack={ack} offline={offline} onAck={onAck} />
        </div>
      )}
    </dialog>
  );
}

function InlineDetail({ v, ack, offline, onAck, onBack }: {
  v: Vehicle; ack?: Ack; offline: boolean; onAck: (id: string) => void; onBack: () => void;
}) {
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h.current?.focus(); }, [v.id]);
  return (
    <section className="f-detail" aria-labelledby="f-detail-h" onKeyDown={(e) => { if (e.key === 'Escape') onBack(); }}>
      <button type="button" className="f-btn f-btn--ghost f-btn--small f-back" onClick={onBack}>
        <ArrowLeft className="f-icon" aria-hidden />Back to queue
      </button>
      <h2 id="f-detail-h" ref={h} tabIndex={-1}>{v.id} <span className="f-plate">{v.plate}</span></h2>
      <DetailBody v={v} ack={ack} offline={offline} onAck={onAck} />
    </section>
  );
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  // ponytail: every page number is shown; add ellipsis windows once a depot has more than ~7 pages.
  return (
    <nav className="f-pages" aria-label="Pages of vehicles">
      <button type="button" className="f-btn f-btn--ghost f-btn--small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="f-icon" aria-hidden />Previous
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" className="f-page" aria-current={n === page ? 'page' : undefined}
          aria-label={`Page ${n}`} onClick={() => onPage(n)}>{n}</button>
      ))}
      <button type="button" className="f-btn f-btn--ghost f-btn--small" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next<ChevronRight className="f-icon" aria-hidden />
      </button>
    </nav>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return <div className="f-skeleton" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <span key={i} />)}</div>;
}

// Move to a section heading (they carry tabIndex -1) so keyboard and screen reader users land where the eye goes.
const jump = (id: string) => {
  const h = document.getElementById(id);
  h?.focus({ preventScroll: true });
  h?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};

export function FleetDashboard() {
  const url = new URLSearchParams(location.search);
  const [demo, setDemo] = useState<DemoState>('live');
  const [since, setSince] = useState(4);
  const [filter, setFilter] = useState<Filter>(() => FILTERS.find(([f]) => f === url.get('filter'))?.[0] ?? 'all');
  const [query, setQuery] = useState(() => url.get('q') ?? '');
  const [size, setSize] = useState(() => (SIZES.includes(Number(url.get('size'))) ? Number(url.get('size')) : SIZES[0]));
  const [page, setPage] = useState(() => Math.max(1, Number(url.get('page')) || 1));
  // ?sort=eta ascending, ?sort=-eta descending.
  const [sort, setSort] = useState(() => {
    const s = url.get('sort') ?? '';
    const key = SORT_KEYS.find((k) => k === s.replace(/^-/, ''));
    return { key: key ?? 'status' as SortKey, desc: !!key && s.startsWith('-') };
  });
  const [more, setMore] = useState(SIZES[0]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [acks, setAcks] = useState<Record<string, Ack>>({});
  const [msg, setMsg] = useState('');
  const [spin, setSpin] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const focusFrom = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnTo = useRef<{ el: Element | null; id: string } | null>(null);
  const online = useOnline();
  const wide = useWide();
  const offline = demo === 'offline' || !online;
  const hasData = demo === 'live' || demo === 'offline';

  // Simulated feed: positions refresh every 30 s while live. Rows never reorder on refresh.
  useEffect(() => {
    const t = setInterval(() => setSince((s) => (!offline && s >= 30 ? 0 : s + 1)), 1000);
    return () => clearInterval(t);
  }, [offline]);

  // The toast is the visible copy of the status message; it clears itself.
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // Leaving the in-place detail: focus goes back to what opened it, or to the vehicle's row in the queue,
  // which re-mounts when the detail closes.
  useEffect(() => {
    const r = returnTo.current;
    if (openId || !r) return;
    returnTo.current = null;
    const el = r.el?.isConnected ? r.el : document.querySelector(`.f-queue [data-vid="${r.id}"]`) ?? document.getElementById('f-q-h');
    (el as HTMLElement | null)?.focus();
  }, [openId]);

  const vehicles = hasData ? VEHICLES : [];
  const exceptions = vehicles.filter((v) => v.issue)
    .sort((a, b) => SEV_ORDER[a.issue!.severity] - SEV_ORDER[b.issue!.severity] || a.issue!.since.localeCompare(b.issue!.since));
  const openCount = exceptions.filter((v) => !acks[v.id]).length;
  const critOpen = exceptions.filter((v) => !acks[v.id] && v.issue!.severity === 'critical').length;
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  const shown = vehicles.filter((v) => matches(filter, v) &&
    (!q || [v.id, v.plate, v.driver, v.route].some((s) => s.toLowerCase().replace(/\s+/g, '').includes(q))))
    .sort(bySort(sort.key, sort.desc));
  const count = (f: Filter) => vehicles.filter((v) => matches(f, v)).length;
  const selected = VEHICLES.find((v) => v.id === openId) ?? null;
  const pages = Math.max(1, Math.ceil(shown.length / size));
  const cur = Math.min(page, pages);
  const first = (cur - 1) * size;
  const pageRows = shown.slice(first, first + size);
  const phoneRows = shown.slice(0, more);

  // Page, filter, search, and page size live in the URL, so a refresh or a shared link returns to the same view.
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('filter', filter);
    if (query) p.set('q', query);
    if (cur > 1) p.set('page', String(cur));
    if (size !== SIZES[0]) p.set('size', String(size));
    if (sort.key !== 'status' || sort.desc) p.set('sort', (sort.desc ? '-' : '') + sort.key);
    const s = p.toString();
    history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : ''));
  }, [filter, query, cur, size, sort]);

  // After "Load more", move focus to the first new row.
  useEffect(() => {
    if (focusFrom.current === null) return;
    listRef.current?.querySelectorAll('button')[focusFrom.current]?.focus();
    focusFrom.current = null;
  }, [more]);

  const open = (id: string) => {
    if (matchMedia(WIDE).matches) returnTo.current = { el: document.activeElement, id };
    setOpenId(id);
  };
  // Changing the search or filter starts again from the first page.
  const narrow = (f: Filter, text: string) => { setFilter(f); setQuery(text); setPage(1); setMore(SIZES[0]); };
  // Choosing the sorted column flips its direction; a new column starts ascending. Either way, back to page 1.
  const sortBy = (key: SortKey) => { setSort({ key, desc: sort.key === key && !sort.desc }); setPage(1); };
  const sortHead = (key: SortKey, label: string, num = false) => {
    const on = sort.key === key;
    const Icon = !on ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
    return (
      <th key={key} scope="col" className={num ? 'f-num' : undefined} aria-sort={on ? (sort.desc ? 'descending' : 'ascending') : undefined}>
        <button type="button" className={on ? 'f-sort f-sort--on' : 'f-sort'} onClick={() => sortBy(key)}>
          {label}<Icon className="f-icon" aria-hidden />
        </button>
      </th>
    );
  };

  const ack = (id: string) => {
    setAcks({ ...acks, [id]: { at: clock(), pending: offline } });
    setMsg(`${id} marked as handled.`);
  };
  const refresh = () => {
    setSpin((n) => n + 1);
    if (demo === 'error' || demo === 'loading') return setDemo('live');
    if (offline) return setMsg('Still offline. Positions will update when the connection is back.');
    setSince(0);
    setMsg('Positions updated.');
  };
  const soon = (label: string) => setMsg(`${label} isn’t part of this demo. Everything on the Dispatch board works.`);

  const freshness = demo === 'loading' ? 'Loading positions…'
    : demo === 'error' ? 'No positions loaded'
    : offline ? `Positions from ${LAST_GOOD}, not updating`
    : `Positions updated ${since} s ago`;
  const stale = offline || demo === 'error';

  const regionNote = (what: string, empty: string, rows = 3): ReactNode =>
    demo === 'loading' ? <><Skeleton rows={rows} /><p className="visually-hidden">Loading {what}…</p></>
    : demo === 'error' ? <p className="f-state"><CloudOff className="f-icon" aria-hidden />Couldn’t load {what}. See the message above.</p>
    : demo === 'empty' ? <p className="f-state"><Truck className="f-icon" aria-hidden />{empty}</p>
    : null;

  // The rest of the shift, under the queue: each number opens the matching filter in All vehicles.
  const tally: [Filter, string][] = [['onplan', 'On plan'], ['depot', 'At depot'], ['all', 'All vehicles']];
  // The queue's headline is its own count, set large: it is the first thing a dispatcher looks for.
  const tone = !hasData ? '' : critOpen ? 'crit' : openCount ? 'warn' : 'clear';
  const inline = wide && selected;

  return (
    <div className="fleet f-app">
      <a className="skip" href="#fleet-main">Skip to dashboard</a>
      <DemoBar>
        <label className="f-demo-state">
          Show state
          <select value={demo} onChange={(e) => { setDemo(e.target.value as DemoState); setSince(4); }}>
            <option value="live">Live data</option>
            <option value="loading">Loading</option>
            <option value="empty">Empty shift</option>
            <option value="error">Load error</option>
            <option value="offline">Offline</option>
          </select>
        </label>
      </DemoBar>

      <header className="f-top">
        <Wordmark />
        <MainNav className="f-topnav" onSoon={soon} />
        <button type="button" className="f-btn f-btn--ghost f-btn--icon f-bell" title="Needs attention"
          aria-label={hasData ? `Needs attention: ${openCount} open` : 'Needs attention'} onClick={() => { returnTo.current = null; setOpenId(null); requestAnimationFrame(() => jump('f-q-h')); }}>
          <Bell className="f-icon" aria-hidden />
          {hasData && openCount > 0 && <span className="f-bell-n" aria-hidden>{openCount}</span>}
        </button>
        <UserMenu />
      </header>

      <main id="fleet-main">
        <div className="f-work">
          <div className="f-triage">
            <div className="f-head">
              <div className="f-head-title">
                <h1 tabIndex={-1}>{DEPOT.name}</h1>
                <button type="button" className="f-btn f-btn--secondary f-btn--small" onClick={refresh}>
                  <RefreshCw key={spin} className={spin ? 'f-icon f-spin-once' : 'f-icon'} aria-hidden />
                  {demo === 'error' ? 'Try again' : 'Refresh'}
                </button>
              </div>
              <ShiftBar />
              <p className={stale ? 'f-fresh f-stale' : 'f-fresh'}>
                {stale ? <TriangleAlert className="f-icon" aria-hidden /> : hasData && <span className="f-live" aria-hidden />}
                {freshness}
              </p>
            </div>

            {demo === 'error' && (
              <div className="f-callout f-callout--critical f-banner" role="alert">
                <OctagonAlert className="f-icon" aria-hidden />
                <div>
                  <p className="f-callout-title">Couldn’t reach the tracking service</p>
                  <p>No vehicle data has loaded. Check the connection, then choose Try again. If it keeps failing, call the IT service desk on 0300 555 0142.</p>
                </div>
              </div>
            )}
            {offline && (
              <div className="f-callout f-callout--warning f-banner" role="status">
                <WifiOff className="f-icon" aria-hidden />
                <div>
                  <p className="f-callout-title">You’re offline</p>
                  <p>Showing positions from {LAST_GOOD}; they’ll update when the connection is back. Calls to drivers still work, and anything you mark as handled is saved on this device.</p>
                </div>
              </div>
            )}

            {inline ? (
              <InlineDetail v={selected} ack={acks[selected.id]} offline={offline} onAck={ack} onBack={() => setOpenId(null)} />
            ) : (
              <section className="f-queue" aria-labelledby="f-q-h" aria-busy={demo === 'loading'}>
                <h2 id="f-q-h" tabIndex={-1} className={`f-q-title${tone ? ` f-q-title--${tone}` : ''}`}>
                  {hasData
                    ? <><span className="f-big">{openCount}</span><span className="f-q-label">
                        {openCount === 1 ? 'vehicle needs attention' : 'vehicles need attention'}
                        <span className="f-q-sub">{critOpen} critical · {openCount - critOpen} warning{openCount - critOpen === 1 ? '' : 's'}</span>
                      </span></>
                    : 'Needs attention'}
                </h2>
                {regionNote('exceptions', 'No vehicles have started this shift yet, so there’s nothing to watch. Exceptions appear here as soon as a driver finishes their pre-trip check.')
                  ?? (exceptions.length === 0
                    ? <p className="f-state"><CircleCheck className="f-icon" aria-hidden />Nothing needs attention. All {vehicles.length} vehicles are on plan.</p>
                    // Not paged on purpose: open exceptions are the point of the screen and must never sit on page 2.
                    : <ul className="f-list f-list--queue">{exceptions.map((v) => (
                        <li key={v.id}><VehicleButton v={v} ack={acks[v.id]} since={since} dialog={!wide} onOpen={open} /></li>
                      ))}</ul>)}
              </section>
            )}

            {demo === 'loading' ? <div className="f-skeleton f-skeleton--strip" aria-hidden="true"><span /></div>
              : hasData && (
                <ul className="f-tally" aria-label="Rest of the shift">
                  {tally.map(([f, label]) => (
                    <li key={f}>
                      <button type="button" className="f-tally-btn" onClick={() => { narrow(f, ''); jump('f-a-h'); }}>
                        <span className="f-tally-n">{count(f)}</span>
                        <span className="f-tally-label">{label}<span className="visually-hidden">. Show in All vehicles</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <section className="f-mapwrap" aria-labelledby="f-m-h" aria-busy={demo === 'loading'}>
            <h2 id="f-m-h" className="f-map-h">Map</h2>
            {regionNote('the map', 'No vehicles on the road yet.', 0) ?? <FleetMap vehicles={vehicles} acks={acks} selected={openId} onOpen={open} />}
          </section>
        </div>

        <section className="f-all" aria-labelledby="f-a-h" aria-busy={demo === 'loading'}>
          <div className="f-all-head">
            <h2 id="f-a-h" tabIndex={-1}>All vehicles</h2>
            {hasData && <span className="f-count">{vehicles.length}</span>}
          </div>
          {regionNote('vehicles', 'No vehicles are checked out on this shift yet. They appear here when a driver starts their pre-trip check.', 5) ?? (
            <>
              <div className="f-tools">
                <div className="f-field f-search">
                  <label htmlFor="f-q">Search by unit, plate, driver, or route</label>
                  <div className="f-input-group">
                    <Search className="f-icon f-input-lead" aria-hidden />
                    <input id="f-q" ref={searchRef} type="search" value={query} onChange={(e) => narrow(filter, e.target.value)} autoComplete="off" spellCheck={false} />
                    {query && (
                      <button type="button" className="f-btn f-btn--ghost f-btn--icon f-input-action" aria-label="Clear search" title="Clear search"
                        onClick={() => { narrow(filter, ''); searchRef.current?.focus(); }}>
                        <X className="f-icon" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                <div className="f-segments" role="group" aria-label="Filter vehicles">
                  {FILTERS.map(([f, label]) => (
                    <button key={f} type="button" className="f-segment" aria-pressed={filter === f} onClick={() => narrow(f, query)}>
                      {label} <span className="f-segment-n">{count(f)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 ? (
                <p className="f-state">
                  <Search className="f-icon" aria-hidden />
                  <span>
                    No vehicles match “{query}”{filter !== 'all' && ' with this filter'}.{' '}
                    <button type="button" className="f-linkbtn" onClick={() => narrow('all', '')}>Clear search and filter</button>
                  </span>
                </p>
              ) : (
                <>
                  <div className="f-phone">
                    <ul className="f-list" ref={listRef}>{phoneRows.map((v) => (
                      <li key={v.id}><VehicleButton v={v} ack={acks[v.id]} since={since} dialog onOpen={open} /></li>
                    ))}</ul>
                    <div className="f-foot">
                      <p aria-live="polite">Showing {phoneRows.length} of {shown.length} vehicles</p>
                      {phoneRows.length < shown.length && (
                        <button type="button" className="f-btn f-btn--secondary f-btn--block"
                          onClick={() => { focusFrom.current = phoneRows.length; setMore(more + SIZES[0]); }}>
                          <ChevronDown className="f-icon" aria-hidden />Load {Math.min(SIZES[0], shown.length - phoneRows.length)} more
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="f-desk">
                    <div className="f-table-scroll" role="region" aria-labelledby="f-a-h" tabIndex={0}>
                      <table className="f-table">
                        <thead>
                          <tr>
                            {sortHead('unit', 'Unit')}{sortHead('status', 'Status')}{sortHead('driver', 'Driver')}
                            <th scope="col">Route and next stop</th>
                            {sortHead('eta', 'ETA', true)}
                            <th scope="col" className="f-num">Window</th>
                            {sortHead('ping', 'Last position', true)}{sortHead('speed', 'Speed', true)}
                          </tr>
                        </thead>
                        <tbody>{pageRows.map((v) => (
                          // Row click is a mouse shortcut; the unit button is the keyboard and screen reader path.
                          <tr key={v.id} className={openId === v.id ? 'f-tr-on' : undefined}
                            onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) open(v.id); }}>
                            <th scope="row">
                              <button type="button" className="f-linkbtn" aria-haspopup={wide ? undefined : 'dialog'} onClick={() => open(v.id)}>{v.id}</button>
                              <span className="f-plate">{v.plate}</span>
                            </th>
                            <td><Status v={v} ack={acks[v.id]} /></td>
                            <td><span className="f-person"><Avatar name={v.driver} />{v.driver}</span></td>
                            <td>{v.route}<span className="f-sub">{v.nextStop}</span></td>
                            <td className="f-num">
                              {v.eta}
                              {lateBy(v) > 0 && <span className="f-delta">+{lateBy(v)} min<span className="visually-hidden"> after the window closes</span></span>}
                            </td>
                            <td className="f-num">{v.window}</td>
                            <td className="f-num">{age(v.pingSec + since)}</td>
                            <td className="f-num">{v.speed} km/h</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="f-foot f-foot--table">
                      <p aria-live="polite">Showing {first + 1}–{first + pageRows.length} of {shown.length} vehicles</p>
                      <label className="f-size">
                        Rows per page
                        <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>
                          {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                      <Pagination page={cur} pages={pages} onPage={setPage} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>

      <MainNav className="f-tabbar" onSoon={soon} />
      <p role="status" className={msg ? 'f-toast f-toast--on' : 'f-toast'}>{msg}</p>
      {/* Below desktop width the detail is a sheet (phones) or side panel (tablets); on desktop it opens in the triage pane. */}
      <Drawer v={wide ? null : selected} ack={openId ? acks[openId] : undefined} offline={offline} onAck={ack}
        onClose={() => { if (!matchMedia(WIDE).matches) setOpenId(null); }} />
    </div>
  );
}

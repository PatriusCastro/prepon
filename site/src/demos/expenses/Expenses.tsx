import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, CircleCheck, CircleX, Clock, CloudUpload, OctagonAlert, Receipt,
  RotateCw, Search, TriangleAlert, WifiOff, X, type LucideIcon,
} from 'lucide-react';
import { Link } from '../../router';
import { useOnline } from '../useOnline';
import './expenses.css';

// ---------- data (made up; Ashby & Lowe is not a real company) ----------

type Status = 'Pending' | 'Approved' | 'Rejected';
type Claim = {
  id: number; who: string; team: string; what: string; category: string; merchant: string;
  amount: number; submitted: Date; receipt: boolean; flag?: string; status: Status; reason?: string; queued?: boolean;
};

const PEOPLE = [['Dana Reyes', 'Sales · CC-410'], ['Omar Haddad', 'Operations · CC-220'], ['Lena Fischer', 'Consulting · CC-330'], ['Tomas Ruiz', 'Engineering · CC-150'], ['Priya Nair', 'Marketing · CC-510']];
const ITEMS = [
  ['Client dinner', 'Meals and entertainment', 'The Grain Store, Leeds'],
  ['Train to Leeds', 'Travel', 'LNER'],
  ['Hotel, 2 nights', 'Accommodation', 'Park Plaza, Leeds'],
  ['Software licence', 'Software', 'Figma'],
  ['Taxi', 'Travel', 'Addison Lee'],
];
const TODAY = new Date(2026, 10, 12);

const CLAIMS: Claim[] = Array.from({ length: 40 }, (_, i) => {
  const [who, team] = PEOPLE[i % 5];
  const [what, category, merchant] = ITEMS[i % 5];
  const amount = [184.2, 96.5, 412.0, 59.99, 23.4][i % 5] + i;
  const receipt = i % 7 !== 3;
  const status = (['Pending', 'Approved', 'Rejected', 'Pending'] as const)[i % 4];
  const flag = !receipt ? 'No receipt attached'
    : i % 5 === 0 && amount > 150 ? 'Over the £150 client dinner limit'
    : i % 5 === 2 && amount / 2 > 180 ? 'Over the £180 a night hotel limit' : undefined;
  return {
    id: 1040 + i, who, team, what, category, merchant, amount, receipt, flag, status,
    submitted: new Date(2026, 10, 12 - (i % 13)),
    reason: status === 'Rejected' ? 'Please attach an itemised receipt, not the card slip.' : undefined,
  };
});

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format;
const short = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const long = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const daysAgo = (d: Date) => Math.round((+TODAY - +d) / 864e5);
const first = (name: string) => name.split(' ')[0];

type View = 'Pending' | 'Approved' | 'Rejected' | 'All';
const VIEWS: View[] = ['Pending', 'Approved', 'Rejected', 'All'];
const STATUS_ICON: Record<Status, LucideIcon> = { Pending: Clock, Approved: CircleCheck, Rejected: CircleX };
const PAGE = 10;

// Phones get "Load more"; from 768px the list pages.
const wideQuery = matchMedia('(min-width: 48rem)');
const useWide = () => useSyncExternalStore(
  (cb) => { wideQuery.addEventListener('change', cb); return () => wideQuery.removeEventListener('change', cb); },
  () => wideQuery.matches,
);

function readUrl() {
  const p = new URLSearchParams(location.search);
  const view = p.get('view') as View;
  return { view: VIEWS.includes(view) ? view : 'Pending' as View, q: p.get('q') ?? '', page: Math.max(1, Number(p.get('page')) || 1) };
}

// ---------- screen ----------

type Demo = 'ok' | 'loading' | 'error' | 'offline';
type Toast = { text: string; undo?: Claim };

export function Expenses() {
  const init = useRef(readUrl()).current;
  const [items, setItems] = useState(CLAIMS);
  const [view, setView] = useState<View>(init.view);
  const [q, setQ] = useState(init.q);
  const [page, setPage] = useState(init.page);
  const [demo, setDemo] = useState<Demo>('ok');
  const [openId, setOpenId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef(0);
  const wide = useWide();
  const online = useOnline();
  const offline = !online || demo === 'offline';

  // Keep view, search, and page in the URL so a refresh or a shared link lands in the same place.
  useEffect(() => {
    const p = new URLSearchParams();
    if (view !== 'Pending') p.set('view', view);
    if (q) p.set('q', q);
    if (page > 1) p.set('page', String(page));
    const s = p.toString();
    history.replaceState(null, '', location.pathname + (s ? `?${s}` : ''));
  }, [view, q, page]);

  // Decisions made offline wait on this device and go out when the connection returns.
  useEffect(() => {
    if (offline) return;
    const n = items.filter((x) => x.queued).length;
    if (!n) return;
    setItems((xs) => xs.map((x) => (x.queued ? { ...x, queued: false } : x)));
    say({ text: n === 1 ? 'Back online. 1 saved decision was sent.' : `Back online. ${n} saved decisions were sent.` });
  }, [offline]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 8000);
  };

  const needle = q.trim().toLowerCase();
  const matches = items.filter((x) => !needle || `${x.who} ${x.what} ${x.category} #${x.id} ${x.id}`.toLowerCase().includes(needle));
  const count = (v: View) => matches.filter((x) => v === 'All' || x.status === v).length;
  const list = matches.filter((x) => view === 'All' || x.status === view);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const at = Math.min(page, pages);
  const shown = wide ? list.slice((at - 1) * PAGE, at * PAGE) : list.slice(0, at * PAGE);
  const pending = items.filter((x) => x.status === 'Pending');

  const decide = (c: Claim, status: Status, reason?: string) => {
    // Focus moves to the next claim, since this row leaves the Pending list.
    const next = shown[shown.findIndex((x) => x.id === c.id) + 1] ?? shown[shown.findIndex((x) => x.id === c.id) - 1];
    setItems((xs) => xs.map((x) => (x.id === c.id ? { ...x, status, reason, queued: offline } : x)));
    setOpenId(null);
    setRejectId(null);
    const verb = status === 'Approved' ? 'Approved' : 'Rejected';
    say({ text: `${verb} #${c.id}, ${c.who}, ${money(c.amount)}.${offline ? ' Saved on this device; it will send when you’re back online.' : ''}`, undo: c });
    requestAnimationFrame(() => (document.getElementById(next ? `ex-open-${next.id}` : 'ex-list-h') as HTMLElement | null)?.focus());
  };

  const undo = (c: Claim) => {
    setItems((xs) => xs.map((x) => (x.id === c.id ? c : x)));
    say({ text: `Undone. #${c.id} is back in Pending.` });
  };

  const choose = (v: View) => { setView(v); setPage(1); };
  const open = items.find((x) => x.id === openId);
  const rejecting = items.find((x) => x.id === rejectId);

  return (
    <div className="expenses">
      <div className="ex-demobar">
        <div className="ex-wrap ex-demobar-row">
          <p>Prepon demo. Ashby &amp; Lowe and these claims are made up, and nothing leaves this browser.</p>
          <label className="ex-demo-state">
            Show
            <select value={demo} onChange={(e) => setDemo(e.target.value as Demo)}>
              <option value="ok">Claims</option>
              <option value="loading">Loading</option>
              <option value="error">Server error</option>
              <option value="offline">Act as offline</option>
            </select>
          </label>
          <Link to="/demo" className="ex-demobar-back"><ArrowLeft aria-hidden />Back to demo screens</Link>
        </div>
      </div>

      <header className="ex-top">
        <div className="ex-wrap ex-top-row">
          <p className="ex-brand"><span className="ex-mark" aria-hidden>A&amp;L</span>Ashby &amp; Lowe <span className="ex-brand-app">Expenses</span></p>
          <p className="ex-user"><span className="ex-avatar" aria-hidden>MK</span><span className="visually-hidden">Signed in as </span><span className="ex-user-name">Maya Kerr</span></p>
        </div>
      </header>

      <main className="ex-wrap ex-main">
        <h1 tabIndex={-1}>Expense approvals</h1>
        <p className="ex-lede">
          {pending.length === 0 ? 'Nothing is waiting for you.'
            : <><strong>{pending.length} claims</strong> waiting for your decision, <strong>{money(pending.reduce((s, x) => s + x.amount, 0))}</strong> in total.</>}
        </p>

        {offline && (
          <div className="ex-banner ex-banner--warn" role="status">
            <WifiOff aria-hidden />
            <p>You’re offline. You can keep deciding: decisions are saved on this device and sent when you’re back online.</p>
          </div>
        )}

        <div className="ex-tools">
          <div className="ex-tabs" role="group" aria-label="Show claims">
            {VIEWS.map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => choose(v)}>
                {v}<span className="ex-count">{count(v)}</span>
              </button>
            ))}
          </div>
          <div className="ex-search">
            <label htmlFor="ex-q">Search claims</label>
            <div className="ex-search-box">
              <Search aria-hidden />
              <input id="ex-q" type="search" value={q} placeholder="Name, item, or claim number"
                onChange={(e) => { setQ(e.target.value); setPage(1); }} />
              {q && <button type="button" className="ex-icon-btn" onClick={() => { setQ(''); document.getElementById('ex-q')?.focus(); }} aria-label="Clear search"><X aria-hidden /></button>}
            </div>
          </div>
        </div>

        <section className={`ex-list${view === 'Pending' ? ' ex-list--pending' : ''}`} aria-labelledby="ex-list-h" aria-busy={demo === 'loading' || undefined}>
          <h2 id="ex-list-h" tabIndex={-1} className="visually-hidden">{view === 'All' ? 'All claims' : `${view} claims`}</h2>
          {demo === 'loading' ? <Skeleton />
            : demo === 'error' ? (
              <State icon={OctagonAlert} tone="crit" title="Claims didn’t load">
                <p>There’s a problem on our side. Your earlier decisions are safe.</p>
                <button type="button" className="ex-btn ex-btn--secondary" onClick={() => setDemo('ok')}><RotateCw aria-hidden />Try again</button>
              </State>
            ) : list.length === 0 ? (
              needle ? (
                <State icon={Search} title={`No ${view === 'All' ? '' : view.toLowerCase() + ' '}claims match “${q.trim()}”`}>
                  <p>Check the spelling, or search by claim number.</p>
                  <button type="button" className="ex-btn ex-btn--secondary" onClick={() => setQ('')}>Clear search</button>
                </State>
              ) : (
                <State icon={CircleCheck} tone="ok" title={view === 'Pending' ? 'You’re all caught up' : `No ${view.toLowerCase()} claims`}>
                  <p>{view === 'Pending' ? 'New claims will appear here as people submit them.' : 'Claims appear here once they’re decided.'}</p>
                </State>
              )
            ) : (
              <>
                <ul>
                  {shown.map((c) => (
                    <Row key={c.id} c={c} view={view} onOpen={() => setOpenId(c.id)} onApprove={() => decide(c, 'Approved')} onReject={() => setRejectId(c.id)} />
                  ))}
                </ul>
                <Pager wide={wide} total={list.length} page={at} pages={pages} shownCount={shown.length} setPage={setPage} />
              </>
            )}
        </section>
      </main>

      <Sheet open={!!open} onClose={() => setOpenId(null)} className="ex-detail" label={open && `Claim #${open.id}`}>
        {open && <Detail c={open} onApprove={() => decide(open, 'Approved')} onReject={() => setRejectId(open.id)} close={() => setOpenId(null)} />}
      </Sheet>

      <Sheet open={!!rejecting} onClose={() => setRejectId(null)} className="ex-confirm" label={rejecting && `Reject claim #${rejecting.id}`}>
        {rejecting && <RejectForm c={rejecting} onReject={(r) => decide(rejecting, 'Rejected', r)} cancel={() => setRejectId(null)} />}
      </Sheet>

      <div className="ex-toast-region" role="status" aria-live="polite" onFocus={() => clearTimeout(toastTimer.current)}>
        {toast && (
          <div className="ex-toast">
            <Check aria-hidden />
            <p>{toast.text}</p>
            {toast.undo && <button type="button" className="ex-toast-btn" onClick={() => undo(toast.undo!)}>Undo</button>}
            <button type="button" className="ex-icon-btn ex-toast-close" onClick={() => setToast(null)} aria-label="Dismiss"><X aria-hidden /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- parts ----------

function Pill({ c }: { c: Claim }) {
  const Icon = c.queued ? CloudUpload : STATUS_ICON[c.status];
  return <span className={`ex-pill ex-pill--${c.status.toLowerCase()}`}><Icon aria-hidden />{c.status}{c.queued && ', not sent yet'}</span>;
}

function Row({ c, view, onOpen, onApprove, onReject }: { c: Claim; view: View; onOpen: () => void; onApprove: () => void; onReject: () => void }) {
  const name = <span className="visually-hidden"> claim #{c.id} from {c.who}, {money(c.amount)}</span>;
  return (
    <li className="ex-row">
      <button type="button" id={`ex-open-${c.id}`} className="ex-row-open" onClick={onOpen}>
        <span className="ex-row-who">{c.who}</span>
        <span className="ex-row-amount">{money(c.amount)}</span>
        <span className="ex-row-meta">{c.what} · {c.category} · {short(c.submitted)} · #{c.id}</span>
        {/* In the Pending view every row would say "Pending", so the pill only shows when it tells you something. */}
        {(view !== 'Pending' || c.status !== 'Pending' || c.queued) && <span className="ex-row-status"><Pill c={c} /></span>}
        {c.flag && <span className="ex-flag"><TriangleAlert aria-hidden />{c.flag}</span>}
      </button>
      <div className="ex-row-actions">
        {c.status === 'Pending' && <>
          <button type="button" className="ex-btn ex-btn--secondary ex-btn--sm" onClick={onReject}>Reject{name}</button>
          <button type="button" className="ex-btn ex-btn--primary ex-btn--sm" onClick={onApprove}><Check aria-hidden />Approve{name}</button>
        </>}
      </div>
    </li>
  );
}

function Pager({ wide, total, page, pages, shownCount, setPage }: { wide: boolean; total: number; page: number; pages: number; shownCount: number; setPage: (n: number) => void }) {
  if (!wide) {
    return (
      <div className="ex-pager">
        <p>Showing {shownCount} of {total}</p>
        {shownCount < total && <button type="button" className="ex-btn ex-btn--secondary ex-btn--block" onClick={() => setPage(page + 1)}>Load {Math.min(PAGE, total - shownCount)} more</button>}
      </div>
    );
  }
  const from = (page - 1) * PAGE + 1;
  return (
    <div className="ex-pager">
      <p>Showing {from}–{Math.min(page * PAGE, total)} of {total}</p>
      {pages > 1 && (
        <nav aria-label="Pages">
          <button type="button" className="ex-icon-btn" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft aria-hidden /></button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" className="ex-page-btn" aria-current={page === i + 1 ? 'page' : undefined} onClick={() => setPage(i + 1)}>
              <span className="visually-hidden">Page </span>{i + 1}
            </button>
          ))}
          <button type="button" className="ex-icon-btn" disabled={page === pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight aria-hidden /></button>
        </nav>
      )}
    </div>
  );
}

function Detail({ c, onApprove, onReject, close }: { c: Claim; onApprove: () => void; onReject: () => void; close: () => void }) {
  return <>
    <div className="ex-sheet-head">
      <h2>{c.what}</h2>
      <button type="button" className="ex-icon-btn" onClick={close} aria-label="Close"><X aria-hidden /></button>
    </div>
    <div className="ex-sheet-body">
      <p className="ex-detail-amount">{money(c.amount)}</p>
      <p className="ex-detail-who">{c.who} · {c.team}</p>
      <Pill c={c} />
      {c.flag && <div className="ex-banner ex-banner--warn"><TriangleAlert aria-hidden /><p><strong>Policy check:</strong> {c.flag}.</p></div>}
      {c.reason && <div className="ex-banner ex-banner--crit"><CircleX aria-hidden /><p><strong>Reason given:</strong> {c.reason}</p></div>}
      <dl className="ex-facts">
        <div><dt>Claim</dt><dd>#{c.id}</dd></div>
        <div><dt>Submitted</dt><dd>{long(c.submitted)} ({daysAgo(c.submitted) === 0 ? 'today' : `${daysAgo(c.submitted)} days ago`})</dd></div>
        <div><dt>Category</dt><dd>{c.category}</dd></div>
        <div><dt>Merchant</dt><dd>{c.merchant}</dd></div>
        <div><dt>Cost centre</dt><dd>{c.team}</dd></div>
      </dl>
      <h3>Receipt</h3>
      {c.receipt ? (
        <figure className="ex-receipt">
          <Receipt aria-hidden />
          <div>
            <p className="ex-receipt-m">{c.merchant}</p>
            <p>{long(c.submitted)}</p>
            <p className="ex-receipt-t"><span>Total</span><span>{money(c.amount)}</span></p>
          </div>
          <figcaption className="visually-hidden">Receipt from {c.merchant}, total {money(c.amount)}</figcaption>
        </figure>
      ) : <p className="ex-muted">{first(c.who)} didn’t attach a receipt.</p>}
    </div>
    {c.status === 'Pending' && (
      <div className="ex-sheet-bar">
        <button type="button" className="ex-btn ex-btn--secondary" onClick={onReject}>Reject</button>
        <button type="button" className="ex-btn ex-btn--primary" onClick={onApprove}><Check aria-hidden />Approve {money(c.amount)}</button>
      </div>
    )}
  </>;
}

function RejectForm({ c, onReject, cancel }: { c: Claim; onReject: (reason: string) => void; cancel: () => void }) {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setErr(`Tell ${first(c.who)} why, so they can fix the claim or resubmit it.`); document.getElementById('ex-reason')?.focus(); return; }
    onReject(reason.trim());
  };
  return (
    <form onSubmit={submit} noValidate>
      <div className="ex-sheet-head">
        <h2>Reject claim #{c.id}?</h2>
        <button type="button" className="ex-icon-btn" onClick={cancel} aria-label="Cancel"><X aria-hidden /></button>
      </div>
      <div className="ex-sheet-body">
        <p>{c.who} · {c.what} · <strong>{money(c.amount)}</strong></p>
        <div className={`ex-field${err ? ' ex-field--error' : ''}`}>
          <label htmlFor="ex-reason">Reason for rejecting</label>
          <p id="ex-reason-hint" className="ex-muted">{first(c.who)} gets this by email.</p>
          {err && <p id="ex-reason-err" className="ex-error"><OctagonAlert aria-hidden />{err}</p>}
          <textarea id="ex-reason" rows={3} value={reason} onChange={(e) => { setReason(e.target.value); if (err) setErr(''); }}
            aria-invalid={err ? true : undefined} aria-describedby={`ex-reason-hint${err ? ' ex-reason-err' : ''}`} />
        </div>
      </div>
      <div className="ex-sheet-bar">
        <button type="button" className="ex-btn ex-btn--quiet" onClick={cancel}>Keep pending</button>
        <button type="submit" className="ex-btn ex-btn--danger">Reject claim</button>
      </div>
    </form>
  );
}

function Sheet({ open, onClose, className, label, children }: { open: boolean; onClose: () => void; className: string; label?: string | false; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`ex-sheet ${className}`} aria-label={label || undefined} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="ex-sheet-inner">{children}</div>
    </dialog>
  );
}

function State({ icon: Icon, tone, title, children }: { icon: LucideIcon; tone?: 'ok' | 'crit'; title: string; children: ReactNode }) {
  return (
    <div className={`ex-state${tone ? ` ex-state--${tone}` : ''}`} role={tone === 'crit' ? 'alert' : undefined}>
      <Icon aria-hidden />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Skeleton() {
  return <>
    <p className="visually-hidden" role="status">Loading claims</p>
    <ul aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <li key={i} className="ex-row ex-skel"><span /><span /></li>)}
    </ul>
  </>;
}

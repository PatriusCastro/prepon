import {
  createContext, useContext, useEffect, useRef, useState,
  type ChangeEvent, type FocusEvent, type FormEvent, type InputHTMLAttributes, type MouseEvent, type ReactNode, type Ref,
} from 'react';
import {
  ArrowRight, Building2, Camera, Check, ChevronLeft, ChevronUp, CircleCheck, Clock, Copy, FileText, Flame, Landmark,
  Languages, ListChecks, LoaderCircle, Mail, MapPin, OctagonAlert, Phone, Printer, Save, Scissors, Smartphone, Store,
  Trash2, UtensilsCrossed, Wallet, WifiOff, type LucideIcon,
} from 'lucide-react';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import { Link, navigate } from '../../router';
import { DemoBar } from '../DemoBar';
import { useOnline } from '../useOnline';
import {
  BARANGAYS, BIZ_TYPES, CITY, DOC_IDS, EMPTY, MAX_FILE, PAY_METHODS, STEPS, digits, fees, firstIncomplete, fmtMobile,
  fmtSize, normMobile, selfCheck, validate,
  type DocId, type Draft, type Errors, type StepSlug, type Upload,
} from './data';
import { STRINGS, type Lang, type Strings } from './i18n';
import { BASE, LANG_KEY, loadLang, permitTitle } from './title';
import './permit.css';

const DRAFT_KEY = 'marilag-permit-draft';
const DONE_KEY = 'marilag-permit-submitted';
const READY_KEY = 'marilag-permit-ready';
const STAGES = ['submitted', 'assessment', 'payment', 'inspection', 'release'] as const;
const READY_ITEMS = ['reg', 'brgy', 'ctc', 'place', 'id'] as const;

const TYPE_ICON: Record<string, LucideIcon> = { sarisari: Store, food: UtensilsCrossed, online: Smartphone, shop: Scissors };
const PAY_ICON: Record<string, LucideIcon> = { ewallet: Wallet, bank: Landmark, otc: Building2 };

(globalThis as { __permitCheck?: () => string }).__permitCheck = selfCheck;

type Outcome = 'ok' | 'error' | 'offline';
type Submitted = { ref: string; mobile: string; pay: string; total?: number; at: string; stage: number };
type Update = (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;

// ---------- storage ----------

const read = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
};

function loadDraft(): Draft {
  const d: Draft = { ...EMPTY, ...read<Partial<Draft>>(DRAFT_KEY, {}) };
  d.docs = { ...EMPTY.docs, ...d.docs };
  // An upload cut off by closing the page never finished, so drop it rather than show it stuck.
  for (const k of DOC_IDS) if (d.docs[k]?.status === 'uploading') d.docs[k] = null;
  return d;
}

// ---------- language ----------

const Ctx = createContext<{ t: Strings; lang: Lang }>({ t: STRINGS.en, lang: 'en' });
const useT = () => useContext(Ctx);

const peso = (n: number, t: Strings) => new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'PHP' }).format(n);
const fmtTime = (iso: string, t: Strings) => new Date(iso).toLocaleTimeString(t.locale, { hour: 'numeric', minute: '2-digit' });
const fmtDate = (d: Date | string, t: Strings, weekday = false) =>
  new Date(typeof d === 'string' && d.length === 10 ? `${d}T12:00` : d)
    .toLocaleDateString(t.locale, { ...(weekday ? { weekday: 'long' as const } : {}), month: 'long', day: 'numeric', year: 'numeric' });

function addWorkingDays(from: string, n: number) {
  const d = new Date(from);
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) n--; }
  return d;
}

// ---------- shell ----------

export function Permit({ path }: { path: string }) {
  const slug = path.slice(BASE.length + 1);
  const i = STEPS.indexOf(slug as StepSlug);
  const [lang, setLang] = useState<Lang>(loadLang);
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [sub, setSub] = useState<Submitted | null>(() => read(DONE_KEY, null));
  const [outcome, setOutcome] = useState<Outcome>('ok');
  const online = useOnline();
  const offline = !online || outcome === 'offline';
  const t = STRINGS[lang];

  useEffect(() => { if (draft.savedAt) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }, [draft]);
  useEffect(() => { localStorage.setItem(LANG_KEY, lang); document.title = permitTitle(path); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const update: Update = (patch) =>
    setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch), savedAt: new Date().toISOString() }));
  const clear = () => { localStorage.removeItem(DRAFT_KEY); setDraft(EMPTY); };
  const saveSub = (s: Submitted) => { localStorage.setItem(DONE_KEY, JSON.stringify(s)); setSub(s); };

  return (
    <Ctx.Provider value={{ t, lang }}>
      <div className="permit" lang={lang} data-page={i >= 0 ? 'step' : slug === 'done' ? 'done' : 'start'}>
        <a className="skip" href="#permit-main">{t.skip}</a>
        <DemoBar wrap="p-wrap" note="Marilag City is made up. Nothing you enter leaves your browser.">
          <label className="demobar-control">
            On submit
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
              <option value="ok">It’s sent</option>
              <option value="error">Server error</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          {slug === 'done' && sub && sub.stage < STAGES.length && (
            <button type="button" className="demobar-btn" onClick={() => saveSub({ ...sub, stage: sub.stage + 1 })}>Move status forward</button>
          )}
        </DemoBar>

        <header className="p-top">
          <div className="p-wrap p-top-row">
            <Link to={BASE} className="p-brand">
              <Seal />
              <span className="p-brand-text">
                <span className="p-brand-city">{t.city}</span>
                <span className="p-brand-office">{t.office}</span>
              </span>
            </Link>
            <div className="p-lang" role="group" aria-label={t.language}>
              <Languages aria-hidden className="p-lang-icon" />
              {(['en', 'fil'] as const).map((l) => (
                <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                  <span className="p-lang-short" aria-hidden="true">{l === 'en' ? 'EN' : 'FIL'}</span>
                  <span className="p-lang-long">{l === 'en' ? 'English' : 'Filipino'}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-banig" aria-hidden="true" />
        </header>

        <div className="p-body">
          {i >= 0 ? <StepPage key={slug} i={i} path={path} draft={draft} update={update} offline={offline} outcome={outcome} onSent={(s) => { saveSub(s); clear(); }} />
            : slug === 'done' ? <Done sub={sub} />
            : <Start draft={draft} clear={clear} />}
        </div>

        <footer className="p-help">
          <div className="p-wrap">
            <h2>{t.help.title}</h2>
            <ul>
              <li><span className="p-help-icon"><Phone aria-hidden /></span><span><a href={CITY.phoneHref}>{t.help.call} {CITY.phone}</a><span className="p-hint">{t.help.hours}</span></span></li>
              <li><span className="p-help-icon"><Mail aria-hidden /></span><span><a href={`mailto:${CITY.email}`}>{t.help.email} {CITY.email}</a><span className="p-hint">{t.help.reply}</span></span></li>
              <li><span className="p-help-icon"><MapPin aria-hidden /></span><span><span className="p-help-place">{t.help.visit} {t.help.place}</span><span className="p-hint">{t.help.hours}</span></span></li>
            </ul>
          </div>
        </footer>
      </div>
    </Ctx.Provider>
  );
}

function Seal() {
  // Marilag City's mark: a mangrove (bakawan) over the bay, inside a gold ring. Invented for this demo; brand art, not an icon.
  return (
    <svg className="p-seal" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.75" className="p-seal-ring" />
      <circle cx="20" cy="20" r="15.5" className="p-seal-field" />
      <path d="M12.5 16.5c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5c0 1.6-1.4 2.5-3 2.5h-9c-1.6 0-3-.9-3-2.5z" className="p-seal-leaf" />
      <path d="M20 19v4M20 23c-2.5 0-4.5 1.5-5.5 4M20 23c2.5 0 4.5 1.5 5.5 4M20 23v4" className="p-seal-root" />
      <path d="M8.5 29.5c1.9-1.2 3.8-1.2 5.7 0s3.8 1.2 5.8 0 3.8-1.2 5.8 0 3.8 1.2 5.7 0" className="p-seal-wave" />
    </svg>
  );
}

// ---------- form parts ----------

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  const { t } = useT();
  return <p id={id} className="p-error"><OctagonAlert aria-hidden /><span><span className="visually-hidden">{t.errorPrefix}</span>{children}</span></p>;
}

const describe = (id: string, hint?: ReactNode, error?: string, extra?: string) =>
  [hint && `${id}-hint`, error && `${id}-err`, extra].filter(Boolean).join(' ') || undefined;

type TextProps = {
  name: string; label: string; hint?: ReactNode; error?: string; value: string; onChange: (v: string) => void;
  prefix?: string; ok?: ReactNode; short?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange' | 'prefix'>;

function Text({ name, label, hint, error, value, onChange, prefix, ok, short, ...rest }: TextProps) {
  const id = `p-${name}`;
  const input = (
    <input id={id} name={name} value={value} aria-invalid={error ? true : undefined}
      aria-describedby={describe(id, hint, error, ok && !error ? `${id}-ok` : undefined)}
      onChange={(e) => onChange(e.target.value)} {...rest} />
  );
  return (
    <div className={`p-field${error ? ' p-field--error' : ''}${short ? ' p-field--short' : ''}`}>
      <label htmlFor={id} className="p-label">{label}</label>
      {hint && <p id={`${id}-hint`} className="p-hint">{hint}</p>}
      {error && <ErrorText id={`${id}-err`}>{error}</ErrorText>}
      {prefix ? <div className="p-affix"><span className="p-affix-text" aria-hidden="true">{prefix}</span>{input}</div> : input}
      {ok && !error && <p id={`${id}-ok`} className="p-okline"><CircleCheck aria-hidden />{ok}</p>}
    </div>
  );
}

type Option = { id: string; label: string; hint?: string; icon?: LucideIcon };

function Choices({ name, legend, hint, error, inline, grid, options, value, onChange }: {
  name: string; legend: string; hint?: ReactNode; error?: string; inline?: boolean; grid?: boolean;
  options: Option[]; value: string; onChange: (v: string) => void;
}) {
  const id = `p-${name}`;
  return (
    <fieldset className={`p-field${error ? ' p-field--error' : ''}`} aria-describedby={describe(id, hint, error)}>
      <legend className="p-label">{legend}</legend>
      {hint && <p id={`${id}-hint`} className="p-hint">{hint}</p>}
      {error && <ErrorText id={`${id}-err`}>{error}</ErrorText>}
      <div className={`p-choices${inline ? ' p-choices--inline' : ''}${grid ? ' p-choices--grid' : ''}`}>
        {options.map((o, k) => (
          <label key={o.id} className="p-choice">
            <input type="radio" name={name} id={k === 0 ? id : undefined} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
            {o.icon && <span className="p-choice-icon"><o.icon aria-hidden /></span>}
            <span className="p-choice-text">{o.label}{o.hint && <span className="p-hint">{o.hint}</span>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

async function makeThumb(f: File) {
  if (!f.type.startsWith('image/')) return undefined;
  try {
    // A 112 px square crop, small enough to keep in the saved draft (about 5 KB) so previews survive a reload.
    const bmp = await createImageBitmap(f);
    const c = document.createElement('canvas');
    c.width = c.height = 112;
    const s = 112 / Math.min(bmp.width, bmp.height);
    c.getContext('2d')!.drawImage(bmp, (112 - bmp.width * s) / 2, (112 - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return undefined; } // HEIC and other formats the browser can't decode: show the file icon instead.
}

function FileField({ k, label, hint, error, value, offline, update }: {
  k: DocId; label: string; hint: string; error?: string; value: Upload | null; offline: boolean; update: Update;
}) {
  const { t } = useT();
  const id = `p-doc-${k}`;
  const [pickErr, setPickErr] = useState('');
  const err = pickErr || error;
  const setDoc = (fn: (u: Upload | null) => Upload | null) => update((d) => ({ docs: { ...d.docs, [k]: fn(d.docs[k]) } }));

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (offline) return setPickErr(t.errors.offlineUpload);
    const pdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    if (!pdf && !/^image\//.test(f.type) && !/\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)) return setPickErr(t.errors.badType(f.name));
    if (f.size > MAX_FILE) return setPickErr(t.errors.tooBig(f.name, fmtSize(f.size)));
    setPickErr('');
    setDoc(() => ({ name: f.name, size: f.size, pdf, status: 'uploading' }));
    const thumb = await makeThumb(f);
    const same = (u: Upload | null) => u?.name === f.name && u.size === f.size;
    if (thumb) setDoc((u) => (same(u) ? { ...u!, thumb } : u));
    // ponytail: simulated upload that keeps only the name and a thumbnail; a real portal posts the file here and reports progress.
    setTimeout(() => setDoc((u) => (same(u) ? { ...u!, status: 'done' } : u)), 1400);
  };

  const remove = () => {
    setDoc(() => null);
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  return (
    <div className={`p-field p-doc${err ? ' p-field--error' : ''}`}>
      <p className="p-label" id={`${id}-label`}>{label}</p>
      <p id={`${id}-hint`} className="p-hint">{hint}</p>
      {err && <ErrorText id={`${id}-err`}>{err}</ErrorText>}
      <div aria-live="polite">
        {value ? (
          <div className="p-file" data-status={value.status}>
            <span className="p-thumb">
              {value.thumb ? <img src={value.thumb} alt="" width={56} height={56} /> : <FileText aria-hidden />}
              {value.pdf && <span className="p-thumb-tag">{t.pdf}</span>}
            </span>
            <span className="p-file-text">
              <span className="p-file-name">{value.name}</span>
              <span className="p-file-meta">
                {fmtSize(value.size)} ·{' '}
                {value.status === 'uploading'
                  ? <><LoaderCircle className="p-spin" aria-hidden />{t.uploading}</>
                  : <><CircleCheck className="p-ok" aria-hidden />{t.uploaded}</>}
              </span>
              {value.status === 'uploading' && <span className="p-file-bar" aria-hidden="true"><span /></span>}
            </span>
            <button type="button" className="p-btn p-btn--quiet" onClick={remove}>
              <Trash2 aria-hidden />{t.remove}<span className="visually-hidden"> {label}</span>
            </button>
          </div>
        ) : (
          <label className="p-upload">
            <input type="file" id={id} className="visually-hidden" accept="image/*,application/pdf" onChange={pick}
              aria-labelledby={`${id}-label ${id}-btn`} aria-describedby={describe(id, hint, err)} aria-invalid={err ? true : undefined} />
            <Camera aria-hidden /><span id={`${id}-btn`}>{t.pick}</span>
          </label>
        )}
      </div>
    </div>
  );
}

type SummaryItem = { field?: string; to?: string; text: string };

function ErrorSummary({ items, innerRef }: { items: SummaryItem[]; innerRef: Ref<HTMLDivElement> }) {
  const { t } = useT();
  const jump = (e: MouseEvent, field: string) => {
    const el = document.getElementById(`p-${field}`);
    if (!el) return;
    e.preventDefault();
    // Bring the question's label into view too, not just the input.
    (el.closest('.p-field') ?? el).scrollIntoView({ block: 'start' });
    el.focus({ preventScroll: true });
  };
  return (
    <div className="p-summary" tabIndex={-1} ref={innerRef} aria-labelledby="p-summary-h">
      <h2 id="p-summary-h"><OctagonAlert aria-hidden />{t.fixN(items.length)}</h2>
      <ul>
        {items.map((it) => (
          <li key={it.field ?? it.to}>
            {it.to ? <Link to={it.to}>{it.text}</Link> : <a href={`#p-${it.field}`} onClick={(e) => jump(e, it.field!)}>{it.text}</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Banner({ tone, icon: Icon, title, children }: { tone: 'warn' | 'crit'; icon: LucideIcon; title?: string; children: ReactNode }) {
  return (
    <div className={`p-banner p-banner--${tone}`} role={tone === 'crit' ? 'alert' : 'status'}>
      <Icon aria-hidden />
      <div>{title && <p className="p-banner-title">{title}</p>}<p>{children}</p></div>
    </div>
  );
}

function FeeBreakdown({ draft }: { draft: Draft }) {
  const { t } = useT();
  const est = fees(draft);
  if (!est) return <p className="p-hint">{t.fee.pending}</p>;
  return (
    <div className="p-fees">
      <dl>
        {est.lines.map((l) => <div key={l.key}><dt>{t.fee.lines[l.key](l.n)}</dt><dd>{peso(l.amount, t)}</dd></div>)}
        <div className="p-fees-total"><dt>{t.fee.total}</dt><dd>{peso(est.total, t)}</dd></div>
      </dl>
      <p className="p-hint">{t.fee.note}</p>
    </div>
  );
}

// The five stages, used as a preview on the start page and as the live tracker after submitting.
function Stages({ stage, at }: { stage?: number; at?: string }) {
  const { t } = useT();
  const due = [0, 2, 4, 7, 10];
  return (
    <ol className="p-stages">
      {STAGES.map((s, k) => {
        const state = stage === undefined ? undefined : k < stage ? 'done' : k === stage ? 'now' : 'next';
        const [name, desc] = t.stages[s];
        return (
          <li key={s} data-state={state}>
            <span className="p-stage-dot" aria-hidden="true">{state === 'done' ? <Check /> : state === 'now' ? <Clock /> : k + 1}</span>
            <div className="p-stage-body">
              <p className="p-stage-name">
                {name}
                {state && <span className={`p-pill p-pill--${state}`}>{t.stageState[state]}</span>}
              </p>
              <p className="p-hint">{desc}</p>
              {at && state !== 'done' && k > 0 && <p className="p-stage-due">{t.expected(fmtDate(addWorkingDays(at, due[k]), t, true))}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- start page ----------

function Start({ draft, clear }: { draft: Draft; clear: () => void }) {
  const { t } = useT();
  const [ready, setReady] = useState<string[]>(() => read(READY_KEY, []));
  const toggle = (id: string) => setReady((r) => {
    const next = r.includes(id) ? r.filter((x) => x !== id) : [...r, id];
    localStorage.setItem(READY_KEY, JSON.stringify(next));
    return next;
  });
  const resumeAt = firstIncomplete(draft);
  const resumeTo = `${BASE}/${STEPS[resumeAt === -1 ? STEPS.length - 1 : resumeAt]}`;
  const startAgain = () => { if (confirm(t.start.confirmDelete)) clear(); };
  const n = READY_ITEMS.filter((x) => ready.includes(x)).length;
  const factIcons = [Clock, Save, Wallet];
  const typical = (b: (typeof BIZ_TYPES)[number]) => fees({ ...EMPTY, bizType: b, capital: '20000', workers: '1', sign: 'no' })!.total;

  return (
    <main id="permit-main" className="p-wrap p-start">
      <section className="p-intro" aria-labelledby="p-start-h">
        <h1 id="p-start-h" tabIndex={-1}>{t.start.title}</h1>
        <p className="p-lede">{t.start.lede}</p>
        <ul className="p-facts">
          {t.start.facts.map((f, k) => { const I = factIcons[k]; return <li key={f}><I aria-hidden />{f}</li>; })}
        </ul>
        {draft.savedAt ? (
          <div className="p-resume">
            <h2>{t.start.resumeTitle}</h2>
            <p>{t.start.resumeBody(draft.bizName.trim() || t.start.yourApp, `${fmtDate(draft.savedAt, t)}, ${fmtTime(draft.savedAt, t)}`)}</p>
            <div className="p-resume-actions">
              <Link to={resumeTo} className="p-btn p-btn--primary p-btn--lg p-btn--block-phone">{t.start.resume}<ArrowRight aria-hidden /></Link>
              <button type="button" className="p-btn p-btn--quiet" onClick={startAgain}><Trash2 aria-hidden />{t.start.startOver}</button>
            </div>
          </div>
        ) : (
          <Link to={`${BASE}/${STEPS[0]}`} className="p-btn p-btn--primary p-btn--lg p-btn--block-phone">{t.start.cta}<ArrowRight aria-hidden /></Link>
        )}
      </section>

      <section className="p-panel p-checklist" aria-labelledby="p-ready-h">
        <h2 id="p-ready-h"><ListChecks aria-hidden />{t.start.checklistTitle}</h2>
        <p className="p-hint">{t.start.checklistSub}</p>
        <div className="p-meter-row">
          <span className="p-meter" aria-hidden="true"><span style={{ transform: `scaleX(${n / READY_ITEMS.length})` }} /></span>
          <p role="status" className="p-meter-text">{t.start.ready(n, READY_ITEMS.length)}</p>
        </div>
        <ul className="p-ticks">
          {READY_ITEMS.map((id) => (
            <li key={id}>
              <label className="p-tick">
                <input type="checkbox" checked={ready.includes(id)} onChange={() => toggle(id)} />
                <span className="p-tick-text"><span className="p-tick-name">{t.docs[id]}</span><span className="p-hint">{t.docHints[id]}</span></span>
              </label>
            </li>
          ))}
          <li className="p-tick p-tick--info">
            <Flame aria-hidden />
            <span className="p-tick-text"><span className="p-tick-name">{t.start.fireTitle}</span><span className="p-hint">{t.start.fireBody}</span></span>
          </li>
        </ul>
        {n === READY_ITEMS.length && <p className="p-okline p-okline--block"><CircleCheck aria-hidden />{t.start.allReady}</p>}
      </section>

      <section className="p-start-fees" aria-labelledby="p-fees-h">
        <h2 id="p-fees-h">{t.start.feesTitle}</h2>
        <p>{t.start.feesBody}</p>
        <ul className="p-typical">
          {BIZ_TYPES.map((b) => {
            const I = TYPE_ICON[b];
            return <li key={b}><span className="p-typical-icon"><I aria-hidden /></span><span>{t.bizTypes[b][0]}</span><strong>{peso(typical(b), t)}</strong></li>;
          })}
        </ul>
        <p className="p-hint">{t.start.typicalNote}</p>
      </section>

      <section className="p-start-after" aria-labelledby="p-after-h">
        <h2 id="p-after-h">{t.start.afterTitle}</h2>
        <Stages />
      </section>
    </main>
  );
}

// ---------- steps ----------

function StepPage({ i, path, draft, update, offline, outcome, onSent }: {
  i: number; path: string; draft: Draft; update: Update; offline: boolean; outcome: Outcome; onSent: (s: Submitted) => void;
}) {
  const { t, lang } = useT();
  const step = STEPS[i];
  const isCheck = step === 'check';
  const [tries, setTries] = useState(0);
  const [blurred, setBlurred] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [sendErr, setSendErr] = useState<'' | 'server' | 'offline'>('');
  const summaryRef = useRef<HTMLDivElement>(null);
  const fromCheck = new URLSearchParams(location.search).get('from') === 'check';
  const reach = firstIncomplete(draft);
  const est = fees(draft);

  // Errors show for a field once it's been left (on blur), and for every field after Continue. Never while typing a first answer.
  const all = validate(step, draft);
  const errors: Errors = Object.fromEntries(Object.entries(all).filter(([k]) => tries || blurred.includes(k)));
  const msg = (key?: string) => (key ? (t.errors as unknown as Record<string, string>)[key] : undefined);
  const docLabel = (k: DocId) => k === 'reg' ? (draft.regType === 'sec' ? t.docs.regSec : draft.regType === 'dti' ? t.docs.regDti : t.docs.reg)
    : k === 'place' ? (draft.premises === 'rent' ? t.docs.placeRent : draft.premises === 'own' ? t.docs.placeOwn : t.docs.place) : t.docs[k];

  const missingSteps = tries && isCheck ? STEPS.filter((s, k) => k < i && Object.keys(validate(s, draft)).length) : [];
  const items: SummaryItem[] = [
    ...missingSteps.map((s) => ({ to: `${BASE}/${s}?from=check`, text: t.missingStep(t.steps[s]) })),
    ...(tries ? Object.entries(all) : []).map(([field, key]) =>
      ({ field, text: field.startsWith('doc-') ? `${docLabel(field.slice(4) as DocId)}: ${msg(key)}` : msg(key)! })),
  ];
  const hasErrors = items.length > 0;

  useEffect(() => { if (tries && hasErrors) summaryRef.current?.focus(); }, [tries]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.title = (hasErrors ? t.errorPrefix : '') + permitTitle(path); }, [hasErrors, path, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Screen readers hear the new estimate once answers settle, not on every keystroke.
  const liveText = est ? t.fee.live(peso(est.total, t)) : '';
  const [said, setSaid] = useState(liveText);
  useEffect(() => { const id = setTimeout(() => setSaid(liveText), 1200); return () => clearTimeout(id); }, [liveText]);

  const submit = () => {
    setSendErr('');
    if (offline) return setSendErr('offline');
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (outcome === 'error') return setSendErr('server');
      onSent({
        ref: `MC-BP-2026-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
        mobile: fmtMobile(normMobile(draft.mobile)), pay: draft.pay, total: est?.total, at: new Date().toISOString(), stage: 1,
      });
      navigate(`${BASE}/done`);
    }, 1200);
  };

  const next = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTries((n) => n + 1);
    const stepErrs = Object.keys(all).length;
    if (isCheck) { if (!stepErrs && reach === -1) submit(); return; }
    if (stepErrs) return;
    navigate(`${BASE}/${fromCheck ? 'check' : STEPS[i + 1]}`);
  };

  const onBlur = (e: FocusEvent<HTMLFormElement>) => {
    const el = e.target as unknown as HTMLInputElement;
    if (el.name && el.type !== 'file' && !blurred.includes(el.name)) setBlurred((b) => [...b, el.name]);
  };

  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => update({ [k]: v } as Partial<Draft>);
  const e = (k: string) => msg(errors[k]);
  const yesNo = [{ id: 'yes', label: t.yes }, { id: 'no', label: t.no }];
  const showFee = i >= 1 && !isCheck;
  const uploaded = DOC_IDS.filter((k) => draft.docs[k]?.status === 'done').length;

  return (
    <main id="permit-main" className="p-stepmain">
      <div className="p-wrap p-grid">
        <aside className="p-rail">
          <nav aria-label={t.stepsNav}>
            <ol className="p-nav">
              {STEPS.map((s, k) => {
                const done = k !== i && s !== 'check' && Object.keys(validate(s, draft)).length === 0;
                const canGo = k !== i && (reach === -1 || k <= reach);
                const label = <>
                  <span className="p-nav-n" aria-hidden="true">{done ? <Check /> : k + 1}</span>
                  <span>{t.steps[s]}{done && <span className="visually-hidden"> ({t.done})</span>}</span>
                </>;
                return (
                  <li key={s} className={k === i ? 'is-current' : done ? 'is-done' : undefined}>
                    {canGo ? <Link to={`${BASE}/${s}`}>{label}</Link> : <span aria-current={k === i ? 'step' : undefined}>{label}</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
          {showFee && (
            <section className="p-panel p-rail-fees" aria-labelledby="p-rail-fees-h">
              <h2 id="p-rail-fees-h">{t.fee.title}</h2>
              <FeeBreakdown draft={draft} />
            </section>
          )}
          <div className="p-rail-help">
            <p className="p-rail-help-h">{t.help.stuck}</p>
            <a href={CITY.phoneHref}><Phone aria-hidden />{t.help.call} {CITY.phone}</a>
          </div>
        </aside>

        <div className="p-col">
          <div className="p-stephead">
            <Link to={i === 0 ? BASE : `${BASE}/${fromCheck ? 'check' : STEPS[i - 1]}`} className="p-back"><ChevronLeft aria-hidden />{t.back}</Link>
            <p className="p-overline">
              <span>{t.stepOf(i + 1, STEPS.length)}</span>
              <span className="p-next-step">{i < STEPS.length - 1 ? t.next(t.steps[STEPS[i + 1]]) : t.lastStep}</span>
            </p>
            <h1 tabIndex={-1}>{t.steps[step]}</h1>
            <span className="p-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(i + 1) / STEPS.length})` }} /></span>
            {draft.savedAt && <p className="p-saved" role="status"><CircleCheck aria-hidden />{t.saved(fmtTime(draft.savedAt, t))}</p>}
          </div>

          {offline && !sendErr && <Banner tone="warn" icon={WifiOff}>{t.offline}</Banner>}
          {hasErrors && <ErrorSummary items={items} innerRef={summaryRef} />}
          {step === 'business' && <p className="visually-hidden" role="status">{said}</p>}

          <form className="p-form" onSubmit={next} onBlur={onBlur} noValidate>
            {step === 'about-you' && <>
              <p className="p-lede">{t.aboutLede}</p>
              <fieldset className="p-group" aria-describedby="p-name-hint">
                <legend className="p-group-legend">{t.nameLegend}</legend>
                <p id="p-name-hint" className="p-hint">{t.nameHint}</p>
                <Text name="firstName" label={t.firstName} autoComplete="given-name" value={draft.firstName} onChange={set('firstName')} error={e('firstName')} />
                <Text name="middleName" label={t.middleName} autoComplete="additional-name" value={draft.middleName} onChange={set('middleName')} />
                <Text name="lastName" label={t.lastName} autoComplete="family-name" value={draft.lastName} onChange={set('lastName')} error={e('lastName')} />
              </fieldset>
              <Text name="mobile" short label={t.mobile} hint={t.mobileHint} type="tel" inputMode="tel" autoComplete="tel-national" value={draft.mobile} onChange={set('mobile')} error={e('mobile')}
                ok={normMobile(draft.mobile) ? t.mobileOk(fmtMobile(normMobile(draft.mobile))) : undefined} />
              <Text name="email" label={t.email} hint={t.emailHint} type="email" inputMode="email" autoComplete="email" spellCheck={false} value={draft.email} onChange={set('email')} error={e('email')} />
            </>}

            {step === 'business' && <>
              <Choices name="bizType" legend={t.bizType} error={e('bizType')} grid value={draft.bizType} onChange={(v) => update({ bizType: v as Draft['bizType'] })}
                options={BIZ_TYPES.map((b) => ({ id: b, label: t.bizTypes[b][0], hint: t.bizTypes[b][1], icon: TYPE_ICON[b] }))} />
              <Text name="bizName" label={t.bizName} hint={t.bizNameHint} autoComplete="organization" value={draft.bizName} onChange={set('bizName')} error={e('bizName')} />
              <Choices name="regType" legend={t.regType} error={e('regType')} inline value={draft.regType} onChange={(v) => update({ regType: v as Draft['regType'] })}
                options={(['dti', 'sec'] as const).map((r) => ({ id: r, label: t.regTypes[r][0], hint: t.regTypes[r][1] }))} />
              <Text name="regNo" label={t.regNo} hint={t.regNoHint} autoComplete="off" spellCheck={false} value={draft.regNo} onChange={set('regNo')} error={e('regNo')} short />
              <Text name="capital" label={t.capital} hint={t.capitalHint} prefix="₱" inputMode="numeric" autoComplete="off" short
                value={draft.capital ? Number(draft.capital).toLocaleString('en-PH') : ''} onChange={(v) => update({ capital: digits(v).slice(0, 10) })} error={e('capital')} />
              <Text name="workers" label={t.workers} hint={draft.bizType === 'food' ? t.workersFood : undefined} inputMode="numeric" autoComplete="off" short
                value={draft.workers} onChange={set('workers')} error={e('workers')} />
              <Choices name="sign" legend={t.sign} inline error={e('sign')} value={draft.sign} onChange={(v) => update({ sign: v as Draft['sign'] })} options={yesNo} />
              <Text name="startDate" label={t.startDate} hint={t.startDateHint} type="date" value={draft.startDate} onChange={set('startDate')} error={e('startDate')} short />
            </>}

            {step === 'location' && <>
              <p className="p-lede">{t.locLede}</p>
              <Text name="street" label={t.street} hint={t.streetHint} autoComplete="address-line1" value={draft.street} onChange={set('street')} error={e('street')} />
              <div className={`p-field${e('barangay') ? ' p-field--error' : ''}`}>
                <label htmlFor="p-barangay" className="p-label">{t.barangay}</label>
                {e('barangay') && <ErrorText id="p-barangay-err">{e('barangay')}</ErrorText>}
                <div className="p-select">
                  <select id="p-barangay" name="barangay" value={draft.barangay} onChange={(ev) => update({ barangay: ev.target.value })}
                    aria-invalid={e('barangay') ? true : undefined} aria-describedby={e('barangay') ? 'p-barangay-err' : undefined}>
                    <option value="">{t.chooseBarangay}</option>
                    {BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-field">
                <p className="p-label">{t.cityLine}</p>
                <p className="p-fixed"><MapPin aria-hidden />{t.cityValue}</p>
              </div>
              <Choices name="premises" legend={t.premises} error={e('premises')} value={draft.premises} onChange={(v) => update({ premises: v as Draft['premises'] })}
                options={(['own', 'rent'] as const).map((p) => ({ id: p, label: t.premisesOpts[p][0], hint: t.premisesOpts[p][1] }))} />
            </>}

            {step === 'documents' && <>
              <p className="p-lede">{t.docsLede}</p>
              <div className="p-meter-row">
                <span className="p-meter" aria-hidden="true"><span style={{ transform: `scaleX(${uploaded / DOC_IDS.length})` }} /></span>
                <p className="p-meter-text">{t.docsProgress(uploaded, DOC_IDS.length)}</p>
              </div>
              <div className="p-panel p-docs">
                {DOC_IDS.map((k) => (
                  <FileField key={k} k={k} label={docLabel(k)} value={draft.docs[k]} error={e(`doc-${k}`)} offline={offline} update={update}
                    hint={k === 'place' && draft.premises ? t.docHints[draft.premises === 'rent' ? 'placeRent' : 'placeOwn'] : t.docHints[k]} />
                ))}
              </div>
            </>}

            {step === 'payment' && <>
              <p className="p-lede">{t.payLede}</p>
              <Choices name="pay" legend={t.payLegend} hint={t.payNote} error={e('pay')} value={draft.pay} onChange={(v) => update({ pay: v as Draft['pay'] })}
                options={PAY_METHODS.map((m) => ({ id: m, label: t.payOpts[m][0], hint: t.payOpts[m][1], icon: PAY_ICON[m] }))} />
            </>}

            {isCheck && <Review draft={draft} docLabel={docLabel} error={e('declared')} update={update} />}

            {sendErr && (
              <Banner tone="crit" icon={sendErr === 'server' ? OctagonAlert : WifiOff} title={(sendErr === 'server' ? t.serverErr : t.offlineErr)[0]}>
                {(sendErr === 'server' ? t.serverErr : t.offlineErr)[1]}
              </Banner>
            )}

            {/* Pinned to the bottom on phones, in thumb reach. It also carries the live fee estimate, so it stays in view while answering. */}
            <div className="p-actions">
              {showFee && est && (
                <details className="p-feebar">
                  <summary>
                    <span className="p-feebar-label">{t.fee.title}</span>
                    <span className="p-feebar-total">{peso(est.total, t)}</span>
                    <ChevronUp aria-hidden className="p-feebar-chev" />
                  </summary>
                  <FeeBreakdown draft={draft} />
                </details>
              )}
              {/* aria-disabled, not disabled, so focus stays on the button while it sends. next() ignores repeat presses. */}
              <button type="submit" className="p-btn p-btn--primary p-btn--block-phone" aria-disabled={busy || undefined}>
                {busy ? <><LoaderCircle className="p-spin" aria-hidden />{t.sending}</>
                  : isCheck ? t.submit : fromCheck ? t.saveAndReview : <>{t.continue}<ArrowRight aria-hidden /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Review({ draft: d, docLabel, error, update }: { draft: Draft; docLabel: (k: DocId) => string; error?: string; update: Update }) {
  const { t } = useT();
  const r = t.rows;
  const name = [d.firstName, d.middleName, d.lastName].map((x) => x.trim()).filter(Boolean).join(' ');
  const sections: [StepSlug, [string, ReactNode][]][] = [
    ['about-you', [[r.name, name], [r.mobile, fmtMobile(normMobile(d.mobile)) || d.mobile], [r.email, d.email.trim() || '–']]],
    ['business', [
      [r.bizType, d.bizType && t.bizTypes[d.bizType][0]], [r.bizName, d.bizName],
      [r.reg, d.regType && d.regNo && `${t.regTypes[d.regType][0]} ${d.regNo}`],
      [r.capital, Number(d.capital) ? peso(Number(d.capital), t) : ''], [r.workers, d.workers],
      [r.sign, d.sign && (d.sign === 'yes' ? t.yes : t.no)], [r.startDate, d.startDate && fmtDate(d.startDate, t)],
    ]],
    ['location', [
      [r.address, d.street && d.barangay && <>{d.street}<br />Barangay {d.barangay}, {t.cityValue}</>],
      [r.premises, d.premises && t.premisesOpts[d.premises][0]],
    ]],
    ['documents', DOC_IDS.map((k) => {
      const u = d.docs[k];
      return [docLabel(k), u && <span className="p-review-doc">{u.thumb ? <img src={u.thumb} alt="" width={32} height={32} /> : <FileText aria-hidden />}{u.name}</span>] as [string, ReactNode];
    })],
    ['payment', [[r.pay, d.pay && t.payOpts[d.pay][0]]]],
  ];

  return <>
    <p className="p-lede">{t.checkLede}</p>
    <div className="p-panel p-review">
      {sections.map(([slug, rows]) => (
        <section key={slug} aria-labelledby={`p-r-${slug}`}>
          <div className="p-review-head">
            <h2 id={`p-r-${slug}`}>{t.steps[slug]}</h2>
            <Link to={`${BASE}/${slug}?from=check`} className="p-change">{t.change}<span className="visually-hidden"> {t.steps[slug]}</span></Link>
          </div>
          {/* A section nobody has touched is one line, not a column of "Not answered". The optional email shows as "–". */}
          {rows.every(([, v]) => !v || v === '–')
            ? <p className="p-review-empty p-missing">{t.notStarted}</p>
            : <dl>
                {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || <span className="p-missing">{t.notAnswered}</span>}</dd></div>)}
              </dl>}
        </section>
      ))}
    </div>
    <section className="p-panel p-review-fees" aria-labelledby="p-review-fees-h">
      <h2 id="p-review-fees-h">{t.fee.title}</h2>
      <FeeBreakdown draft={d} />
    </section>
    <div className={`p-field${error ? ' p-field--error' : ''}`}>
      {error && <ErrorText id="p-declared-err">{error}</ErrorText>}
      <label className="p-choice">
        <input type="checkbox" id="p-declared" name="declared" checked={d.declared} onChange={(ev) => update({ declared: ev.target.checked })} aria-describedby={error ? 'p-declared-err' : undefined} />
        <span className="p-choice-text">{t.declare}</span>
      </label>
    </div>
  </>;
}

// ---------- confirmation ----------

function Done({ sub }: { sub: Submitted | null }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  if (!sub) {
    return (
      <main id="permit-main" className="p-wrap p-done">
        <h1 tabIndex={-1}>{t.noneTitle}</h1>
        <p className="p-lede">{t.noneBody}</p>
        <Link to={BASE} className="p-btn p-btn--primary p-btn--block-phone">{t.startOne}<ArrowRight aria-hidden /></Link>
      </main>
    );
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(sub.ref); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the number stays on screen to copy by hand */ }
  };
  // Only the to-dos still ahead: waiting for the assessment text (stage 1), paying (up to 2), letting inspectors in (up to 3).
  const todo = t.todo(sub.total ? peso(sub.total, t) : '', t.payVia[sub.pay] ?? '').filter((_, k) => sub.stage <= k + 1);
  return (
    <main id="permit-main" className="p-wrap p-done">
      <section className="p-done-hero" aria-labelledby="p-done-h">
        <CircleCheck aria-hidden className="p-done-icon" />
        <h1 id="p-done-h" tabIndex={-1}>{t.doneTitle}</h1>
        <div className="p-ticket">
          <p className="p-ticket-label">{t.refLabel}</p>
          <div className="p-ticket-row">
            <p className="p-ref">{sub.ref}</p>
            <button type="button" className="p-btn p-btn--secondary" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}{copied ? t.copied : t.copy}
            </button>
          </div>
          <p className="visually-hidden" role="status">{copied ? t.copied : ''}</p>
        </div>
        <p className="p-done-sms">{t.sms(sub.mobile)}</p>
      </section>

      <div className="p-done-grid">
        <section className="p-panel" aria-labelledby="p-status-h">
          <h2 id="p-status-h">{t.statusTitle}</h2>
          <Stages stage={sub.stage} at={sub.at} />
        </section>
        <section aria-labelledby={todo.length ? 'p-todo-h' : undefined} className="p-todo">
          {todo.length > 0 && <>
            <h2 id="p-todo-h">{t.todoTitle}</h2>
            <ul className="p-todo-list">
              {todo.map((s) => <li key={s}><Check aria-hidden />{s}</li>)}
            </ul>
          </>}
          <div className="p-done-actions">
            <button type="button" className="p-btn p-btn--secondary" onClick={() => print()}><Printer aria-hidden />{t.print}</button>
            <Link to={BASE} className="p-btn p-btn--quiet">{t.home}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

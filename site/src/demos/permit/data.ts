// Marilag City, Province of Sinagtala: a made-up Philippine city. Every name, number, address, and fee here is fictional.
// 0900 isn't an assigned mobile prefix and .example is reserved for fiction, so the contact details can't reach anyone.

export const CITY = {
  phone: '0900 555 0137',
  phoneHref: 'tel:+639005550137',
  email: 'bplo@marilag.example',
  zip: '4199',
};

export const BIZ_TYPES = ['sarisari', 'food', 'online', 'shop'] as const;
export type BizType = (typeof BIZ_TYPES)[number];

// Fictional barangays of Marilag City, alphabetical so a native select is easy to scan.
export const BARANGAYS = [
  'Bagumbayan', 'Bakawan', 'Dalampasigan', 'Kawayanan', 'Liwayway', 'Maharlika', 'Malinis', 'Poblacion', 'Sampaguita', 'Tabing-Ilog',
];

export const PAY_METHODS = ['ewallet', 'bank', 'otc'] as const;
export const DOC_IDS = ['reg', 'brgy', 'ctc', 'place', 'id'] as const;
export type DocId = (typeof DOC_IDS)[number];

export type Upload = { name: string; size: number; pdf: boolean; thumb?: string; status: 'uploading' | 'done' };

export type Draft = {
  firstName: string; middleName: string; lastName: string; mobile: string; email: string;
  bizName: string; regType: 'dti' | 'sec' | ''; regNo: string; bizType: BizType | ''; capital: string; workers: string;
  sign: 'yes' | 'no' | ''; startDate: string;
  street: string; barangay: string; premises: 'own' | 'rent' | '';
  docs: Record<DocId, Upload | null>;
  pay: (typeof PAY_METHODS)[number] | '';
  declared: boolean;
  savedAt?: string;
};

export const EMPTY: Draft = {
  firstName: '', middleName: '', lastName: '', mobile: '', email: '',
  bizName: '', regType: '', regNo: '', bizType: '', capital: '', workers: '', sign: '', startDate: '',
  street: '', barangay: '', premises: '',
  docs: { reg: null, brgy: null, ctc: null, place: null, id: null },
  pay: '', declared: false,
};

export const STEPS = ['about-you', 'business', 'location', 'documents', 'payment', 'check'] as const;
export type StepSlug = (typeof STEPS)[number];

// Field id -> error key (looked up in i18n.ts), in the order the fields appear.
export type Errors = Record<string, string>;

export const digits = (s: string) => s.replace(/\D/g, '');

// Postel: accept 0917 123 4567, +63 917 123 4567, 63-917-..., 917 123 4567. Returns 09XXXXXXXXX or ''.
export function normMobile(s: string) {
  const d = digits(s);
  const m = d.startsWith('63') ? `0${d.slice(2)}` : d.startsWith('9') ? `0${d}` : d;
  return /^09\d{9}$/.test(m) ? m : '';
}
export const fmtMobile = (m: string) => (m ? `${m.slice(0, 4)} ${m.slice(4, 7)} ${m.slice(7)}` : '');

export const MAX_FILE = 10 * 1024 * 1024;

export function validate(slug: StepSlug, d: Draft): Errors {
  const e: Errors = {};
  if (slug === 'about-you') {
    if (!d.firstName.trim()) e.firstName = 'firstName';
    if (!d.lastName.trim()) e.lastName = 'lastName';
    if (!d.mobile.trim()) e.mobile = 'mobileEmpty';
    else if (!normMobile(d.mobile)) e.mobile = 'mobileBad';
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'emailBad';
  }
  if (slug === 'business') {
    if (!d.bizName.trim()) e.bizName = 'bizName';
    if (!d.regType) e.regType = 'regType';
    if (!d.regNo.trim()) e.regNo = 'regNo';
    if (!d.bizType) e.bizType = 'bizType';
    if (!Number(d.capital)) e.capital = 'capital';
    const w = Number(d.workers.trim());
    if (!d.workers.trim()) e.workers = 'workersEmpty';
    else if (!Number.isInteger(w) || w < 1 || w > 999) e.workers = 'workersBad';
    if (!d.sign) e.sign = 'sign';
    if (!d.startDate) e.startDate = 'startDate';
  }
  if (slug === 'location') {
    if (!d.street.trim()) e.street = 'street';
    if (!d.barangay) e.barangay = 'barangay';
    if (!d.premises) e.premises = 'premises';
  }
  if (slug === 'documents') {
    for (const k of DOC_IDS) {
      const u = d.docs[k];
      if (!u) e[`doc-${k}`] = 'docMissing';
      else if (u.status === 'uploading') e[`doc-${k}`] = 'docUploading';
    }
  }
  if (slug === 'payment' && !d.pay) e.pay = 'pay';
  if (slug === 'check' && !d.declared) e.declared = 'declared';
  return e;
}

export const firstIncomplete = (d: Draft) => STEPS.findIndex((s) => s !== 'check' && Object.keys(validate(s, d)).length > 0);

// ---------- fee estimate ----------
// Made-up schedule, shaped like a real one: a mayor's permit fee by business type, business tax for a new business at
// 1/20 of 1% of capital, sanitary and garbage fees, health certificates per food handler, a signboard fee, and the
// fire safety inspection fee at 15% of the city's fees.

const MAYOR: Record<BizType, number> = { sarisari: 500, food: 800, online: 400, shop: 1000 };
export const HEALTH_CERT = 150;

export type FeeLine = { key: 'mayor' | 'tax' | 'sanitary' | 'health' | 'garbage' | 'sign' | 'fire'; amount: number; n?: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function fees(d: Draft): { lines: FeeLine[]; total: number } | null {
  if (!d.bizType) return null;
  const food = d.bizType === 'food';
  const workers = Math.max(1, Math.min(999, Math.floor(Number(d.workers)) || 1));
  const lines: FeeLine[] = [
    { key: 'mayor', amount: MAYOR[d.bizType] },
    { key: 'tax', amount: round2((Number(d.capital) || 0) * 0.0005) },
    { key: 'sanitary', amount: food ? 300 : 200 },
    ...(food ? [{ key: 'health', amount: workers * HEALTH_CERT, n: workers } as FeeLine] : []),
    { key: 'garbage', amount: food ? 600 : d.bizType === 'online' ? 200 : 300 },
    ...(d.sign === 'yes' ? [{ key: 'sign', amount: 200 } as FeeLine] : []),
  ];
  const sub = lines.reduce((s, l) => s + l.amount, 0);
  const fire = round2(sub * 0.15);
  lines.push({ key: 'fire', amount: fire });
  return { lines, total: round2(sub + fire) };
}

export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

// Runnable check for the money and phone logic: open the browser console on any permit page and run __permitCheck().
export function selfCheck() {
  const ok = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const f = fees({ ...EMPTY, bizType: 'sarisari', capital: '50000', workers: '2', sign: 'no' })!;
  ok(f.total === 1178.75, `sari-sari total ${f.total}`); // (500 + 25 + 200 + 300) × 1.15
  const g = fees({ ...EMPTY, bizType: 'food', capital: '20000', workers: '3', sign: 'yes' })!;
  ok(g.lines.find((l) => l.key === 'health')!.amount === 450 && g.total === 2714, `food total ${g.total}`); // (800+10+300+450+600+200) × 1.15
  ok(fees(EMPTY) === null, 'no type, no estimate');
  for (const m of ['0917 123 4567', '+63 917 123 4567', '917-123-4567', '639171234567']) ok(normMobile(m) === '09171234567', m);
  for (const m of ['0917 123 456', '0817 123 4567', '']) ok(normMobile(m) === '', `rejects ${m}`);
  return 'permit self-check passed';
}

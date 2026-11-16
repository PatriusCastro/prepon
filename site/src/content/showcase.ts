// Data for the home page and gallery demonstrations.
// prepon-ignore-file
// This file quotes slop on purpose: SLOP_SAMPLE is the input to the in-browser detector toy.

/** One line of the simulated Claude Code session. `user` lines are typed; the rest appear whole. */
export type TermLine = { kind: 'user' | 'tool' | 'out' | 'text' | 'done'; text: string; pause?: number };

// Real commands from the skill (scripts path shortened); project and output abridged.
export const SESSION: TermLine[] = [
  { kind: 'user', text: 'Add a vehicle detail drawer to the dispatch console. Keep it consistent with the rest.' },
  { kind: 'tool', text: 'Skill(prepon:prepon)', pause: 700 },
  { kind: 'out', text: 'Mode: build. The request makes UI.' },
  { kind: 'tool', text: 'Read(package.json, src/styles/tokens.css, src/components/VehicleTable.tsx)' },
  { kind: 'out', text: 'React + Vite. Tokens --f-brand, --f-r-card (8px). IBM Plex Sans. Lucide icons.' },
  { kind: 'tool', text: 'Bash(node scripts/scan-consistency.js --summary src)' },
  { kind: 'out', text: 'radius   var(--f-r-control) ×18 · var(--f-r-card) ×6\nbuttons  3 variants, all states present' },
  { kind: 'text', text: 'Operations dashboard: dispatchers on desktop, supervisors on phones.\nExtending the --f- tokens. No new radius.', pause: 900 },
  { kind: 'tool', text: 'Bash(node scripts/snapshot.js --routes dashboard --phase before)' },
  { kind: 'out', text: 'before/dashboard@360.png · @768.png · @1440.png' },
  { kind: 'tool', text: 'Write(src/components/VehicleDrawer.tsx)', pause: 900 },
  { kind: 'tool', text: 'Bash(node scripts/detect-slop.js src/components/VehicleDrawer.tsx)' },
  { kind: 'out', text: '[{ "rule": "transition-all", "line": 31,\n   "suggestion": "Name the properties (transition-colors, or transform/opacity)…" }]' },
  { kind: 'tool', text: 'Update(VehicleDrawer.tsx:31)  transition: transform 250ms, opacity 250ms' },
  { kind: 'out', text: 'detect-slop: []  ·  scan-consistency: no new outliers' },
  { kind: 'tool', text: 'Bash(node scripts/tap-map.js --routes dashboard --primary "[data-primary]")' },
  { kind: 'out', text: 'primary: first screen, easy thumb zone · issues: []' },
  { kind: 'tool', text: 'Bash(node scripts/snapshot.js --routes dashboard --phase after --stamp 20261112-1430)' },
  { kind: 'done', pause: 900, text:
    'The drawer opens beside the queue and keeps its scroll position. Escape returns focus to the row.\n\n' +
    '• Drawer, not a page. Miller’s law: dispatchers compare a vehicle with the queue.\n' +
    '• 250 ms slide. motion.md: shows where it came from; a fade with reduced motion.\n' +
    '• Existing card radius. Consistency: --f-r-card, already used 6×.\n\n' +
    'Before/after: .prepon/snapshots/20261112-1430/compare.html' },
];

export const SLOP_SAMPLE = `export function Hero() {
  return (
    <section className="bg-gradient-to-r from-purple-500 to-indigo-600">
      <div className="rounded-3xl shadow-2xl backdrop-blur-md p-6">
        <h1>🚀 Supercharge your workflow</h1>
        <p className="text-gray-400 text-[11px]">
          Seamlessly elevate your team.
        </p>
        <input placeholder="Email" />
        <button className="transition-all duration-700 animate-bounce">
          Get started
        </button>
      </div>
    </section>
  );
}`;

export const FITTED_SAMPLE = `export function PermitStart() {
  return (
    <section className="permit-start">
      <h1>Apply for a business permit</h1>
      <p className="text-muted">
        It takes about 15 minutes. Answers save as you go.
      </p>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" />
      <button className="btn-primary">
        Start now
      </button>
    </section>
  );
}`;

// Notes copied from each run's compare.html in .prepon/snapshots. Images are first-screen crops of those captures.
export const COMPARISONS = [
  { id: 'fleet', name: 'Fleet dispatch console', route: '/demo/fleet/dashboard', run: 'build, bolder redesign',
    notes: [
      'The four equal KPI cards no longer lead. The open-exception count does, on a tint in the colour of the worst exception.',
      'The sidebar becomes tabs in the top bar, and the map fills the full height beside a docked triage pane.',
      'On phones the first screen opens on “5 vehicles need attention” and the first rows, not a 2×2 grid of stats.',
    ] },
  { id: 'permit', name: 'Business permit application', route: '/demo/permit', run: 'build, bolder redesign of an earlier version (City of Vellmouth); the live demo has since been rebuilt',
    notes: [
      'Title and Start now move into a harbour-blue masthead. Start is on the first phone screen; it was about 1,230 px down.',
      'Brass Start button in the seal’s brass with ink text, 6.4:1.',
      'IBM Plex Sans replaces the Segoe stack.',
    ] },
  { id: 'expenses', name: 'Expense approvals', route: '/demo/expenses', run: 'audit (8/50), then fix A1–A20',
    notes: [
      'Hero, KPI cards, and tip removed. The pending queue starts under the title; it was about 1.4 screens down.',
      'No sideways scroll at 360 (page width 360, was 878). Claims open a sheet with a pinned Approve / Reject bar.',
      'One list surface with dividers instead of 47 glass cards, and a summary line computed from the data.',
    ] },
] as const;

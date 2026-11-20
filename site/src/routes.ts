// Plain data, no JSX: vite.config.ts imports this to write one HTML file per route.

export type Doc = { slug: string; nav: string; title: string; summary: string; group: 'Modes' | 'Reference'; source: string };

const SKILL = 'plugins/prepon/skills/prepon';

export const DOCS: Doc[] = [
  { group: 'Modes', slug: 'build', nav: 'build', title: 'build mode', source: `${SKILL}/SKILL.md`,
    summary: 'Creates or changes UI. Reads the project first, builds mobile-first, then runs a slop scan and an accessibility checklist, and ends with a rationale table.' },
  { group: 'Modes', slug: 'audit', nav: 'audit', title: 'audit mode', source: `${SKILL}/references/modes.md`,
    summary: 'Reviews existing UI, writes a scored report to docs/ui-audit-YYYY-MM-DD.md, and publishes it as a page with charts. Never edits code.' },
  { group: 'Modes', slug: 'fix', nav: 'fix', title: 'fix mode', source: `${SKILL}/references/modes.md`,
    summary: 'Applies findings from the latest audit in severity order, with before/after screenshots and a change table.' },
  { group: 'Modes', slug: 'cite', nav: 'cite', title: 'cite mode', source: `${SKILL}/references/modes.md`,
    summary: 'Explains an existing design for client documentation: each decision, the principle behind it if there is one, and an honest status. Never edits code.' },
  { group: 'Modes', slug: 'refs', nav: 'refs', title: 'refs mode', source: `${SKILL}/references/modes.md`,
    summary: 'Finds 3 to 5 real, well-regarded examples of a pattern, with verified links and notes on what to adapt. Structure only, no copying.' },
  { group: 'Modes', slug: 'canvas', nav: 'canvas', title: 'canvas mode', source: `${SKILL}/references/modes.md`,
    summary: 'Explores three visual directions on a design canvas before any code changes, reviews each one, then builds the one you pick.' },
  { group: 'Modes', slug: 'tweak', nav: 'tweak', title: 'tweak mode', source: `${SKILL}/references/tweak.md`,
    summary: 'Lets a designer edit the running app in the browser, resizing and restyling elements live, then applies those edits to the code through tokens and components.' },
  { group: 'Reference', slug: 'choosing-a-mode', nav: 'Choosing a mode', title: 'Choosing a mode', source: `${SKILL}/SKILL.md`,
    summary: 'How Prepon picks a mode from your request, and what each mode reads, edits, and returns.' },
  { group: 'Reference', slug: 'project-types', nav: 'Project types', title: 'Project types', source: `${SKILL}/references/project-types.md`,
    summary: 'Five kinds of enterprise product, with what their users are trying to do, what matters most, which laws carry weight, and the usual mistakes.' },
  { group: 'Reference', slug: 'ux-laws', nav: 'UX laws', title: 'UX laws as design rules', source: `${SKILL}/references/ux-laws.md`,
    summary: 'Thirteen UX laws rewritten as rules: when each applies, what it implies, how to check it, and how it gets misused.' },
  { group: 'Reference', slug: 'slop-patterns', nav: 'Slop patterns', title: 'Slop patterns and the detector', source: `${SKILL}/references/slop-patterns.md`,
    summary: 'The generic look of AI-generated interfaces, broken into tells. Each one comes with what to do instead, and the mechanical ones are caught by a script.' },
  { group: 'Reference', slug: 'accessibility', nav: 'Accessibility', title: 'Accessibility', source: `${SKILL}/references/accessibility.md`,
    summary: 'WCAG 2.2 AA requirements as checkable numbers, plus the Apple and Android target sizes.' },
  { group: 'Reference', slug: 'responsive', nav: 'Responsive web', title: 'Responsive web', source: `${SKILL}/references/responsive.md`,
    summary: 'The widths to design and test, how to choose breakpoints, layout rules, fluid type, and safe areas on the web.' },
  { group: 'Reference', slug: 'mobile', nav: 'Mobile', title: 'Mobile (React Native and mobile web)', source: `${SKILL}/references/mobile.md`,
    summary: 'Designing for a mid-range Android phone first: targets, safe areas, thumb reach, platform behavior, performance, and offline.' },
  { group: 'Reference', slug: 'before-after', nav: 'Before and after', title: 'Before and after', source: `${SKILL}/references/before-after.md`,
    summary: 'How Prepon captures screenshots of existing UI before and after a change, and what it does when it can’t.' },
];

export const ROUTES = ['/', '/docs', ...DOCS.map((d) => `/docs/${d.slug}`), '/demo', '/demo/fleet', '/demo/fleet/dashboard',
  ...['', '/about-you', '/business', '/location', '/documents', '/payment', '/check', '/done'].map((s) => `/demo/permit${s}`), '/demo/expenses', '/gallery'];

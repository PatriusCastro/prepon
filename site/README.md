# Prepon site

Static showcase and docs for the Prepon skill. React + Vite + TypeScript, served from GitHub Pages at `/prepon/`.

```sh
npm install
npm run dev       # http://localhost:5173/prepon/
npm run build     # type-checks, then writes dist/
npm run preview
```

## Deploying

`npm run build` writes `dist/`, including a copy of `index.html` in every route folder (so deep links like `/prepon/docs/audit/` return 200 on GitHub Pages, which has no SPA fallback) and a `404.html` for unknown paths. Publish `dist/` with Pages (for example `actions/upload-pages-artifact` + `actions/deploy-pages` with `working-directory: site`). No workflow is included yet.

## Where things live

- `src/routes.ts`: the list of docs pages and every route. `vite.config.ts` reads it to write the per-route HTML files. Add a route here first.
- `src/content/`: docs bodies, rewritten for people from `plugins/prepon/skills/prepon`. When a reference file changes, update its page here; the source path is printed at the bottom of each page.
- `src/styles.css`: all tokens at the top (color, type, space, radius, motion). Use them instead of adding values. Site rules are scoped under `.site`; the demos under `src/demos/` render with this stylesheet too, so they get a frozen copy of the old global element rules (the "Demo compatibility" block). Check a demo's captures before changing that block.

## Design rationale

Visual direction: clean product docs for a developer tool, on the visual-craft baseline. A near-neutral page (`#fafaf9`) with white surfaces and hairline dividers, near-black ink, and one accent, the red ochre kept from the earlier site, used only for actions, links, and focus. IBM Plex Sans for all UI and text (400/500/600) and a system monospace for code. A five-step type scale, 6 px controls and 10 px panels, Lucide icons. Dark code blocks appear only where code is shown. What keeps it Prepon's own: the ink π mark and Greek gloss, the ochre accent, and the page's evidence being Prepon's real output (the detector's own rules, real captures, the skill's real commands).

The earlier revamp (warm paper, meander border, serif display, drifting hero gradient, nine boxed sections) was treated as the thing to move away from. Its "cream page, serif, terracotta" combination is itself a judgment tell in `slop-patterns.md`.

### Landing page

Six sections that tell one story: the hero; the problem (generated UI has tells, shown by the live detector on a typical AI-written hero); the approach (Prepon reads your project first, shown by the simulated session); the result (the fleet demo before and after one run); your turn (install, with the six modes named and linked in one sentence); and the name, set as a dictionary entry. Each section's first line picks up from the one before. The detector and install, the two places you act, sit on a band one tonal step up, so scrolling alternates between reading and doing. The modes tabs and the steps list were removed: they repeated the docs and the terminal.

An earlier pass below the hero used the current "premium dark" kit: gradient card surfaces with a white inner top edge, dividers that fade out at both ends, cards that lift on hover, a mono label over every heading, and a bento of four boxes with made-up mini demos. It passed the detector and was still generic, so it was removed, and the detector gained rules for those tells (`sheen-edge`, `gradient-surface`, `fading-hairline`, `hover-lift`, `eyebrow-everywhere`).

### Motion

| What | Shows | Timing | Reduced motion | Pause |
|---|---|---|---|---|
| Hero entrance | Nothing beyond arrival; the only page-load motion | 3 groups, opacity + 8 px rise, 250 ms, 40 ms stagger (done by ~330 ms), once | None; content is simply there | n/a (under 5 s) |
| Simulated Claude Code session | How a build run triggers the skill, runs its scripts, fixes a finding, and reports | Starts once at 40% visible; ~14 s; typing 24 ms/char; lines fade in 220 ms; progress bar | Opens on the final frame with Replay; replay shows lines without typing or movement | Pause / Resume / Replay / Show the whole run |
| Detector findings | A new finding appearing as you edit | 220 ms fade, only on newly added findings | None | Runs only on input |
| Hero lens (the page's one looping demo) | What Prepon does: six real detector rules (struck through) flow along curves into the π lens and come out the other side as the fix (brand colour, 44 px targets, visible labels…) | 6 s per chip, one every 1 s, offset-path + transform/opacity; rings turn over 60 and 90 s. Vertical 300 px stage on phones, horizontal 960 px from 64rem, so text never scales down | Still frame: three rules in, three fixes out, no button | Pause motion / Play motion button (aria-pressed) |
| Docs on-page list | Which section you are reading | Current item turns ink with a marker on the rail as headings pass the top third of the screen; 150 ms colour | Same, without the transition | n/a |
| Scroll reveal (requested) | Each block below the hero arriving, with movement that fits it: the detector code and findings meet from opposite sides, the before/after capture settles from 95 %, the πρέπον headword tightens its letter spacing | Once per block when it reaches the viewport; 450 ms ease-out, siblings 90 ms apart; revealing one reveals every block above it, so jumping down never leaves a gap | None; everything is visible from the start | n/a (once, under 5 s) |
| Before/after slider | Real captures, before vs after; the legend sits in the frame's bar so nothing covers the capture | Direct manipulation, plus one sweep of the divider (50 → 25 → 75 → 50 %, 1.8 s) when it first scrolls into view, via an @property --pos | No sweep | n/a (once, under 5 s) |
| Press and hover feedback | Buttons, nav, rows | 100–150 ms, colour and border only (plus a 0.97 press scale on buttons); nothing lifts or nudges | Press scale removed | n/a |

| Decision | Principle | Why it applies here |
|---|---|---|
| No cards, gradients, or fading lines below the hero; one 1 px rule between sections | hierarchy.md: cards are for objects; slop-patterns.md (gradient-surface, sheen-edge, fading-hairline) | Sections are grouped by space and headings. The docs index is a plain list, the pager is two links, the gallery is captures under rules. |
| Ochre accent kept for the header Install button, links, the slider, focus, and the "Click to copy" hint on the install command | Von Restorff effect; existing token | Installing is what the page exists for, so it carries the only solid fill. Segmented selections and mode tags are neutral so they don't compete. Keeping the existing hue was a consistency call, not a principle. |
| Code blocks copy on a click anywhere on the block; no Copy button | Fitts's law (the whole block is the target); WCAG 2.1.1 keyboard | The code area is a real <button> named "Copy <label>: <command>", so Tab + Enter works. The caption bar says Click to copy, then Copied, and the border turns green; a failure is shown in text. |
| IBM Plex Sans as the one UI/text face | visual-craft.md typography; judgment call | Already a dependency (`@fontsource/ibm-plex-sans`), a contemporary grotesk with a technical voice that suits a developer tool. Replaces the serif + system-sans pair. |
| Two control styles site-wide: underline tabs switch content (modes, demo picker); a segmented control sets a view option (sample, screen, device, capture width) | Consistency; Jakob's law | The demo's screen pills were a third style for the same job. The modes panel lost its box, so its copyable example code block is no longer a box inside a box. |
| Accent only on actions: link titles in page lists are ink until hover; detector line chips are neutral until selected; findings are rows, not boxes | Von Restorff effect; hierarchy.md cards are for objects | Fifteen orange titles or five orange chips in a column stop meaning "act here". |
| Detector shows 5 findings, then "Show all N" | Hick's law (load) | The sample yields 15 findings; showing all of them made the toy the largest thing on the page. The count and rule count (read live from `RULES`, 42 today) stay visible. |
| Session `aria-hidden`; a visually hidden list carries the full transcript | Judgment call (screen readers) | A live region announcing every typed character is unusable. The transcript is complete from the start. |
| The detector toy evaluates the `RULES` block of `scripts/detect-slop.js` (imported with `?raw`) | Judgment call (honesty) | A hand-copied subset would drift from the real detector. The slop-patterns docs page reads the same count. |
| All tokens checked (WCAG formula): ink 16.5:1, muted 6.0–6.8, accent 7.0, control borders 3.1–3.5 (dark: 15.6 / 6.5–7.7 / 9.0 / 3.3–3.9); code text 13.3–14.4 | WCAG 1.4.3, 1.4.11 | Computed from the token values in both themes; listed next to each token. |
| Dark on every site page, in both themes | Consistency with the hero; judgment call | The hero is dark by design, and a light docs page after it read as a different product. The demos are separate made-up products and keep their own themes. |
| Header: wordmark and version, then Docs / Demo screens / Before/after, then a GitHub icon link and Install at the far end; phones get two rows instead of a hamburger. The current section is ink text with an accent bar on the header's bottom edge; docs share the 72rem frame of every other page, so nothing shifts between pages | Jakob's law; responsive.md navigation | Links next to the brand is the convention for product and docs sites. GitHub is a secondary destination, so it is an icon (named "Prepon on GitHub"). "Before/after" says what the gallery holds. All links stay visible at 320 px. |
| Docs as a docs site: a full-height sidebar with a filter box ("/" focuses it; matches titles and summaries) and an Overview page; breadcrumbs; reading-size headings; the article centred at 46rem between the sidebar and an on-page list; an Edit on GitHub link; previous / next as two blocks. Below 1024 px the sidebar is a native <details> "Docs menu" | Jakob's law (docs conventions); native element over custom JS; responsive.md line length | People arrive at docs knowing how docs work. The scroll reveal used on the home page is not used here: docs are read, not presented. |
| Docs index without the sidebar: Modes and Reference side by side, each mode tagged Read-only or Edits code | Hick's law; avoid duplicate navigation | The index is the list of pages, so a sidebar repeated all 14 links. Whether a mode can change code is what people choose a mode by. |
| "On this page" column from 80rem on doc pages with three or more sections, built from the article's h2s at runtime | Information scent; judgment call | Slop patterns and UX laws are long; the right third of a 1440 screen was empty. Content files needed no ids. |
| Index pages (docs, demo screens, gallery) put the title beside the intro from 64rem; the demo picker uses the home page's underline tabs; gallery notes run in three columns; the 404 lists every docs page | Consistency with the home page; judgment call | One page-head pattern across the site. A moved docs page is the likely cause of a 404, so the pages themselves are the most useful thing to offer. |
| Every control at least 44 px tall | WCAG 2.5.8 (floor 24); 44 px aim | Confirmed by `tap-map.js` (no small targets). |
| Code blocks wrap instead of scrolling sideways; tables get their own scroll container | WCAG 1.4.10 Reflow | Install commands are wider than a 320 px screen. |
| Sticky header from 48rem only, solid (no blur), with `scroll-padding-top` reserving its height; sticky columns below it offset by `--header-h`. On the home page its hairline fades in over the first 80 px of scroll (scroll-driven animation where supported) | WCAG 2.4.11 Focus not obscured; slop pattern: glassmorphism | Anchors and focused elements land below the bar. Phones keep a static header so it never takes screen height. |
| Focus moves to the page `<h1>` on client-side navigation | Judgment call (SPA accessibility) | Screen readers otherwise don't announce the new page. |
| Gallery and demo index use real captures from `public/gallery/` | Prepon's before/after rule | `permit-now@1440/360.jpg` were recaptured from the rebuilt permit demo on 2026-11-12. |
| Small hand-written router instead of react-router | Judgment call (fewer dependencies) | Static routes, no params. |
| `prepon-ignore` lines in `src/content/` and `prepon-ignore-file` in `src/content/showcase.ts` | Detector suppression | They quote the tells as documentation, or hold the deliberately sloppy sample the toy scans. |

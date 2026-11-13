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

Six sections, each with one job: what it is and how to install it (with the simulated session beside it); the six modes; the slop detector; a before/after run; requirements and a one-session trial; and the name. Cut: the audit-score bars (the rubric and real scores are on the audit docs page and the gallery), the "where to go next" list (the header nav does that job), the duplicate install block, and the motion toggle (nothing loops any more; the session has its own pause).

### Motion

| What | Shows | Timing | Reduced motion | Pause |
|---|---|---|---|---|
| Hero entrance | Nothing beyond arrival; the only page-load motion | 3 groups, opacity + 8 px rise, 250 ms, 40 ms stagger (done by ~330 ms), once | None; content is simply there | n/a (under 5 s) |
| Simulated Claude Code session | How a build run triggers the skill, runs its scripts, fixes a finding, and reports | Starts once at 40% visible; ~14 s; typing 24 ms/char; lines fade in 220 ms; progress bar | Opens on the final frame with Replay; replay shows lines without typing or movement | Pause / Resume / Replay / Show the whole run |
| Detector findings | A new finding appearing as you edit | 220 ms fade, only on newly added findings | None | Runs only on input |
| Hero backdrop (the page's one place of atmosphere) | What Prepon removes and what it does: real detector rules floating struck through, beside the six modes, over a faint ochre drift | Gradient 12 s alternate; six chips in the bands above and below the text float ±12/±18 px, ±5° over 6.5–10 s; chips only at 64rem+ so they never sit behind text | Static: gradient and chips hold still, pause button hidden | "Pause background" button (aria-pressed) |
| Scroll reveal | Each block below the hero arriving | Once per block on entering the viewport: opacity + 24 px rise, 350 ms, 80 ms between siblings; revealing one reveals all above it | None; everything is visible from the start | n/a (once, under 5 s) |
| Before/after slider | Real captures, before vs after | Direct manipulation, no animation | Same | n/a |
| Press and hover feedback | Buttons, nav, cards, arrow nudge | 100–150 ms, transform/colour only | Transforms removed | n/a |

| Decision | Principle | Why it applies here |
|---|---|---|
| Neutral page, white surfaces, hairline dividers instead of tinted bands and boxes | hierarchy.md: cards are for objects; visual-craft.md layered neutrals | Sections are grouped by space and headings; only the demo cards (objects you open) are cards. |
| Ochre accent kept, but only on the primary Copy button, links, the slider, and focus | Von Restorff effect; existing token | Installing is what the page exists for, so the hero's Copy is the only solid fill. Segmented selections and mode tags are neutral so they don't compete. Keeping the existing hue was a consistency call, not a principle. |
| IBM Plex Sans as the one UI/text face | visual-craft.md typography; judgment call | Already a dependency (`@fontsource/ibm-plex-sans`), a contemporary grotesk with a technical voice that suits a developer tool. Replaces the serif + system-sans pair. |
| Six modes as plain rows with a neutral "Edits code / Read-only" tag and the example as inline code | Gestalt similarity; judgment call | Comparable records look alike; six dark code panels made the page heavy. The full copyable examples are on each mode's docs page. |
| Detector shows 5 findings, then "Show all N" | Hick's law (load) | The sample yields 15 findings; showing all of them made the toy the largest thing on the page. The count and rule count (read live from `RULES`, 37 today) stay visible. |
| Session `aria-hidden`; a visually hidden list carries the full transcript | Judgment call (screen readers) | A live region announcing every typed character is unusable. The transcript is complete from the start. |
| The detector toy evaluates the `RULES` block of `scripts/detect-slop.js` (imported with `?raw`) | Judgment call (honesty) | A hand-copied subset would drift from the real detector. The slop-patterns docs page reads the same count. |
| Demo cards: image and title open the demo; no stretched-link overlay | check-page.js `text-covered` | The overlay covered the card text and made it unselectable. |
| All tokens checked (WCAG formula): ink 16.5:1, muted 6.0–6.8, accent 7.0, control borders 3.1–3.5 (dark: 15.6 / 6.5–7.7 / 9.0 / 3.3–3.9); code text 13.3–14.4 | WCAG 1.4.3, 1.4.11 | Computed from the token values in both themes; listed next to each token. |
| Light and dark follow `prefers-color-scheme` | Slop pattern: dark mode by default | The system setting decides. |
| Header nav wraps to a second line on phones instead of a hamburger | Jakob's law; responsive.md navigation | Four items fit on two lines at 320 px, and nothing is hidden behind a menu. |
| Docs sidebar from 1024 px; a native `<details>` "All docs pages" below that; 68ch measure | Native element over custom JS; responsive.md line length | At 360 px a sidebar would squeeze the prose. |
| Every control at least 44 px tall | WCAG 2.5.8 (floor 24); 44 px aim | Confirmed by `tap-map.js` (no small targets). |
| Code blocks wrap instead of scrolling sideways; tables get their own scroll container | WCAG 1.4.10 Reflow | Install commands are wider than a 320 px screen. |
| No sticky header | WCAG 2.4.11 Focus not obscured | Nothing can cover the focused element. |
| Focus moves to the page `<h1>` on client-side navigation | Judgment call (SPA accessibility) | Screen readers otherwise don't announce the new page. |
| Gallery and demo index use real captures from `public/gallery/` | Prepon's before/after rule | `permit-now@1440/360.jpg` were recaptured from the rebuilt permit demo on 2026-11-12. |
| Small hand-written router instead of react-router | Judgment call (fewer dependencies) | Static routes, no params. |
| `prepon-ignore` lines in `src/content/` and `prepon-ignore-file` in `src/content/showcase.ts` | Detector suppression | They quote the tells as documentation, or hold the deliberately sloppy sample the toy scans. |

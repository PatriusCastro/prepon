# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0-beta.2] - 2026-11-19

### Added
- Audit mode publishes the report as a page people can take in within a minute: a one-sentence verdict, the score and finding counts, charts that all use one horizontal-bar component (score by area, frames dropped on a slow phone, contrast against its minimum, tap targets per phone screen, task steps), the fixes in order, and the tap-map captures. The Markdown report stays as the record fix mode reads. Without artifact support the page is written to `.prepon/audit/`.
- `--out <dir>` on `snapshot.js` and `tap-map.js`: captures go to that folder instead of the project's `.prepon/`, the project's `.gitignore` is left alone, and printed paths are absolute. Run from the project as before, so its Playwright is still found.

## [0.2.0-beta.1] - 2026-11-19

First beta for testers.

### Added
- MIT `LICENSE`, and `license`, `homepage`, and an author URL in `plugin.json`.
- Plugin icon (`.claude-plugin/icon.png`), rendered from the site's π mark.
- Plugin setting *Slop check after every UI edit* in `/config` turns the slop hook on for every project; `.prepon/hook-on` and `PREPON_HOOK=1` still turn it on for one project or shell.
- CI (`.github/workflows/ci.yml`): the script tests with Playwright, a site build, and `claude plugin validate` on every push and pull request, pinned to one Claude Code version. A weekly run (`latest-engine.yml`) validates against the newest Claude Code.
- README restructured: tagline, screenshots, a Why section, install first, a scripts table, Privacy and side effects, and Develop.
- Six generated-copy rules in `detect-slop.js` (53 rules now): `ai-vocabulary`, `assistant-leak`, `vague-error`, `vague-link`, `fragment-triplet`, and `exclaim-copy`, plus six copy judgment tells in `slop-patterns.md` (lists of three, title case, interface-describing copy, padding, slogans, repeated sentence shapes).
- `ux-writing.md` reference: voice and plain language, labels, buttons and links, errors, empty, loading and success states, and confirmations, each rule cited to NN/g, WCAG 2.2, GOV.UK, Digital.gov, Apple HIG, or Baymard. Build and audit read it, and the self-review checklist checks copy.
- Usability heuristics section in `ux-laws.md`: Nielsen's ten as project rules, with a check and a common misuse for each. Audits walk the main flow against them and cite the heuristic (H1–H10) on each finding it explains.
- Interaction cost rule in `ux-laws.md`: count the steps on the top tasks and cut them, keeping protective steps. Audits now include a Task steps table, and build reports the main task's step count (before → after) and checks it in the self-review checklist.
- `motion-perf.js`: measures motion on a slow phone. Loads routes at 360 px with the CPU throttled (`--cpu 4` or `6`), traces idle and a scroll and counts the frames the compositor dropped, and reports `dropped-frames`, `long-frame` (with the scripts blamed), `main-thread-animation`, `offscreen-animation`, and `heavy-layer`. Audit, fix, and build run it when motion is involved.
- Opportunities in audits: improvements that aren't defects (most often motion that could run on the compositor, or feedback that's missing) are listed as O1, O2… in their own section, without changing the score. `fix` applies them only when they're named. Audits also gain a "Motion on a slow phone" table.
- "Low-end devices" section in `motion.md`: compositor-only properties and their equivalents, stopping off-screen loops, layer memory, scroll and touch listeners, JavaScript-driven motion, and degrading rather than removing effects.
- `offscreen-animation` also covers endless animations inside an invisible parent.
- Five motion-performance rules in `detect-slop.js` (47 rules now): `layout-animation`, `paint-animation`, `will-change-overuse`, `scroll-listener`, and `blocking-touch-listener`.
- Predicted attention order in `tap-map.js`: ranks what's on the first screen by likely first look (size, contrast, position, isolated colour), saves a numbered `-attention` image, reports `primaryRank`, and flags `primary-not-salient` when the primary action isn't in the first three. Labelled as a prediction; real analytics heatmaps win.

### Changed
- Site: one shared demo bar (`DemoBar.tsx`) above every demo, with the way back, what's made up, and the demo's own controls, replacing each demo's own version.
- Site: the demos load on demand, so other pages no longer download them or Leaflet (main bundle 640 kB → 390 kB, CSS 160 kB → 58 kB). Focus still moves to the new page's heading after navigating into a demo.
- Site: the header and footer version is read from `plugin.json`.

### Fixed
- `slow-motion` no longer reads `.3s` as 3 s.
- `em-dash-copy` no longer counts a dash standing alone as an empty-value placeholder (`'—'`, `<td>—</td>`).
- Site detector editor: rules a visitor's edit trips for the first time are listed first and tagged "new", so they aren't hidden in the collapsed list; the counter reads "19 tells" to screen readers, not "19tells". The Generic sample now includes generated-copy tells.
- Site docs sidebar: group labels ("Modes", "Reference") and "On this page" drop to 12 px (new `--t-xs` token) so they don't read as links, and each group's pages sit on a 1 px rail under their label.

## [0.1.0] - 2026-11-12

### Added
- `prepon` plugin and single-plugin marketplace.
- `prepon` skill with six modes: build, audit, fix, cite, refs, and canvas. Audits score five areas out of 10 each (usability, accessibility, responsiveness and mobile, distinctiveness, consistency), for a total out of 50.
- Reference files: UX laws as design rules, slop patterns (mechanical and judgment), responsive web, mobile (React Native), accessibility (WCAG 2.2 AA, Apple HIG, and Android values with sources), project types, mode details, and the before/after procedure.
- `detect-slop.js`: a dependency-free detector with 42 rules (including the "premium dark" template rules `sheen-edge`, `gradient-surface`, `fading-hairline`, `hover-lift`, and `eyebrow-everywhere`, plus `card-spam`, `nested-card`, `side-stripe`, `glow-halo`, `hard-offset-shadow`, `italic-serif-display`, `forced-contrast`, and the motion rules `transition-all`, `slow-motion`, `scroll-reveal`, `bounce-easing`, `pulsing-dot`, `marquee`, and `blinking-cursor`), JSON output, and line- and file-level `prepon-ignore` suppression.
- `scan-consistency.js` (with `--summary` for a short report): an inventory of radius, borders, colors, shadows, type, and button variants and states, with outliers flagged against the project's own norm. Used by audit, fix, and build.
- `visual-craft.md` reference: the current quality bar for product UI (type, surfaces and radius, color, spacing, components), tables that always page, where identity lives, and the signs a design looks dated.
- `motion.md` reference: when motion helps, durations and easing, cheap properties, reduced motion and the WCAG motion criteria, and what to skip.
- `icons.md` reference: when icons help (navigation, common actions, status, input affordances), when they don't, labelling, one set per product, sizing, and platform idioms.
- `consistency.md` reference: visual and behavior consistency checks, how to choose the canonical value, and how to fix at the source.
- `check-page.js`: rendered-page checks at phone and desktop widths for sideways overflow, clipped or covered text, content still hidden after load, overly long lines, and errors on load, with an optional reduced-motion run.
- An optional PostToolUse hook (`hook-slop.js`) that runs the detector after each UI edit. It does nothing until a project opts in with `.prepon/hook-on` or `PREPON_HOOK=1`.
- `tap-map.js`: for each route at phone size, an overlay of tappable targets by thumb zone and size, a blurred squint-test capture, first-screen load figures, and issues (small or crowded targets, a primary action below the fold or hard to reach, a busy first screen, a page that didn't render).
- `hierarchy.md` reference: deciding what a screen is for and ranking elements in tiers, checking with the squint test and tap map, balance, overwhelmed versus underwhelmed, and cards being for objects rather than layout.
- `snapshot.js`: before/after screenshots at 360, 768, and 1440 px using the project's own Playwright. Routes resolve under a base path, `--viewport` captures screen-sized shots, and it reports clear errors for a missing browser or for routes rewritten by Git Bash.
- Self-tests for both scanners in `test/`.

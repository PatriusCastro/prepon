# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Interaction cost rule in `ux-laws.md`: count the steps on the top tasks and cut them, keeping protective steps. Audits now include a Task steps table, and build reports the main task's step count (before → after) and checks it in the self-review checklist.
- Predicted attention order in `tap-map.js`: ranks what's on the first screen by likely first look (size, contrast, position, isolated colour), saves a numbered `-attention` image, reports `primaryRank`, and flags `primary-not-salient` when the primary action isn't in the first three. Labelled as a prediction; real analytics heatmaps win.

## [0.1.0] - 2026-11-12

### Added
- `prepon` plugin and single-plugin marketplace.
- `prepon` skill with six modes: build, audit, fix, cite, refs, and canvas. Audits score five areas out of 10 each (usability, accessibility, responsiveness and mobile, distinctiveness, consistency), for a total out of 50.
- Reference files: UX laws as design rules, slop patterns (mechanical and judgment), responsive web, mobile (React Native), accessibility (WCAG 2.2 AA, Apple HIG, and Android values with sources), project types, mode details, and the before/after procedure.
- `detect-slop.js`: a dependency-free detector with 37 rules (including `card-spam`, `nested-card`, `side-stripe`, `glow-halo`, `hard-offset-shadow`, `italic-serif-display`, `forced-contrast`, and the motion rules `transition-all`, `slow-motion`, `scroll-reveal`, `bounce-easing`, `pulsing-dot`, `marquee`, and `blinking-cursor`), JSON output, and line- and file-level `prepon-ignore` suppression.
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

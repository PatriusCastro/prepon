# Prepon

A Claude Code skill that makes Claude a better frontend designer and reviewer for enterprise products: government portals, banking and finance apps, operations dashboards, form-heavy workflows, and their companion mobile apps.

It does four things:

1. **Builds UI that fits the project.** It reads the codebase for tokens, components, domain, and audience before designing anything.
2. **Applies established UX principles and standards,** and says which one drove which decision. When none did, it says the decision was a judgment call.
3. **Keeps the UI consistent:** finds where borders, radii, button colors and states, forms, feedback, and wording drift across screens, and fixes them at the source (the token or the shared component).
4. **Catches "AI slop":** purple gradients, default Inter, identical card grids, gray-on-white text, and the rest of the generic look. It pairs each one with what to do instead.

## The name

*Prepon* (πρέπον) is the Greek rhetorical term for what is fitting: matching form to audience, purpose, and occasion. It's the skill's central test. For every decision, the question isn't "is this good in general?" but "is this fitting for this project and these users?"

## Requirements

- **Claude Code.** Plugin skills need a recent version. This was tested on 2.1.322. Canvas mode's design canvas needs v2.1.265 or later, a claude.ai login, and an organization that hasn't turned off the Design template.
- **Node.js 18 or later** for the bundled scripts. They have no dependencies.
- **Playwright (optional)** in the project you're working on, for before/after screenshots. Prepon uses the project's own install and asks before adding it.
- **Artifacts (optional).** These need a claude.ai login. They aren't available on Bedrock, Vertex, or Foundry, or with `claude -p`. Without them, Prepon falls back to local files and the change summary table.

## Install

From GitHub:

```sh
claude plugin marketplace add PatriusCastro/prepon
claude plugin install prepon@prepon
```

While the repo is private, your git credentials need read access to it.

From a local clone:

```sh
claude plugin marketplace add /path/to/prepon
claude plugin install prepon@prepon
```

For one session only, without installing (useful while editing the skill):

```sh
claude --plugin-dir /path/to/prepon/plugins/prepon
```

After editing skill files, run `/reload-plugins` in the session.

## Commands

Plugin skills are namespaced, so the full command is `/prepon:prepon`. The bare `/prepon` also works as long as nothing else claims that name. You can also skip the command: Prepon triggers on its own when you ask for UI work, and infers the mode.

| Mode | What it does | Example |
|---|---|---|
| `build` | Creates or changes UI, mobile-first, with a slop scan, an accessibility checklist, before/after screenshots for existing screens, and a rationale table. | `/prepon:prepon build a vehicle detail drawer for the dispatch console` |
| `audit <target>` | Reviews existing UI and writes `docs/ui-audit-YYYY-MM-DD.md`. Never edits code. | `/prepon:prepon audit src/pages/PermitApplication.tsx` |
| `fix` | Applies findings from the latest audit in severity order, with before/after. | `/prepon:prepon fix A1-A3` |
| `cite <target>` | Explains an existing design: decision, principle, why it applies, and status. Outputs a paste-ready Markdown table. Never edits code. | `/prepon:prepon cite the transfer review screen` |
| `refs <pattern>` | Finds 3 to 5 real, well-regarded examples with links and what to adapt. Structure only, no copying. | `/prepon:prepon refs multi-step identity verification` |
| `canvas <brief>` | Writes a design brief, publishes three directions as artboards on a design canvas (or an HTML preview as a fallback), reviews each one, then builds the one you pick. | `/prepon:prepon canvas mobile banking settings screen` |

## What an audit looks like

A shortened example for a made-up demo screen:

```markdown
# UI audit: Dispatch console (demo)

Date: 2026-11-12 · Project type: Operations dashboard · Platform: web · Method: code and screenshots

## Summary
The console shows 40 vehicles well on desktop, but alerts use the same red as the brand accent, so
real exceptions don't stand out. On phones the table overflows and the action buttons are 28px.

| Area | Score | Reason |
|---|---|---|
| Usability | 6/10 | Filters work, but there's no default "needs attention" view. |
| Accessibility | 5/10 | Status is color-only; muted text is 2.5:1. |
| Responsiveness and mobile | 4/10 | The table forces horizontal page scroll at 360px. |
| Distinctiveness | 6/10 | Four identical KPI cards with sparklines; the rest is specific. |
| Consistency | 5/10 | Three button variants for one primary action; radius is md everywhere except two drawers. |
| **Total** | **26/50** | |

## Findings
| ID | Severity | Location | Finding | Principle or rule | Suggested fix |
|---|---|---|---|---|---|
| A1 | critical | src/components/StatusPill.tsx:12 | Status shown by color alone | WCAG 1.4.1 | Add a text label and an icon |
| A2 | major | src/pages/Dispatch.tsx:88 | Alert red equals brand red | Von Restorff | Reserve a separate alert token |
| A3 | major | src/pages/Dispatch.tsx:140 | Row actions are 28px | WCAG 2.5.8; Android 48dp | min-h-12 hit area |

## Prioritized fix list
1. A1: blocks color-blind dispatchers from seeing faults.
2. A3: drivers' supervisors use this on phones.
3. A2: …
```

## The slop detector

`plugins/prepon/skills/prepon/scripts/detect-slop.js` scans `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss`, and `.html` files and prints JSON findings. It exits with 1 when it finds anything.

```sh
node plugins/prepon/skills/prepon/scripts/detect-slop.js src/
```

```json
[{ "rule": "gradient-text", "file": "src/Hero.tsx", "line": 6, "match": "bg-clip-text", "suggestion": "Use solid ink or brand color; …" }]
```

To keep a deliberate choice, add `// prepon-ignore <rule-id>` (in JSX: `{/* prepon-ignore <rule-id> */}`) on the line or the line above. A file that quotes slop on purpose, like a docs page, can carry `prepon-ignore-file <rule-id>,...` once instead. With no rule ids, either form ignores all rules.

### The optional slop hook

The plugin ships a hook that runs the detector on every UI file Claude edits and reports findings straight back, so they get fixed while the work is happening. It stays silent until a project opts in:

```sh
mkdir -p .prepon && touch .prepon/hook-on     # this project only (.prepon/ is git-ignored)
# or set PREPON_HOOK=1 in the environment
```

Delete the file to turn it off. Claude Code asks you to approve plugin hooks before they run.

## The page check

`plugins/prepon/skills/prepon/scripts/check-page.js` loads routes in the project's Playwright at 360 and 1440 px, scrolls through each page, and reports what only a rendered page shows: sideways overflow (with the widest offenders), text clipped by its box, text covered by another element, content still invisible after load, lines longer than about 90 characters, and errors on load.

```sh
node plugins/prepon/skills/prepon/scripts/check-page.js --base http://localhost:5173 --routes /,/settings [--reduced-motion]
```

## The consistency scanner

`plugins/prepon/skills/prepon/scripts/scan-consistency.js` lists every radius, border width and color, background, text color, shadow, font size and weight the project uses, with counts and locations. It flags the outliers against the project's own norm. It also groups buttons by style, lists buttons missing states that most others have (hover, focus-visible, disabled, pressed), and finds raw `<button>` elements that bypass an existing `Button` component. Token references (`var(--x)`) are never flagged. When tokens are the norm, raw literals are.

```sh
node plugins/prepon/skills/prepon/scripts/scan-consistency.js --summary src/
```

Audit runs it on the whole source tree and adds a Consistency section to the report. Build runs it first to learn the project's existing values and again afterwards to check it added no new variants. To track another property, add an object to the `PROPERTIES` array at the top of the script.

### Adding a slop rule

1. Add an object to the `RULES` array at the top of `detect-slop.js`:
   ```js
   {
     id: 'neon-glow',
     pattern: /\bshadow-\[0_0_\d+px_[^\]]*\]/g,   // global regex, runs over the whole file
     exts: ['jsx', 'tsx'],                        // optional
     when: /…/, unless: /…/,                      // optional filters on the matched text
     suggestion: 'Use elevation tokens; glows read as decoration.',
   },
   ```
2. Add a matching `### neon-glow` entry under "Mechanical tells" in `references/slop-patterns.md`, with the tell and what to do instead. A rule without an alternative just moves the output to the next default.
3. Add a snippet that triggers it to `test/detect-slop.test.js` and run `node --test test/detect-slop.test.js test/scan-consistency.test.js`. The first test fails if any rule never fires.

## Repo layout

```
.claude-plugin/marketplace.json      marketplace "prepon"
plugins/prepon/.claude-plugin/plugin.json
plugins/prepon/skills/prepon/
  SKILL.md                           router and core workflow
  references/                        ux-laws, slop-patterns, hierarchy, visual-craft, consistency, icons, motion, responsive, mobile, accessibility, project-types, modes, before-after
  scripts/detect-slop.js             slop detector
  scripts/scan-consistency.js        consistency inventory and outliers
  scripts/tap-map.js                 phone tap map, thumb zones, and blurred squint test
  scripts/snapshot.js                before/after screenshots using the project's Playwright
  scripts/check-page.js              rendered-page checks: overflow, clipped or covered text, hidden content, long lines, load errors
  scripts/hook-slop.js               optional hook: slop check after each UI edit (opt in per project)
plugins/prepon/hooks/hooks.json      wires the optional hook
test/                                self-tests for the scripts (not shipped in the plugin)
```

Outputs from real projects (`.prepon/` snapshots and `docs/ui-audit-*.md`) belong in those projects, not in this repo.

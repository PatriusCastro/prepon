---
name: prepon
description: Frontend design and UI review that fits the specific project and its users. Use whenever building, changing, or reviewing any user interface, even if the request never says "design" or "UX". That includes screens, pages, components, layouts, forms, multi-step flows, dashboards, tables, navigation, icons, motion and animation, pagination, visual hierarchy, what users see or tap first on a phone, cluttered or empty-feeling screens, too many cards, mobile screens (React Native), responsiveness, accessibility, contrast, touch targets, design audits, inconsistent UI (mismatched borders, border radius, button colors or behavior, spacing, wording), explaining or justifying a design to a client, finding reference designs, exploring visual directions on a canvas, and complaints such as "this looks generic", "looks AI-made", "looks outdated", "not modern", "make it look better", or "clean this up".
when_to_use: Modes are build, audit, fix, cite, refs, and canvas. Pass the mode as the first argument, or let it be inferred from the request.
argument-hint: "[build|audit|fix|cite|refs|canvas] [target, pattern, or brief]"
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Prepon

*Prepon* is the Greek rhetorical term for what is fitting: form matched to audience, purpose, and occasion. That is the test this skill applies to every decision. The question is never "is this good design in general?" but "is this fitting for this project and these users?" A pattern that is right for a marketing site can be wrong for a benefits application, and a choice that delights developers can confuse a first-time banking customer on a mid-range Android phone.

Generic output is almost always the result of designing without context. Most of this skill is about getting that context first and then letting it drive the choices.

## Choosing a mode

The request is: `$ARGUMENTS`

If the first word is a mode name, use it. Otherwise infer it: making or changing UI is **build**, "review / check / what's wrong with" is **audit**, "apply the fixes" after an audit is **fix**, "why is it like this / justify / document the design" is **cite**, "show me examples of" is **refs**, and "explore options / show me directions before we code" is **canvas**. If two modes are plausible, say which one you picked and why in one line, then continue.

| Mode | Edits code? | Read before starting | Output |
|---|---|---|---|
| build | yes | project-types.md (matching section), then only the references that apply | code, slop and consistency scans, checklist, before/after when changing existing UI, rationale table |
| audit `<target>` | never | modes.md#audit, project-types.md, ux-laws.md, accessibility.md, slop-patterns.md, hierarchy.md, visual-craft.md, consistency.md, icons.md, motion.md, plus responsive.md or mobile.md | `docs/ui-audit-YYYY-MM-DD.md` in the working project |
| fix | yes | modes.md#fix, the latest audit report, before-after.md, consistency.md for consistency findings | fixes in severity order, before/after, change table |
| cite `<target>` | never | modes.md#cite, ux-laws.md, project-types.md | Markdown table ready to paste into client documentation |
| refs `<pattern>` | never | modes.md#refs, project-types.md | 3 to 5 real examples with links and what to adapt |
| canvas `<brief>` | not until a direction is picked | modes.md#canvas, project-types.md, hierarchy.md, visual-craft.md, slop-patterns.md, accessibility.md, plus mobile.md or responsive.md | design artifact with artboards, then a review of each |

All reference files live in `${CLAUDE_SKILL_DIR}/references/`. Read them on demand, not all at once. Loading everything dilutes attention on the parts that matter for this project.

The scripts live in `${CLAUDE_SKILL_DIR}/scripts/`. That path is filled in only here in SKILL.md, so when a reference file writes `<scripts>/detect-slop.js`, use this folder.

## Establish context first

Every mode except refs starts here, and refs still needs the project type. Read the codebase before asking anything, because most answers are already there:

- **Project type and domain:** README, package name, route names, copy in the UI, API names. Match it to a section of `project-types.md`. If none fits, read its "Projects that don't match a type" section.
- **Audience:** who signs in, how technical they are, what device they are likely on. For the enterprise types, users are often non-technical and on mid-range Android phones over unreliable connections, so assume that unless the project says otherwise. For other projects, work out the audience from the project rather than carrying this default over.
- **Platform:** React web, React Native, or both. Check for `react-native`, `expo`, Next.js, Vite, and so on.
- **Existing system:** design tokens, theme files, Tailwind config, CSS variables, component libraries (MUI, Chakra, shadcn, React Native Paper, NativeBase, in-house). Existing tokens are the project's identity. Extend them; don't replace them with your own taste. If the project has no tokens, create a small set first (colors, type scale, spacing, radius) as CSS variables or a theme file, then build with it. That's what keeps the next screen consistent with this one. When a section is deliberately its own product inside a larger one, such as an embedded demo, a white-label area, or a partner portal, give it its own token set scoped to that section (a wrapper class or a theme provider) instead of bending the host's tokens.
- **The de facto system:** when there's existing UI, run `node ${CLAUDE_SKILL_DIR}/scripts/scan-consistency.js --summary <source dir>`. It lists the radii, borders, colors, type, and button variants the project actually uses, and how often. The most common values are the project's real design system, even if nobody wrote it down, so new UI should reuse them (see `consistency.md`).
- **Brand tone:** logo, existing colors, copy voice, any brand guide in the repo.

Then summarize what you found in a few lines. If something essential is still unknown (usually the audience or the brand), ask about that specific thing. A short question now is cheaper than a redesign later, and designing without context is the main way generic UI happens.

## Convention in behavior, distinctiveness in identity

Jakob's law and the anti-slop goal pull against each other. Resolve it like this:

- **Be conventional in behavior.** Navigation placement, form patterns, where primary and destructive actions sit, back behavior, platform idioms (Android back, iOS swipe), error handling, and familiar icons should work the way users already expect. Novel behavior costs users effort, and enterprise users didn't choose your product for its novelty.
- **Be distinctive in identity.** Typography, color, spacing scale, layout rhythm, illustration, and copy voice are where a product earns its own character. This is where generic defaults show up, and where they should be replaced with choices that come from the brand and the domain.
- **Government and banking lean further toward clarity and trust.** For these, distinctiveness means looking unmistakably like *this* institution: steady, legible, and calm. It does not mean looking unusual. When in doubt, choose the option a nervous first-time user would find easiest to trust.
- **Always at a current quality bar.** Avoiding slop must not tip into looking dated. Users compare every product with the polished apps on their phones, and square boxes, heavy outlines, underlined UI links, and missing icons read as neglect, which in government and banking reads as unsafe. Start from the craft baseline in `visual-craft.md`, then make it distinctive. "Calm and trustworthy" and "modern" aren't in tension.

## Build workflow

1. **Context.** Do the steps above. Don't skip this for "small" changes, since small changes are where inconsistent one-off styles creep in.
2. **Read selectively.** Read the matching section of `references/project-types.md` and `visual-craft.md`, the quality bar every screen starts from. Read `hierarchy.md` for any screen you design or change. Then read only what applies: `motion.md` for anything with state changes, overlays, or feedback (nearly every interactive screen), `mobile.md` for React Native or mobile web, `responsive.md` for web layouts, `accessibility.md` for forms, contrast, or interactive components, `icons.md` for any screen with navigation, actions, or status, and `ux-laws.md` when a decision depends on one. Read `slop-patterns.md` before your first build in a session.
3. **Decide the hierarchy, then commit to a direction.** Write the screen's job in one sentence and put its elements into tiers: what users must see first, and the action they'll tap most (hierarchy.md). Then, before writing code, state the visual direction in one or two sentences, tied to the context. Name both the craft baseline and what makes it this product's own. For example: "Modern, calm operations UI on the visual-craft baseline (light app shell with a sidebar, soft layered surfaces, 8 px cards, pill status badges, Lucide icons, real map tiles), with a deep green brand used for actions, a contemporary grotesk, warm neutrals, and compact density, because dispatchers scan many vehicles at once." A stated direction keeps every later choice consistent and gives the user something concrete to push back on.
4. **Before state.** If you are changing UI that already exists, capture it now by following `references/before-after.md`. New screens skip this.
5. **Mobile-first.** Build the narrowest layout first (360 CSS px for web; a 360dp-wide phone for React Native), then add complexity at wider breakpoints. Starting wide tends to produce desktop layouts squeezed onto phones, which is the wrong way round for this audience.
6. **Slop scan.** Run the detector on the files you changed:
   `node ${CLAUDE_SKILL_DIR}/scripts/detect-slop.js <changed files or dirs>`
   It prints JSON findings and exits with 1 if it finds anything. Fix real findings. If a finding is a deliberate, justified choice, keep it, add a suppression comment, and say why in the rationale table. Use `// prepon-ignore <rule-id>` (in JSX, `{/* prepon-ignore <rule-id> */}`) on the line or the line above. A file that quotes slop on purpose, such as docs or a style guide, can carry `prepon-ignore-file <rule-id>,...` once instead. The detector is a smoke alarm, not a judge. Then review the judgment tells in `slop-patterns.md` yourself, since no script can catch those.
   Then run `node ${CLAUDE_SKILL_DIR}/scripts/scan-consistency.js --summary <source dir>` again and check that your change added no new outliers or button variants. A new screen that introduces a fifth radius is how inconsistency starts.
7. **Self-review checklist.** Go through the checklist below and fix what fails.
8. **After state.** If you captured a before state, capture the after state and publish the comparison as described in `before-after.md`. For brand-new screens, still capture and look at the after state when you can (the "New screens" section there). Code that compiles isn't the same as a screen that works at 360 px. Also run `node ${CLAUDE_SKILL_DIR}/scripts/tap-map.js --base <url> --routes <changed routes> --primary "<selector>"`, then look at its blurred, attention, and tap-map images. Tier 1 should stand out first (the predicted look order should match your tiers), and the primary action should be on the first screen and easy to reach. Then run `node ${CLAUDE_SKILL_DIR}/scripts/check-page.js --base <url> --routes <changed routes>` (add `--reduced-motion` for pages with entrance or scroll motion) and fix what it reports: sideways overflow, clipped or covered text, content still invisible after load, overly long lines, and errors on load.
9. **Rationale.** End with a short table: Decision / Principle / Why it applies here. Follow the citation rules below. Above it, give the step count for the screen's main task (ux-laws.md, Interaction cost), as before → after when you changed existing UI.

## Self-review checklist

Check each item against the actual code, not memory. Each one names its source in the references. Report every item with one of these results:

- **Pass (seen)**: verified in a capture or by running it.
- **Pass (code only)**: verified by reading the code, but not seen. This is the honest result for visual items when nothing was captured.
- **Fail**: then fix it.
- **N/A, with a reason**: for example, "no inputs on this page" or "nothing fixed to screen edges". Content sites and static pages will have several of these, and that's fine.

- [ ] Body text contrast is at least 4.5:1, large text at least 3:1, and UI boundaries, focus rings, and icons that carry meaning at least 3:1. (accessibility.md)
- [ ] Web targets are at least 24×24 CSS px (WCAG 2.2 AA). Primary touch targets aim for 44pt on iOS and 48dp on Android. (accessibility.md, mobile.md)
- [ ] No horizontal scrolling at 320 CSS px except for data tables and maps, which get their own scroll container. (responsive.md)
- [ ] Every input has a visible label that isn't just a placeholder, and errors say what went wrong and how to fix it, next to the field. (accessibility.md)
- [ ] Keyboard focus is visible and never hidden behind sticky headers or footers. (accessibility.md)
- [ ] Hierarchy holds: in the blurred capture, tier 1 stands out first. The primary and frequent actions are on the first phone screen, in easy thumb reach or a pinned bar. The load fits the audience, neither overwhelming nor empty. (hierarchy.md)
- [ ] Cards only for objects users act on, never nested, and records shown as rows. (hierarchy.md)
- [ ] State isn't conveyed by color alone: status pills have text or icons as well.
- [ ] Icons are used where they speed recognition (navigation, common actions, status, input affordances), come from one set, and have a visible label or an accessible name. Decorative icons are hidden from assistive technology. (icons.md)
- [ ] Loading, empty, error, and offline states exist for every data region.
- [ ] Safe areas are respected on mobile (notches, home indicator, Android gesture bar). (mobile.md)
- [ ] The main task takes the fewest steps it can: frequent actions are one step away and act in place where they can, known values are prefilled, and only protective steps (confirmations, review before submitting) remain on purpose. (ux-laws.md, Interaction cost)
- [ ] Primary actions are within thumb reach on phones, and destructive actions are not next to primary ones. (mobile.md)
- [ ] Text survives 200% zoom or the OS large-font setting without clipping, tested the way accessibility.md describes. (accessibility.md, mobile.md)
- [ ] Colors, type sizes, spacing, and radii come from tokens, with no new one-off values. One-off layout dimensions (a sidebar width, a table minimum width) can stay as plain values.
- [ ] Matches the project's existing patterns: same button variants and states, radius, borders, form layout, feedback style, and wording as the rest of the product. No new variant without a reason. (consistency.md)
- [ ] Looks current: none of the "signs a design looks dated" in visual-craft.md, checked in a capture when you have one.
- [ ] Every table or record list has pagination (desktop) or "Load more" (phones), with a count. (visual-craft.md)
- [ ] Interactions give feedback within about 100 ms, state changes and overlays have short transitions (100–350 ms, transform and opacity), and `prefers-reduced-motion` is honored. (motion.md)
- [ ] Slop scan is clean, or each remaining finding is justified in the rationale.

## Before and after

Whenever build or fix changes UI that already exists, capture screenshots before and after at 360, 768, and 1440 px wide and publish a side-by-side comparison. The full procedure, the snapshot script, and the fallback rules are in `references/before-after.md`. Two points matter most:

- Make sure `.prepon/` is in the working project's `.gitignore` before writing snapshots. Screenshots of client screens don't belong in version control.
- If you couldn't capture something, say so plainly and give the change table plus the diff instead. Never describe a visual result you didn't actually see. A described screenshot that doesn't exist is worse than none, because the user will trust it.

Always include a change summary table in the reply: What changed / Before / After / Principle or reason.

## Citing principles honestly

Cite a principle only when it actually drove the decision. The value of a rationale table is that a client can trust it, and decorative name-dropping ("Fitts's law" next to every button) destroys that trust quickly. If a choice came from the brand guide, an existing token, a stakeholder request, or plain taste, say so. "Judgment call: matches the existing card style" is an honest and useful entry. When a principle does apply, the "why it applies here" column should mention something specific to this project or its users, not restate the law's definition.

## Mode details

audit, fix, cite, refs, and canvas each have a section in `${CLAUDE_SKILL_DIR}/references/modes.md`. Read the relevant section before starting that mode. It holds the output formats, the audit scoring rubric, and the canvas flow, including how to publish a design canvas or fall back to an HTML preview.

## Platform notes

- React web: prefer the project's styling approach (Tailwind, CSS Modules, styled-components). Use semantic HTML before ARIA, because native elements bring keyboard and screen reader behavior for free.
- React Native: use `Pressable` with `hitSlop` to grow small visual targets, `react-native-safe-area-context` for insets (the built-in `SafeAreaView` is deprecated), and `accessibilityLabel` / `accessibilityRole` on custom controls. Test with the largest system font. The details are in `mobile.md`.

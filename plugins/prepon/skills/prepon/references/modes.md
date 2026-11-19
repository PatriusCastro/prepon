# Mode details

Each section assumes you've already established project context as described in SKILL.md.

## Contents

- [audit](#audit)
- [fix](#fix)
- [cite](#cite)
- [refs](#refs)
- [canvas](#canvas)

---

## audit

Reviews existing UI and writes a report. It never edits source code. An audit people can trust has to be separate from the fixing, so the user decides what changes.

1. **Resolve the target.** It can be a file, a directory, a component name, or a route. Find the files that render it, including the shared components and styles it depends on. If the target is ambiguous, list what you found and ask.
2. **Read the references:** the matching section of project-types.md, then ux-laws.md, accessibility.md, slop-patterns.md, ux-writing.md, hierarchy.md, visual-craft.md, consistency.md, icons.md, motion.md, and responsive.md or mobile.md depending on the platform.
3. **Run both scanners** (the scripts folder is named in SKILL.md). Treat their findings as leads and confirm each one in context before reporting it.
   - `node <scripts>/detect-slop.js <paths>` on the target's files.
   - `node <scripts>/check-page.js --base <url> --routes <target routes>` when a dev server is available. Its issues (overflow, clipped or covered text, hidden content, long lines, load errors) go into the findings with the evidence it prints.
   - `node <scripts>/tap-map.js --base <url> --routes <target routes> --primary "<selector>"` when a dev server is available. Read the blurred and tap-map images as described in hierarchy.md.
   - `node <scripts>/motion-perf.js --base <url> --routes <target routes> --cpu 4` when a dev server is available and the target has motion. Add `--cpu 6` when its users are likely on budget phones: consumer apps in price-sensitive markets, field staff on company-issued devices. Its numbers go in the Motion on a slow phone section.
   - `node <scripts>/scan-consistency.js --summary <source dir>` on the whole product the target belongs to, not just the target. If a repo holds several separate products (consistency.md), scan only the one the target belongs to. Consistency is relative to the rest of the product, so the norm comes from everywhere and the findings are what departs from it inside the target.
4. **Look at it if you can.** If a dev server and Playwright are available, capture the target with `snapshot.js --phase audit` (see before-after.md) and review the images too. Many layout and hierarchy issues only show up visually. If you couldn't look, say the audit is code-only.
5. **Count the steps** for the target's top three tasks, as described under Interaction cost in ux-laws.md. Each avoidable step is a usability finding.
6. **Review** against each area of the rubric below, the judgment tells in slop-patterns.md, and the behavior checklist in consistency.md: button states, action placement, forms, feedback, overlays, and wording, compared across the screens in scope. Walk the main flow once against the ten usability heuristics (ux-laws.md) and cite the heuristic ("H5 Error prevention") on each finding it explains. Read every string in scope once, in order, with the checks in ux-writing.md, and quote each copy finding with its replacement. Check motion against "How to check" and "Low-end devices" in motion.md. Motion that drops frames at `--cpu 4` in a core flow is a major finding.
   Then list **opportunities**: things that work but would serve these users better, each tied to a principle. Most are motion: a press or state change with no feedback, a main-thread animation that could run on the compositor, a loop that runs off screen, an effect that drops frames only at `--cpu 6`. Opportunities never go in Findings and never change the score, so the audit stays a fair measure of what is wrong.
7. **Write the report** to `docs/ui-audit-YYYY-MM-DD.md` in the working project. Create `docs/` if it's missing, and add `-2`, `-3` and so on if a report for today already exists. Use the template below. This file is the record that fix mode reads.
8. **Publish the report as a page** (see [Report page](#report-page) below). The Markdown is for the repo; the page is what people read. Publish it as an artifact with the captures as supporting files. If artifacts aren't available, write it to `.prepon/audit/YYYY-MM-DD/index.html` and give the path.
9. **Reply** with the score summary, the critical and major findings, how many opportunities there are, the page link, and the file path.

### Report page

Someone should take in the result in a minute without reading the Markdown. If a data-visualization skill is available, load it before drawing the charts. Then build, in this order:

1. **Verdict.** The target's name and one plain sentence: is it in good shape, and what are the one or two things to fix. No principle names here.
2. **Stat tiles,** four in a row (two on phones): the total score out of 50, then the counts of critical, major, and minor findings, each with a three-or-four-word note ("nothing blocks the task").
3. **Charts, all built from one component** so they read the same: a card with a title, a one-line takeaway that states the answer, horizontal bars (label left, bar, value right, one bar colour), a reference line where there's a limit, a short legend when a second colour or a line appears, an axis with a few ticks, and a "Show as table" view. Every bar has a tooltip on hover and keyboard focus. Use a second colour, with its icon and label, only for the values that are findings. Draw the charts the audit has data for, and skip the rest:
   - score by area, each out of 10, as a meter
   - frames dropped while scrolling per route from motion-perf, with the 10% limit
   - contrast ratio per token pair against its WCAG minimum, the lower of light and dark
   - tap targets on the first phone screen per route from tap-map, with the guideline of 12
   - steps for each top task
4. **What to fix, in order.** One numbered card per finding, in the prioritized order: a severity chip that pairs an icon with the word (Critical, Major, Minor), a plain title that says what goes wrong for the user, two lines on what happens and the fix, then the ID and file location in small type. Quote the evidence that convinces, such as a reproduced wrong value.
5. **What users see first.** The tap-map attention captures for three or four key routes, with a switch to the blurred captures.
6. **Not checked,** as a short list.

Write for someone who wasn't there: plain words, sentences under about 20 words, findings named by their effect ("the amount can change while you type"), not by the rule ("Postel's law"). The full principle and rule citations stay in the Markdown. Check the page at phone and desktop widths in both themes before publishing.

### Severity

- **Critical:** blocks or derails a core task, risks data or money loss, or fails WCAG 2.2 AA in a core flow (for example, the login button contrast or an unlabeled required field).
- **Major:** real friction or confusion in a common task, or an AA failure off the core flow, or a slop tell that undermines trust in this domain. This includes behavior inconsistencies users will trip over: the primary action moving between screens, destructive actions styled differently, or the same action under different names.
- **Minor:** visual inconsistency (a stray radius, border color, or button shade), polish, or a low-impact convention break.

### Scoring (out of 50)

Score each area from 0 to 10. Use the anchors, and give one sentence explaining each score. Don't average your way to 7 out of habit. A screen with a critical accessibility failure in its main flow can't score above 5 on accessibility.

| Area | 9–10 | 6–8 | 3–5 | 0–2 |
|---|---|---|---|---|
| Usability | Core tasks are obvious and efficient. Clear hierarchy: what matters stands out first, and the load fits the audience. Conventions are followed, and errors are recoverable. | Works, with friction or a muddy hierarchy in places. | Users will struggle or make errors in a core task. | Core task blocked or very confusing. |
| Accessibility | Meets WCAG 2.2 AA throughout, as far as can be checked. | A few AA gaps off the core flow. | AA failures in the core flow. | Unusable with keyboard or screen reader. |
| Responsiveness and mobile | Works well at 320 to 1440. Targets, safe areas, and thumb reach handled. The primary action is on the first phone screen and easy to reach. | Minor breakage at some widths. | Phone layout is a squeezed desktop. Small targets. | Broken or unusable on phones. |
| Distinctiveness | Identity clearly comes from the brand and domain, crafted to a current quality bar. No unjustified slop tells, and nothing dated. | Mostly specific, with some defaults or dated details. | Reads as a template, or as a neglected older intranet. | Pure default output. |
| Consistency | Things that do the same job look and behave the same across screens: one radius scale, one set of button variants with full states, one form and feedback pattern, one term per concept. | A few visual outliers, or one behavior that drifts. | Several button styles or radii, and behavior that differs between screens. | Reads as several products stitched together. |

Score Consistency against the whole product, not the target alone, since the norm comes from the full source scan. If the target is the only screen there is, score it on internal consistency and say so in the reason.

### Report template

```markdown
# UI audit: <target>

Date: YYYY-MM-DD · Project type: <type> · Platform: <web / React Native> · Method: <code and screenshots | code-only>

## Summary

<3–5 sentences: what the screen is for, the overall verdict, and the most important problem.>

| Area | Score | Reason |
|---|---|---|
| Usability | x/10 | … |
| Accessibility | x/10 | … |
| Responsiveness and mobile | x/10 | … |
| Distinctiveness | x/10 | … |
| Consistency | x/10 | … |
| **Total** | **xx/50** | |

## Findings

| ID | Severity | Location | Finding | Principle or rule | Suggested fix |
|---|---|---|---|---|---|
| A1 | critical | src/pages/Login.tsx:42 | … | WCAG 1.4.3 Contrast | … |

## Hierarchy and tap map

<For each screen: its job in one sentence, then a table of Element / Tier / Predicted look order / Thumb zone / Fix, from the blurred, attention, and tap-map captures. Say the look order is predicted, or name the analytics it came from. Paths to the images. Mark it code-only if nothing was captured.>

## Task steps

| Task | Count | Path | Avoidable | Fix |
|---|---|---|---|---|
| Approve an expense | 6 | open list → open claim → scroll → Approve → confirm → back | open claim, back: approve from the row | A4 |

<The top three tasks for the target. Keep deliberate steps, such as a confirmation before an irreversible action, and say so.>

## Consistency

| Property | Values found (count) | Canonical | Why canonical | Outliers |
|---|---|---|---|---|
| Button radius | md (24), lg (3), 2xl (1) | md | most common; matches inputs | Settings.tsx:40 (lg), Promo.tsx:12 (2xl) |
| Primary button | 3 variants | bg-primary, h-11 | defined in Button.tsx | 7 raw `<button>` bypass the component |

<Then the behavior differences found, such as "Save" vs "Submit", or errors shown inline on one form and as a toast on another. Each one also gets a row in Findings.>

## Motion on a slow phone

| Route | CPU | Idle: fps, dropped | Scroll: fps, dropped | Main-thread or off-screen animations | Verdict |
|---|---|---|---|---|---|
| / | 4× | 58, 2% | 44, 23% | lens-flow: offsetDistance (12) | major: A6 |

<From motion-perf.js. Say the throttling is an emulation, and whether a real device was used. Write "no motion to measure" or "no dev server" instead when that applies.>

## Prioritized fix list

1. A1: <one line, the reason it comes first>
2. …

## Opportunities

| ID | Location | Opportunity | Why (principle) | Effort | Risk |
|---|---|---|---|---|---|
| O1 | src/Hero.tsx:30 | Run the chip flow as translate keyframes instead of offset-path | motion.md, compositor-only properties: holds 60 fps at 4× | M | the curves need redrawing as keyframes |

<Improvements, not defects: they don't affect the score. Fix applies them only when asked by ID.>

## Not checked

<What couldn't be verified, such as screen reader behavior or real-device performance, and why.>
```

Order findings by severity, then by how many users they affect. Number IDs A1, A2 and so on, and opportunities O1, O2, so the fix mode can refer to them.

---

## fix

Applies fixes from an audit, in severity order.

1. **Find the audit:** the most recent `docs/ui-audit-*.md`, unless the user names one. If there isn't one, offer to run an audit first. Fixing without one turns into an unreviewed redesign.
2. **Scope:** use the findings the user asked for ("top three", "A1–A4", "all criticals"). If they didn't say, propose all criticals plus the majors that touch the same files, and confirm. Opportunities (O1, O2…) are applied only when the user names them ("O1–O3", "the motion opportunities"); never add them to the default proposal.
3. **Capture the before state** (before-after.md).
4. **Fix in severity order:** criticals first, then majors, then minors. Keep each fix as small as it can be while still addressing the cause. A contrast finding is fixed in the token, not by overriding one component. Consistency findings follow "Fixing inconsistencies" in consistency.md: fix the token or the shared component, then point the outliers at it. If a fix needs a design decision the audit didn't settle, such as which of two equally common values wins, ask. Named opportunities come after the findings, held to the same rule: the smallest change that delivers it.
5. **Re-check:** run the detector on the changed files, re-run `scan-consistency.js` when you fixed consistency findings, and re-check each fixed finding against its rule. When you changed motion, re-run `motion-perf.js` with the same routes and `--cpu` as the audit and compare the numbers.
6. **Capture the after state** and publish the comparison.
7. **Update the report.** Append a "Fixes applied (YYYY-MM-DD)" section to the audit file listing each finding and opportunity ID, what was done, whether it was verified visually or in code only, and the before and after motion-perf numbers for motion changes.
8. **Reply** with the change summary table (What changed / Before / After / Principle or reason) and the comparison link.

---

## cite

Explains an existing design for client documentation. It never edits code.

1. **Read the target** and identify its notable decisions: layout structure, navigation, primary action placement, form patterns, type and color choices, density, states, and platform behavior. Skip trivia.
2. **For each decision,** decide honestly which of these applies:
   - **Justified.** A principle or standard supports it, and it fits this project's users.
   - **Judgment call.** It's reasonable, but no principle drove it (brand preference, consistency with existing screens, taste). Say so. That's a legitimate answer.
   - **Unjustified.** There's no clear reason, and it costs something.
   - **Contradicts.** It goes against a principle or standard. Name which one and why it matters here.
3. **Output** a Markdown table in the reply, ready to paste:

```markdown
| # | Decision | Where | Principle or standard | Why it applies to this project | Status |
|---|---|---|---|---|---|
| 1 | Single-column form with labels above fields | ApplicationForm.tsx | Gestalt continuity; WCAG 3.3.2 | Applicants on phones fill this in one pass. A single reading line prevents skipped fields. | Justified |
| 2 | Teal accent color | theme.ts | none | Matches the agency logo. | Judgment call |
```

Then add a short "Flagged" list below the table for the Unjustified and Contradicts rows, each with a one-line suggestion. The "why it applies" column has to mention something about this project or its users. If it would just restate the law, the citation is decorative, so drop it.

---

## refs

Finds 3 to 5 real, well-regarded reference designs for a pattern, relevant to the project type. They inform structure and behavior. They are not visuals to copy.

1. **Clarify the pattern** if it's vague ("onboarding" for whom? On which platform?).
2. **Search the web.** If the WebSearch tool is deferred, load it first. Good sources for these domains:
   - public design systems with documented patterns: GOV.UK Design System, U.S. Web Design System, Material Design, Apple HIG, IBM Carbon, Atlassian, Shopify Polaris
   - well-regarded public services
   - published case studies from banks or operations-software teams

   Prefer pattern pages with documented reasoning over screenshot galleries. For how a pattern looks in shipped products today, use the tiered sources in visual-craft.md ([Calibrating "modern"](visual-craft.md#calibrating-modern-against-real-work)). Never use concept galleries such as Dribbble or Behance as evidence.
3. **Verify every link** by fetching it. Don't list a URL you haven't confirmed exists and shows what you claim.
4. **Output** a table: Example / Link / What it does well / Principle it demonstrates / What to adapt for this project. Then add two or three lines on which structure you'd borrow and how the project's own identity would differ.

Adapt the structure: step order, information hierarchy, interaction pattern, and error handling. Don't reproduce another product's visual design, logo, illustrations, or distinctive styling, both for legal reasons and because copying their identity is just a different kind of generic.

---

## canvas

Visual exploration before any code changes.

1. **Context:** establish it exactly as build does.
2. **Brief:** write a design brief and show it to the user. It covers:
   - project type, audience, platform, and the task the screen supports
   - real content to use (realistic labels and data, not lorem ipsum)
   - the constraints that apply: minimum targets, contrast floors, safe areas, and the slop tells to avoid for this domain
   - the number of directions, three by default. Make them distinct in identity (type, color, density, layout rhythm) while all following the same behavioral conventions. Three color swaps of one layout isn't exploration.
3. **Publish the canvas.**
   - **Design canvas:** call the Artifact tool with `action: "quickstart"` and `intent: "design"`. If the result offers the Design type (the same canvas `/design` produces), create the artifact from that type with the brief and follow the type's own instructions. Make one artboard per direction at the target device size (360 wide for phones; add 1440 for web).
   - **Fallback:** if the Design type isn't offered, or artifacts aren't available in this session, build one self-contained HTML page with the directions side by side as device-sized frames and publish it as a regular artifact.
   - Tell the user which path you used and give the link. If artifacts aren't available at all, write the HTML to `.prepon/canvas/` and give the path.
4. **Review each direction** against this skill's rules. For each one, give strengths, issues (contrast, targets, slop tells, convention breaks), and the principles involved, following the honest citation rules. If you wrote HTML, run the detector on the file path itself (`detect-slop.js <file>`), because folder scans skip `.prepon/`. Device frames and canvas labels are mockup chrome, not app surfaces: suppress their findings with a reason, and judge only the app inside the frame. A clean result on HTML is weaker evidence than on app code, so also check contrast from the actual color values, and look at a blurred capture of each frame for hierarchy (hierarchy.md). Then say which direction you'd pick for this project and why, in one or two sentences.
5. **When the user picks one,** switch to build. The chosen direction becomes the visual direction in build step 3. Implement it in the codebase, then run the slop scan and the self-review checklist as usual. If the user edited the canvas in the browser, read the artifact first and build from their version.

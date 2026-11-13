# UX laws as design rules

This file has no definitions. You already know them. For each law it gives when it applies, the concrete rule it implies, how to check that rule in a screen or in code, and the most common way people misuse it. Cite a law only when it actually shaped a decision.

## Contents

- [Miller's law](#millers-law)
- [Hick's law](#hicks-law)
- [Fitts's law](#fittss-law)
- [Jakob's law](#jakobs-law)
- [Tesler's law (conservation of complexity)](#teslers-law)
- [Interaction cost](#interaction-cost)
- [Postel's law (robustness principle)](#postels-law)
- [Doherty threshold](#doherty-threshold)
- [Von Restorff effect (isolation)](#von-restorff-effect)
- [Zeigarnik effect](#zeigarnik-effect)
- [Serial position effect](#serial-position-effect)
- [Peak-end rule](#peak-end-rule)
- [Aesthetic-usability effect](#aesthetic-usability-effect)
- [Gestalt principles](#gestalt-principles)

---

## Miller's law

**Applies when** users have to hold information in their heads while doing something else: copying a reference number between screens, comparing plans, remembering a code from an SMS, or keeping track of where they are in a long form.

**Rule.** Don't make people remember what the screen could show them. Chunk long strings (account and reference numbers in groups of 3 or 4), keep earlier answers visible on summary steps, and show the comparison side by side instead of across tabs.

**Check.** Walk the task and note every moment the user must carry a value from one view to another. Each one is a candidate to display, prefill, or copy with one tap. Look for long unbroken numbers in the UI.

**Misuse.** Treating it as "at most 7 menu items." The law is about working memory during a task, not about how many options a visible menu may hold. A visible list can be scanned, so it doesn't need to be memorized. Cutting a well-organized navigation down to 7 arbitrary items can hide what people need.

## Hick's law

**Applies when** users pick from a set of options with no strong expectation of where the answer is: first-run choices, action menus, filter panels, and dashboards with many equal-weight tiles.

**Rule.** Reduce the options shown at the moment of decision, or make the likely choice obvious. Use a clear primary action, sensible defaults, progressive disclosure for advanced settings, and grouping with headings so users decide between a few groups before scanning within one.

**Check.** Count the equally weighted options on the screen at the decision point. If there are more than a handful with no visual priority, ask which one most users need and whether the rest can be grouped or deferred.

**Misuse.** Splitting one decision into many sequential screens to "reduce choices." Each extra step adds load time and navigation cost. Hick's law also doesn't apply to lists users search by name (countries, banks), where a long sorted list or type-ahead beats nested categories.

## Fitts's law

**Applies when** an action is frequent, important, or done one-handed on a phone. Also with small icon-only controls, and with destructive actions placed near common ones.

**Rule.** Make frequent targets large and close to where the pointer or thumb already is. Put primary mobile actions in the bottom area of the screen. Keep destructive targets small or far from primary ones, and add confirmation or undo. Full-width buttons in mobile forms are a direct application.

**Check.** Measure the target's hit area, not its icon (see the minimums in accessibility.md and mobile.md). Check the spacing between adjacent targets. On phones, check where the primary action sits relative to the thumb zone.

**Misuse.** Making everything big. If every control is a large, prominent button, size stops signaling priority. That is a Von Restorff problem caused by a Fitts justification. Also, the law is about movement time, so it is weak justification for desktop-only layouts where the mouse travels anyway.

## Jakob's law

**Applies when** you decide behavior: navigation, form controls, where the cart, profile, or logout sits, platform gestures, and how errors and confirmations appear. It carries extra weight for non-technical users, who rely on habits from apps they already use (banking apps, government sites, WhatsApp-style patterns).

**Rule.** Use the conventions users already know for behavior and placement. Put your distinctiveness into identity (type, color, rhythm), not into how things work. SKILL.md has the full convention-versus-distinctiveness rule.

**Check.** For each interaction, ask whether a user of the two or three most common apps in this domain would know what it does without help. On Android, check that the system back button does the expected thing.

**Misuse.** Using it to justify copying another product's whole visual design, or to reject any visual identity at all. The law is about expectations of how things behave, not permission to look identical. It also isn't a reason to keep a bad convention that users have already learned to work around.

## Tesler's law

**Applies when** a workflow has unavoidable complexity: tax rules, eligibility checks, loan calculations, routing constraints, or multi-party approvals. The question is who absorbs the complexity, the system or the user.

**Rule.** Move complexity into the system wherever it can be computed or looked up. Prefill from known data, calculate totals and eligibility instead of asking users to, infer the format of an input, and choose defaults from context.

**Check.** For each field, ask whether the system already knows the answer or could derive it. For each instruction text, ask whether the system could do the step instead of explaining it.

**Misuse.** Hiding complexity the user actually needs to see. In finance and government, users often must understand a consequence (fees, deadlines, legal effects). Making that disappear isn't simplification. Show the consequence in plain language and remove the work.

## Interaction cost

**Applies when** a task is done often: approvals, data entry, triage queues, checkout, search and filter, and settings people change regularly. Every click, tap, typed field, scroll, and decision is a cost the user pays, and frequent tasks pay it many times a day.

**Rule.** Count the steps on the paths users take most and cut them. Act in place instead of opening a page (inline edit, row actions, bulk select). Prefill and default from what's known (see Tesler's law), and remember the last choice. Put the frequent action one step away and the rare one behind "More". Give repeated work keyboard shortcuts. Fewer steps only counts when each remaining step is obvious: a click users are sure about costs less than a choice they have to think about.

**Check.** Name the top three tasks for the screen. For each, list the steps from arrival to done (click, type, scroll, choose, wait) and count them. Then look for steps the system could take instead, steps that open a page where an inline action would do, and frequent actions hidden behind a menu. When changing UI, give the count before and after.

**Misuse.** Removing steps that protect people: confirmation before destructive or irreversible actions, and review before payment or submission are deliberate costs. So is putting every option on one screen to save a click. That trades clicks for thinking, which costs more. The "three-click rule" is folklore; users don't mind clicks when each one clearly moves them forward.

## Postel's law

**Applies when** users type data: phone numbers, IDs, dates, amounts, addresses, and names. It also applies to data from other systems that may be inconsistent.

**Rule.** Be liberal in what you accept and strict and clear in what you show. Accept spaces, dashes, and pasted formatting in numbers and strip them yourself. Accept local date input styles. Then display a normalized, confirmed version back to the user.

**Check.** Try pasting a value with spaces, a leading +63 or +1, or a trailing space into each field. If it's rejected, the system is making the user do formatting work. Check that the error messages name the problem and the expected format.

**Misuse.** Accepting anything and silently guessing. For money and identity fields, a wrong guess is worse than a clear request. Be lenient about formatting and strict about meaning, and confirm before committing.

## Doherty threshold

**Applies when** an interaction has latency: search, filtering, saving, submitting, and loading dashboards. It matters a lot on mid-range Android phones over mobile data, where many enterprise users are.

**Rule.** Respond to every input within about 400 ms, even if the work takes longer. Give immediate visual feedback (pressed state, inline spinner, optimistic update), use skeletons shaped like the real content for loads, and show progress for anything longer than a few seconds.

**Check.** Throttle the network in dev tools (Slow 4G) and use CPU slowdown. Tap each action and see whether something visibly changes right away. Check that double-tapping submit can't create two records.

**Misuse.** Adding fake delays or decorative loading animations to feel "premium," or showing a full-screen spinner for a 100 ms request, which causes flicker. Feedback should be proportional to the wait.

## Von Restorff effect

**Applies when** one item must stand out: the primary action, a critical alert, an overdue status, or the recommended plan.

**Rule.** Reserve a distinctive treatment (strong color, weight, or shape) for the one thing that matters and keep everything else visually quieter. In dashboards, save the alert color for real alerts.

**Check.** Squint at the screen or blur a screenshot. The thing that stands out should be the thing that matters. Count how many elements use the accent color. If it's most of them, nothing stands out.

**Misuse.** Highlighting several things "a bit," which cancels the effect. Relying on color alone also excludes color-blind users and fails WCAG 1.4.1. Pair the contrast with text, an icon, or position.

## Zeigarnik effect

**Applies when** tasks are long or interrupted: multi-step applications, onboarding, document uploads, and profile completion.

**Rule.** Make unfinished work visible and easy to resume. Save drafts automatically, show which steps are done and what remains, and bring users back to where they left off.

**Check.** Start a multi-step form, leave halfway (close the tab, kill the app), and return. Is the data still there? Can the user see what's left?

**Misuse.** Using "incomplete" nagging to manipulate, like profile completion bars that push users to hand over optional personal data. In government and banking this erodes trust. Show progress on tasks the user chose to start, not on goals the business wants them to adopt.

## Serial position effect

**Applies when** users scan a list or sequence: navigation bars, settings lists, onboarding steps, and options in a select.

**Rule.** Put the most important items first and last, where they are remembered best, and the less important ones in the middle. In a bottom tab bar, the first and last positions are well suited to the most-used destinations.

**Check.** List the items in order and mark the two or three most important. Are they at the edges?

**Misuse.** Reordering a familiar or logical sequence (alphabetical lists, chronological steps, the platform's settings order) just to exploit the effect. A predictable order beats an "optimal" one users have to relearn.

## Peak-end rule

**Applies when** an experience has an emotional high or low point and a clear ending: submitting an application, completing a payment, resolving an error, and finishing onboarding.

**Rule.** Invest in the worst moment and the final moment. Make error recovery humane (keep the user's data, explain plainly, offer a next step), and make completion clear and reassuring: a reference number, what happens next, when, and how to get help.

**Check.** Identify the most stressful step (often payment, upload, or identity verification) and the end screen. Is the error state as designed as the happy path? Does the confirmation answer "did it work, and what now?"

**Misuse.** Confetti and celebration on serious tasks. A benefits claim or a loan application isn't a game. A calm, specific confirmation is the right peak here.

## Aesthetic-usability effect

**Applies when** you weigh polish against function, or when you interpret user feedback. Users tend to rate better-looking interfaces as easier to use and forgive minor problems in them.

**Rule.** Craft is worth investing in, especially for trust-sensitive domains, where a sloppy UI reads as an unsafe institution. Treat it as a reason to get the basics right (alignment, consistent spacing, type hierarchy), not as a reason to add decoration.

**Check.** When users praise a design, verify with task completion rather than opinion. Look at alignment, spacing consistency, and type scale before adding any visual effect.

**Misuse.** Using it to justify slop: gradients, glass, and animation that make a screen look "modern" while hiding usability problems. The effect also masks problems in testing, because users who like the look report fewer issues than they hit.

## Gestalt principles

**Applies when** you lay out anything with groups: forms, cards, dashboards, tables, and settings screens. These principles explain how users will read structure before they read words.

| Principle | Rule | Check | Common misuse |
|---|---|---|---|
| Proximity | Space within a group is clearly smaller than space between groups. Labels sit closer to their own field than to the previous one. | Measure the gap from each label to its own field and to the field above. The label should be closer to its own field. | Uniform spacing everywhere, so nothing groups. |
| Similarity | Things that behave alike look alike, and things that behave differently look different. Links look like links, and buttons look like buttons. | List every clickable style. Each distinct style should mean one thing. | Styling static tags like buttons, or giving primary and secondary buttons nearly identical looks. |
| Common region | A shared background or border groups content. Use it for genuinely separate units. | For each card or panel, ask what would break if you removed the box. If nothing, use spacing instead. | Boxing everything, so cards inside cards inside cards. |
| Continuity | Align elements on shared edges so the eye follows a line. Keep form fields in one column. | Check left edges in a form. Multi-column forms break the reading line and cause skipped fields. | Two-column forms on desktop for unrelated fields. |
| Closure and figure-ground | Users complete partial shapes and separate foreground from background. Overlays, sheets, and modals need clear separation from the content behind them. | Check that modals have a scrim and focus is trapped. Check that the sheet edge is visible against the page. | Low-contrast overlays that make it unclear what is interactive. |
| Uniform connectedness | Visual connections (lines, shared containers) show relationships more strongly than proximity does. Use them for steppers, timelines, and related fields. | In a stepper, do the lines and states make the order and current step obvious without reading the labels? | Decorative lines that imply relationships that don't exist. |
| Prägnanz (simplicity) | People read the simplest structure available. Prefer simple, regular layouts that make the structure obvious. | Can you describe the layout of the screen in one sentence? | Complex asymmetric layouts in task-focused enterprise screens. |

# Hierarchy, balance, and load

Every screen answers two questions within a second or two: "what is this?" and "what do I do here?" Visual hierarchy decides whether it answers them. When everything has the same weight, users have to read the whole screen to find their way, and on a phone, a tired or anxious user gives up. When too little is on the screen, users don't know what to do next or don't trust that anything happened.

This file covers deciding what matters, checking what actually draws attention and where thumbs land, balancing the layout, and calibrating how much is on screen.

## Contents

- [1. Decide what the screen is for](#1-decide-what-the-screen-is-for)
- [2. Check it: squint test and tap map](#2-check-it-squint-test-and-tap-map)
- [3. Balance](#3-balance)
- [4. Load: overwhelmed or underwhelmed](#4-load-overwhelmed-or-underwhelmed)
- [5. Cards are for objects, not for layout](#5-cards-are-for-objects-not-for-layout)
- [6. Fixing hierarchy problems](#6-fixing-hierarchy-problems)

---

## 1. Decide what the screen is for

Before styling anything, write down:

- **The job of the screen, in one sentence.** For example: "The dispatcher sees which vehicles need action and handles them."
- **What the user must see first.** Usually one thing, the answer to why they came: the balance, the status, the alerts, the next step.
- **The most frequent action.** That's what thumbs will hit most on a phone. Derive it from the task: the primary action, switching between the main destinations, back, search in long lists, and tapping rows to open them. If the project has analytics or session recordings, use them instead of guessing.

Then put every element on the screen into a tier:

| Tier | What belongs here | How many |
|---|---|---|
| 1 | The answer the user came for, and the primary action | 1, at most 2 |
| 2 | Supporting information and actions used often | 3 to 5 |
| 3 | Everything else: metadata, secondary and rare actions, links, legal text | the rest |

Visual weight comes from size, font weight, contrast, color, position, and space around an element. Give tier 1 the most, give exactly one element the strongest treatment, and step each tier down clearly. If two things share the top weight, the user has to choose where to look, so neither is first.

On phones, place by frequency:
- The primary action and frequent actions go in the easy thumb zone: the bottom half, or a pinned bottom bar.
- Rare actions, settings, and destructive actions go higher up or behind a menu.
- Back and close stay where the platform puts them (mobile.md).

## 2. Check it: squint test and tap map

Your intended hierarchy and what the screen actually does can differ, so check a capture. With a dev server and Playwright available, run this (`<scripts>` is the folder named in SKILL.md):

```
node <scripts>/tap-map.js --base http://localhost:5173 --routes login,dashboard --primary "button[type=submit]"
```

It writes three images per route at 360×800 into `.prepon/snapshots/<stamp>/tapmap/`, and prints JSON:

- **`-blur` image, the squint test.** The page blurred so text can't be read. The first one to three shapes that stand out are what users notice first. They should be your tier 1. If a header band, an illustration, a decorative chart, or a secondary button wins instead, it's stealing attention: demote it.
- **`-attention` image, the predicted first looks.** The top five things on the first screen, numbered in the order users are likely to look at them, with the primary action in purple. The order is scored from size (font size for text, area for fills and images), contrast with what's behind, position (top and left first), and a colour few other things share. It's a prediction to compare against your tiers, not eye-tracking. It knows nothing about faces or meaning, and it can underrate a small, saturated button. Read it next to the blurred image, and when the project has real click or scroll heatmaps (PostHog, Clarity, Hotjar, GA), those win.
- **`-taps` image, the tap map.** Every tappable target on the first screen is boxed by thumb zone: green is easy, amber is a stretch, red is hard, and purple means too small. The primary action has a ★.
- **JSON:** each target's zone, size, gap to its neighbor, and whether it's on the first screen. `attention` lists the top eight of the predicted order with scores, and `primaryRank` gives where the primary action falls. Then first-screen totals (number of targets, words, distinct font sizes), how many screens tall the page is, and issues:
  - `small-target`: under 44 px, or under 24 px, which fails WCAG
  - `crowded`: a small target less than 8 px from another
  - `primary-below-fold` or `primary-hard-to-reach`
  - `primary-not-salient`: the primary action isn't among the first three predicted looks; the issue names what comes first instead
  - `busy-first-screen`: more than 12 targets
  - `no-action-on-first-screen`
  - `page-did-not-render`
  - `page-wider-than-viewport`: fix the sideways scroll first, because a phone zooms out to fit the page and the other figures are unreliable until then

For a repeated action, such as "open" on every row, pass a selector that matches all of them; the tap map judges the best placed one. Controls built from `div`s with click handlers aren't targets at all, so a missing primary can mean exactly that.

The zones come from research on how people hold phones, so the tap map is a prediction, not a measurement. Treat its issues as questions. Look at both images, then summarize per screen:

| Element | Tier | Draws attention now? | Thumb zone | Fix |
|---|---|---|---|---|
| "Pay now" button | 1 | 3rd, after the header and the promo card | stretch (mid-screen) | Pin to the bottom bar; quiet the promo card |

Without a capture, do the same reasoning from the code and say the result is code-only.

## 3. Balance

- **Distribute weight.** Heavy elements (dark fills, images, large type, charts) shouldn't all sit on one side or at the top while the rest of the screen is empty. On desktop, compare the left and right halves. On phones, compare the top and bottom of the first screen. The blurred capture shows this at a glance: it should have one clear focal point and otherwise even weight, not a heavy block and a void.
- **Align to a grid.** Use shared left edges, consistent gutters, and one alignment axis per column. Misaligned edges make a screen look unbalanced even when the weight is even.
- **Space with intent.** More space between groups than within them (Gestalt proximity). Generous space around tier 1. Tighter space in dense tier 3 areas. Equal spacing everywhere flattens the hierarchy.
- **Keep the rhythm.** Repeated sections share the same internal structure and spacing, so users learn the pattern once.

## 4. Load: overwhelmed or underwhelmed

The right amount depends on the audience:
- **First-time, occasional, or anxious users** (citizens on a government service, banking customers moving money) need fewer things per screen, more space, and one decision at a time.
- **Daily experts** (dispatchers, back-office staff) want density: everything relevant in view, fewer clicks, keyboard shortcuts.

Decide which one you're designing for before judging the load.

**Signs of overwhelm.** These are heuristics for a phone's first screen on a task screen:
- more than about 12 tappable targets
- more than 3 or 4 distinct font sizes
- more than one accent-colored element competing for attention
- more than about 120 to 150 words
- several buttons that all look primary
- every item dressed up with a card, badge, and icon
- unrelated things side by side
- a desktop table squeezed onto a phone

**Fixes for overwhelm:**
- one primary action, with secondary actions moved to a menu or lower down
- progressive disclosure: details behind "More", in accordions, or on a detail screen
- grouping with headings
- splitting a long task into steps
- sensible defaults instead of choices
- a summary first, then drill-down

**Signs of underwhelm:**
- The first screen has no useful information or clear action: only a greeting, a hero, a logo, or a large empty state.
- The primary content or action sits below the fold.
- On desktop, a narrow strip of content floats in a sea of space.
- An expert tool hides the numbers people need behind clicks.
- Copy is vague ("Welcome back!", "Manage your stuff").
- A simple task is spread across too many steps.
- Actions give no feedback, so users can't tell whether anything happened.

**Fixes for underwhelm:**
- Lead with the answer: the balance, the status, what needs attention.
- Bring the primary action onto the first screen, or pin it.
- Use the width on desktop: two columns, a side panel, a detail drawer.
- Raise density for expert tools.
- Merge trivially short steps.
- Give every action a visible response (motion.md).

## 5. Cards are for objects, not for layout

Wrapping everything in cards is one of the most common AI patterns. It turns every section into a box, buries the hierarchy under borders and shadows, and makes every element look equally important.

- **Use a card for a discrete object** the user acts on or compares: a vehicle, an account, a document, a plan. A card should usually be clickable as a whole, or carry its own actions.
- **Don't use cards for page sections.** Group sections with headings, whitespace, and the occasional divider. A page is not a stack of boxes.
- **Never put cards inside cards.** Keep one surface level per region. Inside a card, separate parts with spacing and dividers.
- **Use lists and tables for records.** Twenty vehicles are table rows or list rows, not twenty cards in a grid.
- **Check it:** remove the card container in your head. If the grouping still reads through spacing and a heading, the card wasn't needed.

The detector flags `card-spam` (many card-like containers in one file) and `nested-card`. The judgment call is yours.

## 6. Fixing hierarchy problems

- **Demote before you promote.** When the primary element doesn't stand out, the usual cause is that too many other things are loud. Quieting them (lighter weight, neutral color, smaller size, less fill) works better than making the primary element louder still.
- **Change one variable at a time** (size, weight, color, or position) and re-check the blurred capture. Big jumps on several variables at once tend to overshoot.
- **Move, don't only restyle.** If a frequent action sits in the hard zone, moving it (a bottom bar, the end of the form, a list row action) beats enlarging it where it is.
- **Record what changed** in the change table, with the principle: Von Restorff for emphasis, Fitts and thumb zones for placement, Hick for reducing choices, Gestalt for grouping, or "judgment call".

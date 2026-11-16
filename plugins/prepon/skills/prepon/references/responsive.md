# Responsive web

Build mobile-first: write the 360 px layout first, then add complexity with `min-width` queries. Most users in these projects arrive on mid-range Android phones, so the phone layout is the primary product, not a fallback.

## Widths to design and test

| Width | Why |
|---|---|
| 320 CSS px | WCAG 1.4.10 reflow test width. Nothing may need horizontal scrolling here except tables, maps, and diagrams. Also what a 1280 px laptop shows at 400% zoom. |
| 360 CSS px | The most common Android phone width. This is the primary design width and the first before/after capture width. |
| 768 CSS px | Small tablets and large phones in landscape. Usually where a second column or a persistent side panel first fits. |
| 1024 to 1280 CSS px | Laptops. The usual width for dashboards and back-office tools. |
| 1440 CSS px | Desktop. Check that content doesn't stretch into unreadable line lengths. |

## Breakpoint strategy

- **Breakpoints come from content, not devices.** Add one where the layout starts to break: line lengths get too long, a sidebar fits, or a table needs more columns. Then snap it to the project's existing breakpoint set.
- **Use the project's existing breakpoints.** If it uses Tailwind, its defaults are `sm` 640, `md` 768, `lg` 1024, `xl` 1280, and `2xl` 1536 px, unless the config overrides them. Read the config.
- **For apps that share logic with Android**, Android's window size classes are a useful common language: compact under 600dp, medium 600 to under 840dp, expanded 840 to under 1200dp, large 1200 to under 1600dp, extra-large 1600dp and up (source below).
- **Prefer container queries for components** (`@container`) that live in different-width slots, such as a card that appears in a sidebar and a main column. Use viewport queries for page layout.
- **Keep the count small.** Two or three layout changes per screen is usually enough. Every breakpoint is a layout you have to test.

## Layout rules

- **Line length:** about 45 to 75 characters for reading text. Cap with `max-width: 65ch` or similar. Wide dashboards can be full-width, but paragraphs inside them shouldn't be.
- **Forms stay one column at every width.** Wider screens get more whitespace or a side summary, not two columns of unrelated fields (see Gestalt continuity in ux-laws.md). Short related pairs (city and postcode) are the exception.
- **Tables on phones:** for record lists, switch to stacked rows with the key fields, with a tap to see the full row. For real comparison tables, keep the table and give it its own horizontal scroll container with a visible cue, and keep the first column sticky. Either way, the list pages: numbered pagination on wide screens, and a "Load more" button on phones (visual-craft.md).
- **Navigation:** for 5 or fewer top destinations on phone-heavy apps, a bottom bar is easiest to reach. Otherwise use a top bar with a menu. Desktop gets persistent navigation. Behavior should stay the same across breakpoints, so the same items in the same order.
- **Images:** set `width` and `height` (or `aspect-ratio`) to prevent layout shift, use `srcset` and `sizes`, and lazy-load below the fold. Mid-range phones on mobile data pay for every byte.
- **Sticky elements:** each sticky header or footer eats viewport height on a 360×640 screen. Allow at most one top and one bottom, and add `scroll-padding` so focused fields aren't hidden (WCAG 2.4.11).

## Fluid typography

Use `clamp()` with a `rem` minimum and maximum so text scales smoothly and still responds to user zoom:

```css
--step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);   /* body: 16 → 18px */
--step-2: clamp(1.375rem, 1.2rem + 0.9vw, 1.875rem);  /* h2 */
--step-4: clamp(1.75rem, 1.4rem + 1.8vw, 2.75rem);    /* h1 */
```

- Never size text in `vw` alone. Pure viewport units don't grow with browser zoom, which risks failing WCAG 1.4.4 (resize to 200%). Mixing `rem` into the preferred value keeps zoom working.
- Practitioner guidance (not normative): keep the maximum at no more than about 2.5 times the minimum, so a 200% zoom still produces a 200% change.
- Body text on phones is at least 16px. That also stops iOS Safari from zooming in when an input gets focus.
- Use tabular figures (`font-variant-numeric: tabular-nums`) in tables, amounts, and anything that updates live.

## Safe areas on the web

For full-bleed layouts on notched phones, add `viewport-fit=cover` to the viewport meta tag and pad edges with `env(safe-area-inset-top|right|bottom|left)`, for example `padding-bottom: max(1rem, env(safe-area-inset-bottom))` on a bottom bar.

## How to check

- Resize through each width above with real, long content (long names, large amounts, translated strings 30% longer).
- Zoom to 200% at 1280 px and look for clipped or overlapping text.
- Throttle to Slow 4G and look at what renders first.

## Sources

- WCAG 2.2 SC 1.4.10 Reflow and 1.4.4 Resize Text: https://www.w3.org/TR/WCAG22/
- Android window size classes: https://developer.android.com/develop/ui/views/layout/use-window-size-classes
- `env()` safe-area variables: https://developer.mozilla.org/en-US/docs/Web/CSS/env. The `viewport-fit=cover` requirement is documented in MDN's viewport meta reference (https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag); it wasn't re-checked in this pass.
- Tailwind default breakpoints: https://tailwindcss.com/docs/responsive-design (from memory; confirm against the project's config).

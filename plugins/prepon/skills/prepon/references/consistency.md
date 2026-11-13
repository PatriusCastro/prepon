# Consistency

Inconsistency is one of the most common problems in long-lived enterprise UIs, and one of the most expensive. Each screen was built by a different person in a different sprint. The result is three button styles, four radii, and two ways of showing an error. Users read every visual difference as meaning something. When a difference means nothing, they learn to distrust the interface, and that hurts most in government and banking, where trust is the product.

The goal isn't uniformity for its own sake. Things that do the same job should look and behave the same. Things that differ should differ on purpose.

## Contents

- [Find the project's norm first](#find-the-projects-norm-first)
- [Visual consistency (scanned)](#visual-consistency)
- [Behavior consistency (reviewed)](#behavior-consistency)
- [Choosing the canonical value](#choosing-the-canonical-value)
- [Fixing inconsistencies](#fixing-inconsistencies)

---

## Find the project's norm first

Run the scanner on the source folder (`<scripts>` is the scripts folder named in SKILL.md):

```
node <scripts>/scan-consistency.js --summary src/
```

Start with `--summary`. It keeps the outliers (with locations), the top values per property, and the button issues. Drop the flag when you need every value and location, for example to list all call sites before a fix.

**Scan one product at a time.** If the repo holds more than one product with deliberately separate tokens (an embedded demo, a white-label area, an admin app next to the customer app), scan each one's folder separately. Scanning them together mixes two norms and reports the deliberate differences as inconsistency.

It prints JSON with:
- `properties`: for radius, border width, border color, background, text color, shadow, font size, and font weight, every value used, how often, and where. `outliers` lists the values worth questioning, each with a reason. Token references (`var(--x)`, `theme.x`) are treated as deliberate roles and never flagged. When tokens are the norm, any raw literal is flagged.
- `buttons.variants`: button styles grouped by signature (radius, background, text color, height, weight).
- `buttons.missingStates`: buttons that lack a state (hover, focus-visible, disabled, pressed) that most other buttons have.
- `buttons.bypassComponent`: raw `<button>` elements styled inline when the project already has a `Button` component.

The script exits with 1 when it finds anything. Like the slop detector, its findings are questions. It works by frequency, so it can't know that a 2px border is the deliberate selected state, or that Tailwind `rounded-md` and CSS `6px` are the same radius. Confirm each finding in context before reporting it.

The most-used values are the project's de facto design system, even when nobody wrote it down. Build mode should reuse them. Audit mode should report departures from them.

## Visual consistency

What to compare across the target, beyond what the script lists:

| Property | What consistent looks like | Typical drift |
|---|---|---|
| Radius | One scale, assigned by role: inputs and buttons share one radius, cards and dialogs another, pills and avatars are full | Every new component picks its own radius |
| Borders | One width for resting borders, one stronger treatment for focus or selected, one or two border colors | Mixed `border-gray-200`, `border-gray-300`, `#e5e7eb`, and `#ddd` for the same divider |
| Buttons | A small, named set of variants (primary, secondary, tertiary or link, destructive), each with one color, height, padding, and radius | Five shades of blue, heights from 32 to 48, icon buttons with no shared size |
| Inputs | One height that matches the buttons, one border, one focus style, and labels in one position | Some labels above, some inline. Different heights in the same form. |
| Color roles | Each color means one thing (brand, action, success, warning, danger, info) | Brand red reused for errors, or one green for both "online" and "paid" |
| Type | A fixed scale, with heading levels that look the same on every page | One-off sizes such as 15px or 17px, and an H2 that looks different per page |
| Spacing | A spacing scale, with similar components using the same internal padding | Card padding of 12, 16, 20, and 24 on sibling cards |
| Elevation | Shadows reserved for floating layers, one level per layer type | Random shadows on resting cards |
| Icons | One icon set, one stroke weight, two or three sizes | Mixed libraries, filled next to outline |

## Behavior consistency

These need review, since no script can see them. Check each one across every screen in scope:

- **Button behavior.**
  - Every button variant has hover, focus-visible, pressed, disabled, and loading states, and they look the same across screens.
  - Async buttons all handle double-submit the same way (disable and show progress).
  - The same action has the same label everywhere: don't mix "Save," "Submit," and "Confirm" for the same step.
- **Action placement.**
  - The primary action sits in the same place on every form and dialog.
  - Cancel and back are consistently on one side.
  - Destructive actions always use the destructive variant and always confirm or offer undo in the same way.
- **Forms.**
  - Required and optional fields are marked the same way. Pick one convention.
  - Validation happens at the same moment everywhere (on blur, or on submit).
  - Errors appear in the same place, in the same style, with the same summary pattern.
- **Feedback.**
  - The same kind of event gets the same kind of feedback: a successful save is always a toast, or always inline, but not a toast here and a modal there.
  - Loading uses one pattern per region type: skeletons for content, spinners inside buttons.
- **Overlays.**
  - Every modal and sheet closes the same ways (the close button, Escape, and a scrim tap where that's safe).
  - Close buttons sit in the same corner.
  - Focus returns to the trigger.
- **Navigation.** The current page is indicated the same way everywhere, back behaves the same, and links look like links throughout.
- **Tables and lists.** Numbers are right-aligned with tabular figures. Sorting, filtering, pagination, row actions, and empty states work the same in every table.
- **Wording and formats.**
  - One term per concept ("vehicle," not "unit" on one page and "asset" on another).
  - One date, time, currency, and number format.
  - One capitalization style for buttons and headings.

## Choosing the canonical value

When values conflict, pick the canonical one in this order, and say which rule decided it:

1. **The design system or tokens, if the project has them.** Drift from a defined token is a bug in the drifting code.
2. **Accessibility and platform requirements.** If the most common button is 32px tall or its text fails contrast, the majority is wrong. Fix toward the requirement, not toward the majority.
3. **The most common value,** if it's acceptable. It's what users already know in this product (Jakob's law, applied within the product).
4. **Ask** when two values are about equally common, or when the choice is really a brand decision.

Real differences in role are not inconsistencies. A destructive button should differ from a primary one, and a compact table row can have a smaller radius than a dialog. Record such cases as intended roles instead of forcing them together.

## Fixing inconsistencies

- **Fix at the source.** Add or correct the token, or the shared component variant, then point the outliers at it. Changing 30 call sites to a new hardcoded value just creates the next inconsistency.
- **Consolidate before you delete.** If raw `<button>` elements bypass an existing `Button` component, move them onto the component with the right variant. If the component lacks a variant that's genuinely needed, add it to the component.
- **Keep behavior changes visible.** Changing where an action sits, or what it's called, changes what users have learned. List these separately in the change table so the user can confirm them.
- **Re-run the scanner** after fixing, and check that outliers dropped and no new variant appeared.
- **Capture before and after.** Consistency fixes touch many screens. The comparison is how the user sees that nothing else moved.

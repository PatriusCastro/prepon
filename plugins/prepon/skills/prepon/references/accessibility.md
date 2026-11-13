# Accessibility: checkable requirements

The target is WCAG 2.2 Level AA, which most government and banking procurement now names explicitly. Numbers below were checked against the official sources listed at the end of this file (November 2026). Where something is practitioner guidance rather than a normative requirement, it says so.

Accessibility in this skill isn't a separate pass. Many of these users are older, using a phone outdoors, on a cracked screen, with the font size turned up, or new to digital services. Designing for them makes the product better for everyone.

## Contrast

| What | Minimum (AA) | WCAG SC |
|---|---|---|
| Body text and images of text | 4.5:1 | 1.4.3 |
| Large text: at least 18pt (about 24 CSS px), or 14pt bold (about 18.66 CSS px bold) | 3:1 | 1.4.3 |
| UI component boundaries and states (input borders, toggle tracks, focus rings), and graphics needed to understand content (chart lines, icons that carry meaning) | 3:1 against adjacent colors | 1.4.11 |
| Disabled controls and pure decoration | exempt | 1.4.3 and 1.4.11 |

How to check:
- Compute the ratio from the actual token values. Don't eyeball it. Check both themes if the project ships dark mode.
- Placeholder text counts as text if users need to read it.
- SC 1.4.11 covers the visual information you need to identify a control and its state: an input's border, a checkbox outline, a toggle track, a focus ring. It doesn't cover decorative panel borders, dividers between sections, or a card outline whose card isn't itself a control. Those can be subtler. If the input's border is the only way to tell it's a field, though, that border needs 3:1.
- Text over images or gradients must pass at its worst point. Add a scrim if needed.
- Color must not be the only way information is conveyed (1.4.1). Status uses text or an icon as well, and links in body text need an underline or another non-color cue.

## Target size

| Requirement | Value | Source |
|---|---|---|
| WCAG 2.2 AA minimum | 24×24 CSS px, or enough spacing that a 24 px circle centered on each target doesn't intersect another target or another target's circle. Exceptions: an equivalent control elsewhere, inline links in text, user-agent controls, and essential cases. | SC 2.5.8 |
| WCAG AAA (enhanced) | 44×44 CSS px | SC 2.5.5 |
| iOS | Hit region of at least 44×44 pt (60×60 pt in visionOS). The HIG lists 28×28 pt as the minimum control size. | Apple HIG |
| Android | At least 48×48 dp, with targets separated by 8 dp or more | Android accessibility docs |

Practical rule for these projects: treat 24 px as the legal floor on web and aim for 44 to 48 px on anything touched often. The visual size can be smaller if padding or `hitSlop` grows the hit area.

## Layout, zoom, and text

| Check | Requirement | WCAG SC |
|---|---|---|
| Reflow | Content works without two-dimensional scrolling at 320 CSS px wide (for vertically scrolling content) and 256 CSS px tall (for horizontal). Data tables, maps, and diagrams are allowed their own scroll. | 1.4.10 |
| Resize text | Text resizes to 200% without loss of content or function | 1.4.4 |
| Text spacing | Nothing breaks when users set line height to 1.5×, paragraph spacing to 2×, letter spacing to 0.12×, and word spacing to 0.16× the font size | 1.4.12 |
| Orientation | Not locked to portrait or landscape unless it's essential | 1.3.4 |

How to check:
- **Reflow (1.4.10):** set the browser window to 1280 px wide and zoom to 400%. That gives a 320 CSS px viewport, so you can also just test at 320 px wide.
- **Resize text (1.4.4), web:** at a 1280 px window, zoom the browser to 200% (in Playwright, a 640 px viewport with `deviceScaleFactor: 2` is equivalent). Also set the browser's default font size to double, which catches `px` font sizes that ignore user preferences.
- **Resize text, React Native:** the largest OS font size (Android: Settings → Display → Font size and Display size at their maximum; iOS: Larger Accessibility Sizes).

Avoid fixed heights on text containers, since they're the most common cause of clipped text at 200%.

## Focus and keyboard

- Everything interactive is reachable and operable by keyboard (2.1.1), in a logical order (2.4.3).
- Focus is visible (2.4.7). If you replace the browser outline, the replacement needs 3:1 contrast (1.4.11). Focus Appearance (2.4.13) is AAA, so it's useful as a guide, not a requirement.
- **Focus not obscured (2.4.11, AA, new in 2.2):** a focused element must not be entirely hidden by sticky headers, footers, cookie banners, or chat widgets. Use `scroll-padding-top` and `scroll-padding-bottom` equal to the sticky bars.
- Modals trap focus while open and return it to the trigger on close. Escape closes them.

## Forms

| Check | Requirement | WCAG SC |
|---|---|---|
| Labels | Every input has a programmatic label and visible instructions. A placeholder isn't a label. | 1.3.1, 3.3.2 |
| Input purpose | Personal data fields use `autocomplete` tokens (`name`, `email`, `tel`, `street-address`, `one-time-code`) | 1.3.5 |
| Error identification | Errors are described in text and tied to the field (`aria-describedby`), with a suggestion for fixing them | 3.3.1, 3.3.3 |
| Error prevention | Legal, financial, or data-changing submissions can be reviewed, corrected, or reversed before final submission | 3.3.4 |
| Redundant entry (new in 2.2, A) | Don't ask for the same information twice in one process. Prefill it or let users select it. | 3.3.7 |
| Accessible authentication (new in 2.2, AA) | Login doesn't require a cognitive test (remembering or transcribing). Allow paste and password managers, and don't block paste in OTP fields. | 3.3.8 |
| Consistent help (new in 2.2, A) | Help links and contact details sit in the same place on every page | 3.2.6 |
| Dragging (new in 2.2, AA) | Anything done by dragging also works with a single pointer (buttons for reorder, tap-to-place on maps) | 2.5.7 |
| Status messages | Toasts, "saved" messages, and result counts are announced without moving focus (`role="status"` or `aria-live`) | 4.1.3 |

Note: WCAG 2.2 removed 4.1.1 Parsing, so don't cite it.

## React Native specifics

- Custom touchables need `accessibilityRole` (`button`, `link`, `checkbox`, and so on), `accessibilityLabel` when there's no visible text, and `accessibilityState` for selected, checked, or disabled.
- Leave `allowFontScaling` on (it's the default). If a layout breaks at large font sizes, fix the layout. Capping with `maxFontSizeMultiplier` is a last resort for very constrained elements like tab labels.
- Group related text into one focusable element (`accessible`) so screen readers don't read a card in ten pieces.
- Test with TalkBack on Android, since that's what most of these users have, and VoiceOver if iOS is in scope.

## Sources

- WCAG 2.2: https://www.w3.org/TR/WCAG22/ (SC levels and values above, including the list of criteria new in 2.2 and the removal of 4.1.1)
- Apple HIG, Buttons and Accessibility: https://developer.apple.com/design/human-interface-guidelines/buttons, https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android, Make apps more accessible: https://developer.android.com/guide/topics/ui/accessibility/apps (48dp); touch target spacing: https://support.google.com/accessibility/android/answer/7101858 (8dp)

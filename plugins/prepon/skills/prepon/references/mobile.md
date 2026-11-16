# Mobile (React Native and mobile web)

Assume a mid-range Android phone unless the project says otherwise: about 360dp wide, a modest CPU, some memory pressure, gesture navigation, often outdoors, sometimes on unreliable data, and often used one-handed. Design for that device first. If it works there, it works on a flagship.

## Touch targets

| Platform | Minimum | Source |
|---|---|---|
| Android | 48×48 dp, targets separated by 8 dp or more | Android accessibility docs |
| iOS | Hit region of at least 44×44 pt. The HIG lists 28×28 pt as the minimum control size, but 44 is the target. | Apple HIG |
| Web (any device) | 24×24 CSS px is the WCAG 2.2 AA floor. Aim for 44 to 48. | WCAG 2.5.8 |

In React Native, grow small visual controls with `hitSlop` on `Pressable` (it accepts a number or a `{top, bottom, left, right}` rect). The icon can stay 24dp while the hit area reaches 48dp. Make sure enlarged hit areas don't overlap their neighbours.

## Safe areas

- Use `react-native-safe-area-context` (`SafeAreaProvider` at the root, then `useSafeAreaInsets()` or its `SafeAreaView`). React Native's built-in `SafeAreaView` is deprecated and iOS-only.
- Apply insets where content meets an edge: headers get the top inset, and bottom bars and floating actions get the bottom inset. Avoid wrapping the entire screen, which double-pads nested navigators.
- Android gesture navigation reserves the bottom edge. Don't put swipe-from-bottom interactions or tiny targets there.
- For mobile web, see the safe-area section in responsive.md.

## Thumb zones

These are heuristics from observational research on how people hold phones, not standards. Use them for placement decisions and cite them as practitioner guidance.

- On a phone held in one hand, the bottom-centre third of the screen is the easiest to reach. The top corners are the hardest, and on large phones they're out of reach.
- **Primary and frequent actions go low:** bottom navigation, a primary button at the end of the form, or a sticky bottom action bar on long forms.
- **Destructive and rare actions go out of the easy zone,** or behind a menu or a confirmation. Never put a destructive action directly next to the primary one.
- **Top-of-screen content is for reading,** not for frequent tapping. Back and close are the exceptions, and on Android the system back gesture covers them.

## Platform behavior (be conventional)

- **Android back** (button or gesture) must do the expected thing: close the sheet, then go up the stack, then leave the flow with a "discard changes?" prompt if there's unsaved input.
- **Navigation:** a bottom tab bar for 3 to 5 top destinations, with a stack inside each tab. Keep tab labels visible, because icon-only tabs fail recognition for non-technical users.
- **Keyboards:** set `keyboardType` (`numeric`, `phone-pad`, `email-address`), `autoComplete` and `textContentType` for autofill, `returnKeyType` to move to the next field, and use `KeyboardAvoidingView` or an equivalent so the focused field and the submit button stay visible.
- **Pickers:** use the platform date and time pickers. For short option lists (under about 7), radio rows or a segmented control beat a dropdown, because they show all the options at once.
- **Feedback:** give every press an immediate visual response (a pressed state, or `android_ripple`). Respect reduced motion (`AccessibilityInfo.isReduceMotionEnabled`).

## Typography and scaling

- Body text at least 16. Secondary text at least 14. Nothing under 12.
- Test at the largest system font size. Layouts should grow vertically. Avoid fixed heights on text containers and buttons. Use `minHeight` instead.
- Use tabular figures (`fontVariant: ['tabular-nums']`) for amounts and live numbers.

## Performance on mid-range Android

Performance here is part of the design. A janky screen feels broken to a non-technical user.

- Long lists: use `FlatList` or `FlashList` with stable `keyExtractor` values. Avoid `ScrollView` with `.map()` over unbounded data.
- Images: serve them sized to their display size, cache them, and use placeholders with fixed dimensions to avoid layout jumps.
- Avoid blur, large shadows, and many simultaneous animations. They are disproportionately expensive on lower-end GPUs.
- Show skeletons shaped like the content within about 400 ms (see Doherty threshold in ux-laws.md).

## Offline and poor connectivity

- Show connection state when it affects what the user can do. Queue writes and say they're queued ("Saved on this phone; will send when you're online").
- Never lose form input on a failed submit or an app restart. Persist drafts.
- Prevent double submits: disable the button and show progress while the request is in flight.

## How to check

- Run on a real or emulated 360dp Android device with the largest font size and TalkBack on.
- Use the app one-handed with your thumb and note every action you have to stretch or re-grip for.
- Turn on airplane mode mid-flow.

## Sources

- Android touch targets: https://developer.android.com/guide/topics/ui/accessibility/apps (48dp); spacing: https://support.google.com/accessibility/android/answer/7101858 (8dp)
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/buttons (44×44 pt hit region, 60×60 pt visionOS) and https://developer.apple.com/design/human-interface-guidelines/accessibility (control size table)
- React Native `Pressable` `hitSlop`: https://reactnative.dev/docs/pressable
- React Native `SafeAreaView` deprecation: https://reactnative.dev/docs/safeareaview
- Thumb-zone placement: practitioner research (Steven Hoober's mobile observation studies). It's a heuristic, not a standard.

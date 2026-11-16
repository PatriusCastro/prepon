# Icons

Icons are part of a fitting interface, not decoration to avoid. For non-technical users, people reading in a second language, and anyone scanning quickly, a familiar icon next to a label is recognized faster than the word alone. Leaving icons out entirely is its own failure. Text-only toolbars and status shown by color and words alone make an app slower to use, and they read as unfinished. The slop tell is icons used without purpose (on every label, emoji, sparkles), not icons as such.

## Use icons for

- **Navigation.** Bottom tabs, sidebars, and section headers in settings. Always pair them with a visible label.
- **Common actions** that users know from other apps: search, close, back, menu, filter, sort, add, edit, delete, download, upload, share, print, refresh, copy, attach, more, settings, notifications, account, and help.
- **Status,** always paired with text. Give each status its own shape, such as a circle-check for success, a triangle for warning, and an octagon or circle-x for error. That way meaning survives without color (WCAG 1.4.1).
- **Input affordances:** show and hide password, search fields, clear-field buttons, date fields, select chevrons, external-link markers, and upload drop zones.
- **Repeated objects in lists,** when they help scanning, such as file types, account types, or vehicle and asset types.
- **Empty states:** one relevant icon next to the explanation is enough. Illustrations aren't needed.

## Skip icons for

- Every label, menu item, or heading. When everything has an icon, nothing stands out, and generic icons add noise.
- Abstract concepts with no shared metaphor ("compliance," "strategy"). Words are clearer.
- Long-text buttons where the icon adds nothing ("Continue to payment details").
- Ambiguous icons without a label. A star can mean favorite, rating, or featured, so label it.

## Rules

- **Label by default.** Icon plus text is the default. Use icon-only buttons only for universal actions in tight places (table row actions, toolbars, close buttons). Give them an accessible name (`aria-label`, or `accessibilityLabel` in React Native) and a tooltip on desktop. For government and banking audiences, label the mobile menu button "Menu".
- **One set per product.** Use the icon library the project already has. If it has none, pick one whose stroke and corners match the typography and direction.
  - React web: Lucide (`lucide-react`), Material Symbols, Phosphor, or Heroicons.
  - React Native: `lucide-react-native` (needs `react-native-svg`), or `@expo/vector-icons` in Expo projects.

  Choosing a library is a project-wide decision, so propose one and ask before adding the dependency. For one to three icons, inline SVG with no dependency is fine. Check the library's license fits the project.
- **Size with the text.** About 16 px next to 14 px text, 20 px next to 16 to 18 px text, and 24 px for navigation and standalone icons. Keep the stroke weight close to the text weight. Use `currentColor` so icons follow text color and its contrast.
- **Hit area, not icon size.** Icon buttons need a target of at least 24 CSS px (WCAG 2.5.8), and should aim for 44 to 48 px on touch screens. Use padding or `hitSlop`; don't enlarge the glyph.
- **Accessibility.** Hide decorative icons from assistive technology (`aria-hidden="true"`, or `accessible={false}` in React Native). Icons that carry meaning on their own need 3:1 contrast (WCAG 1.4.11).
- **Consistency.** Use one style throughout, outline or filled. A filled icon for the selected tab is a common convention, and that's fine. Use the same icon for the same action everywhere: one trash icon, one edit icon.
- **Platform idioms.** Android users expect Material's share icon and the vertical "more" (⋮). iOS users expect the share square with an arrow and the horizontal "more" (…). In a React Native app for both platforms, follow each platform for these few system actions, or accept one set and keep it consistent.

## How to check

List every icon on the screen. For each one, check that:
- it speeds recognition
- it has a label or an accessible name
- it uses the same glyph as the same action elsewhere in the product
- it comes from the project's single set

Then look for the opposite gap: navigation, common actions, or status with no icon where users would expect one.

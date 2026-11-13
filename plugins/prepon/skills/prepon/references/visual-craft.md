# Visual craft: the current quality bar

Users judge every product against the best apps on their own phones: their banking app, ride-hailing, messaging, delivery. A screen that looks like a 2012 intranet reads as neglected, and in government and banking, neglected reads as unsafe. So there are two ways to fail, not one:

- **Slop:** generic defaults with no thought (purple gradients, a centered hero, the same card everywhere).
- **Dated:** austere and under-crafted (square boxes, heavy outlines, underlined UI links, no icons, browser-default controls).

Avoiding slop must not push a design into looking dated. The baseline below is the craft floor for product UI in 2025–26. It's where a design starts, not what makes it distinctive. Identity comes from the choices in [Where identity lives](#where-identity-lives).

## Contents

- [Typography](#typography)
- [Surfaces, depth, and radius](#surfaces-depth-and-radius)
- [Color](#color)
- [Spacing and density](#spacing-and-density)
- [Components](#components)
  - [Tables always page](#tables-always-page)
- [Where identity lives](#where-identity-lives)
- [Signs a design looks dated](#signs-a-design-looks-dated)
- [Calibrating "modern" against real work](#calibrating-modern-against-real-work)

---

## Typography

- **The typeface is the biggest single signal of "current" versus "dated."** Industrial and older UI faces (DIN-style faces such as Bahnschrift, Verdana, Tahoma, Arial, or a Windows-only Segoe stack) make a product look like older desktop software, however good the layout is. For product UI where the brand matters, load a contemporary grotesk as a self-hosted web font (for example through `@fontsource`), with only the weights you use.
- **One contemporary sans family** with real weights (400, 500, 600) and tabular figures. Good starting points: IBM Plex Sans, Source Sans 3, Public Sans, Figtree, Instrument Sans, Manrope, Geist. A system UI stack is fine when performance matters most. Pick for the project (see `default-font` in slop-patterns.md), and keep serif text faces for editorial content, not app UI.
- **Sizes:** body 16 px for forms and reading, and 14 px is acceptable for dense data. Labels 13 to 14 px at weight 500. Headings at weight 600 on a modest scale (a ratio around 1.2 to 1.25).
- **Large text:** at 24 px and above, tighten letter spacing slightly (−0.01 to −0.02 em) and set line height to 1.1 to 1.25. Body line height is 1.4 to 1.6.
- **Case:** sentence case for buttons, labels, and headings. ALL CAPS only for tiny overlines, with added tracking.
- **Ink:** near-black text (not `#000`) on near-white surfaces, with muted text that still passes 4.5:1.

## Surfaces, depth, and radius

- **Layered neutrals:**
  - The app background is a very light neutral, tinted slightly toward the brand hue.
  - Cards and panels are white (or the surface color in dark mode).
  - Resting surfaces get a 1 px low-contrast border plus, at most, a very soft shadow (about `0 1px 2px rgb(0 0 0 / 0.05)`).
  - Floating layers (menus, popovers, dialogs, sheets) get a clearly stronger shadow, so depth means something.
- **Radius by role:** controls (buttons, inputs, selects) 6 to 8 px, cards and panels 8 to 12 px, dialogs 12 px, and the top corners of mobile bottom sheets 12 to 16 px. Badges, chips, and avatars are fully round. Square corners (0 to 4 px) throughout read as dated in product UI unless they're a deliberate brand choice. The opposite tell, 16 px or more on everything, is slop.
- **No heavy outlines.** A 2 px dark border around content blocks, or a black box around the page title, looks like a wireframe.

## Color

- **Neutral foundation:** a grey ramp tinted cool or warm to suit the brand, used for almost everything.
- **One confident brand or action color** for primary buttons, selection, links, and focus. Every other use of it dilutes it.
- **Semantic colors as soft tints.** Badges and alerts use a light tint background with darker text in the same hue (both passing contrast) plus an icon. Solid saturated fills are reserved for critical or blocking states.
- **Dark mode** as an option that follows the system preference, especially for tools used through long shifts. Test both themes for contrast.

## Spacing and density

- A 4/8 px spacing grid. Card padding is 16 to 24 px. Gaps between sections are 24 to 32 px.
- List and table rows are 44 to 52 px on desktop and 48 to 56 px on touch screens.
- Density follows the task. Operations tools can be compact (and may offer a comfortable or compact toggle). Forms and first-time flows get room to breathe. Dense isn't the same as cramped: keep alignment and grouping crisp.

## Components

- **Buttons:**
  - Primary is solid. Secondary is outlined or a subtle tint. Tertiary is a text or ghost button.
  - Heights of 36 to 40 px on desktop and 44 to 48 px on touch screens.
  - An icon plus label where an icon helps (icons.md).
  - Visible hover, pressed, focus, disabled, and loading states, with quick transitions (motion.md).
- **Links:** underline links inside sentences (WCAG 1.4.1). Navigation and action links in the interface chrome don't need underlines, because their position and style mark them.
- **Inputs:** 40 to 48 px tall, a 1 px border that passes 3:1, 6 to 8 px radius, a clear focus ring (2 px in the brand color with an offset), and leading icons where they help (search, currency). Style native controls instead of leaving browser defaults.
- **Filters and views:** use tabs or segmented controls instead of a row of identical bordered buttons. A search field gets a search icon and a clear button.
- **Status:** pill badges with a soft tint, an icon or dot, and a text label.
- **Tables:** no vertical grid lines, and light row dividers. Header text is small, muted, and weight 500. Rows highlight on hover and can be selected. Headers stay sticky. Numbers are right-aligned and tabular. Row actions sit in a trailing icon-button column or a "more" menu. Every table pages its data (see [Tables always page](#tables-always-page)).
- **People and organizations:** show avatars or initials for people and logos for organizations. They speed scanning in lists.
- **Maps:** real map tiles (Leaflet, MapLibre, or the platform map) whenever there's a map at all.
  - Use a muted basemap (a light, desaturated style) so your markers carry the color.
  - Draw markers as small pins or pill labels with status icons, and fit the bounds to the data.
  - Make every marker reachable from a list as well.
  - With fictional or demo places, use a basemap without labels, so real place names don't contradict the made-up ones, and draw your own labels.
  - Always show the tile provider's required attribution. Before relying on a provider, load one tile and look at it: some free tiers return watermarked tiles without a key. Check the terms before public hosting.
  - In Leaflet, use fractional zoom (`zoomSnap: 0.25`) with `fitBounds` padding so the data fills the map. If fractional zoom shows seams between tiles, set the tile layer's `mix-blend-mode` to `normal`.
- **App shell:** light chrome. For apps with several sections, use a left sidebar on desktop with icon and label for each destination, collapsible to icons, plus a slim top bar holding search, notifications, and the avatar menu. Simple apps can use a light top bar. On mobile, use a bottom navigation bar for 3 to 5 main destinations. Show the signed-in user as an avatar menu, not as a plain text link. In a demo or a partial build, show only destinations that exist, or mark the stubs clearly. Never let a nav item lead nowhere without saying so.
  - Sign-in, sign-up, and password reset come before the app, so they get no app shell. A top bar holding only a logo, stretched edge to edge while the form sits centered, reads as an empty app bar and lines up with nothing. Put the logo at the top of the form column, aligned with the form's left edge, or centered above the form. From tablet width up, center the sign-in block vertically in the space that's left, so it doesn't hug the top over a large empty area. On phones, keep it near the top so the keyboard doesn't cover it.
  - Keep the brand color for the logo, primary actions, selection, and focus. A full-width saturated header slab reads as an older intranet in product UI. Government sites with a mandated header are the exception.
- **Page header:** the page title on the left with a one-line context (shift, last update), and page-level actions on the right. Then, if it's useful, one compact summary strip of the few numbers people act on, each linking to the filtered view it counts. Not a grid of decorative KPI cards.
- **Empty, loading, and error states** are designed like the rest of the screen: a skeleton shaped like the content, and a short message with a next action and one icon.

### Tables always page

Every table and record list has pagination or a "Load more" control. Don't render the whole data set. Real data grows, and a list that's fine with 24 rows in a demo becomes slow and unscannable with 2,000 in production.

- **Desktop:** numbered pagination below the table, with previous and next buttons, a "Showing 26–50 of 312" count, and a rows-per-page selector (25, 50, 100). Keep the current page, sort, and filters in the URL, so a refresh or a shared link returns to the same view.
- **Mobile and stacked-row layouts:** use a "Load more" button that appends the next page and keeps the scroll position, with a count ("Showing 25 of 312"). Prefer a button to infinite scroll. With infinite scroll, users can never reach the footer, and keyboard and screen reader users lose their place.
- **Behavior:** changing the sort or a filter resets to page 1. Paging keeps the sort and filters. Data is paged on the server for anything that can grow. After "Load more", move focus to the first new row (or announce the new count) so assistive technology users know something was added.
- **Small fixed sets** (fewer rows than one page) still show the count, and the controls simply have nothing to do. Use the same pattern on every table in the product (consistency.md).

## Where identity lives

Within this baseline, a product becomes its own through:
- the brand color, and whether the neutrals run warm or cool
- the typeface
- density and spacing rhythm
- where the radius sits within its range
- imagery or illustration from the domain
- the palette for charts and data
- copy voice

The baseline is the floor. These choices are the identity. State both in the build direction: "Modern, calm product UI (visual-craft.md baseline), with a deep green brand, warm neutrals, Public Sans, and a compact density for dispatchers."

## Signs a design looks dated

Check a capture for these. Each one pulls a screen toward an older intranet:

- an industrial or older UI typeface (DIN-style, Verdana, Tahoma, Arial), or a Windows-only system stack
- a full-width saturated brand-color header bar in app UI
- square corners everywhere, or heavy dark borders around content blocks
- underlined links used as buttons or navigation in the interface chrome
- no icons in navigation, actions, or status
- ALL-CAPS headings, a serif face in app UI, or pure black on pure white
- unstyled browser-default form controls
- table grid lines on every cell, and cramped rows
- a row of identical bordered buttons used as filters or tabs
- flat, depthless layouts where nothing separates surface from background
- a schematic diagram where users expect a real map
- a plain text "signed in as" line instead of a user menu

A quick comparison helps: put a capture next to two well-regarded current products in the same category (refs mode can find them) and ask whether it looks like the same year.

## Calibrating "modern" against real work

"Modern" is a moving target, and a description of it goes stale. When the bar matters (a redesign, a "looks dated" complaint, a new product's direction), look at current work instead of relying on memory. Sources differ in what they can tell you, so weigh them differently:

| Tier | What it shows | Sources (checked November 2026) | Weight |
|---|---|---|---|
| 1. Shipped product UI | Real screens and flows from apps people use today | [Mobbin](https://mobbin.com) (iOS, Android, web; full library is paid), [Page Flows](https://pageflows.com) (recorded flows; paid) | Strongest. This is the bar users compare against. |
| 2. Current design systems | What good products are built on: type scales, radius, density, components, states | [Material 3](https://m3.material.io), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [GOV.UK Design System](https://design-system.service.gov.uk), [IBM Carbon](https://carbondesignsystem.com), [Atlassian](https://atlassian.design), [GitHub Primer](https://primer.style), [Vercel Geist](https://vercel.com/geist), [shadcn/ui](https://ui.shadcn.com) | Strong, and free to read. Best for components and behavior. |
| 3. Live website galleries | Real, live marketing and product sites | [SiteInspire](https://www.siteinspire.com), [Minimal Gallery](https://minimal.gallery), [SaaS Landing Page](https://saaslandingpage.com), [Lapa Ninja](https://www.lapa.ninja), [Awwwards](https://www.awwwards.com) (skews experimental and award-driven) | Good for landing and marketing pages. Weak for app UI: product screens aren't marketing pages. |
| 4. Concept galleries | Designers' concept shots, mostly never shipped | [Dribbble](https://dribbble.com/shots), [Behance](https://www.behance.net) (blocks automated fetching) | Mood only. Many shots ignore real content, states, contrast, and targets, and their trends (glass, gradient blobs, oversized cards) are where much AI slop comes from. Never use them as evidence of what works. |

How to use them:
- **Pick examples in the same category as the project** (banking apps for a bank, operations tools for a dispatch console), and prefer tier 1 and 2. A trendy marketing site says little about a settings screen.
- **Look, don't just list.** If Playwright can reach the web, capture a public, logged-out page of two or three references with `snapshot.js` (pass full URLs as routes) and compare them with the project's capture side by side. Respect each site's terms, and capture only what's publicly visible.
- **Extract the bar, not the look.** Note what they share: type size and weight, spacing, radius, how status and icons are shown, density. That shared floor is "current". Don't copy layouts, illustrations, brand colors, or distinctive styling; identity still comes from [Where identity lives](#where-identity-lives).
- **These are examples, not evidence.** They show what current products do, not that it works. When explaining a choice, cite the principle (ux-laws.md, accessibility.md), and name an example only as an illustration.

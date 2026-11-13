# Slop patterns

"Slop" is the look that AI-generated interfaces share. It's what you get when every decision falls back on the most common default. Each tell below comes paired with what to do instead, because banning a default without replacing it just moves the output to the second most common default (purple gradients become teal gradients). The replacement always comes from the same place: the project's context, tokens, and users.

None of these is wrong in every case. A gradient can be the brand. Inter can be the brand font. A finding means "justify this or change it," not "this is forbidden."

## Contents

- [Mechanical tells (detected by script)](#mechanical-tells)
- [Judgment tells (need review)](#judgment-tells)
- [Domain-specific tells](#domain-specific-tells)

---

## Mechanical tells

These are detectable from source text. Each heading is the rule id that `scripts/detect-slop.js` reports. The script can't know your brand, so treat its findings as questions. To keep a justified case, use `prepon-ignore <rule-id>` on the line or the line above (`{/* … */}` in JSX), or `prepon-ignore-file <rule-id>,...` for files that quote slop on purpose.

### purple-gradient
**Tell.** Purple, indigo, violet, or fuchsia gradients (`from-purple-500 to-indigo-600`, `linear-gradient(#667eea, #764ba2)`), the default "tech" backdrop.
**Instead.** Use the brand's own color as a flat surface. If depth is needed, use a tonal step of the same hue (one shade darker for a header band). If the brand really is purple, keep it flat and let typography carry the identity.

### gradient-text
**Tell.** Gradient-filled headlines (`bg-clip-text text-transparent`, `-webkit-background-clip: text`).
**Instead.** Use solid text in the strongest brand or ink color and build emphasis with size, weight, and space. Gradient text also tends to fail contrast at one end of the gradient.

### default-font
**Tell.** Inter or Poppins set as the only typeface with no brand reason, so the product reads as a template.
**Instead.** Start with the brand font if there is one. Otherwise pick a typeface for the job. For dense data, choose a face with tabular figures and clear 1/l/I distinctions. For government, use a highly legible humanist sans and check whether the government has a mandated typeface. For a banking brand, use a face that matches the institution's existing print materials. If Inter is the right answer, say why in the rationale.

### glassmorphism
**Tell.** Frosted glass panels (`backdrop-blur`, `backdrop-filter: blur`) used as decoration.
**Instead.** Use opaque surfaces with a clear elevation step (a tonal or border difference). Blur is expensive on mid-range Android phones and makes text contrast unpredictable. Keep it for overlays where seeing the content behind actually helps the user.

### blur-blob
**Tell.** Large blurred colored circles floating behind content (`absolute rounded-full blur-3xl`).
**Instead.** Remove them. If the page needs atmosphere, use real imagery that's relevant to the domain (the fleet, the city, the product) or a quiet brand pattern.

### oversized-radius
**Tell.** `rounded-2xl` or `rounded-3xl` on every card, button, and input, giving the soft "bubbly" default.
**Instead.** Define one radius scale in tokens and apply it by role: 6 to 8 px for controls, 8 to 12 px for cards and panels, full for pills and avatars (visual-craft.md). Don't overcorrect to square corners. 0 to 4 px everywhere reads as dated, not as serious.

### heavy-shadow
**Tell.** `shadow-xl` or `shadow-2xl` on resting cards.
**Instead.** Give resting surfaces a 1 px low-contrast border plus, at most, a very soft shadow, and save stronger shadows for things that float (menus, dialogs, sheets), so elevation means something. Completely flat, depthless layouts are the opposite failure (visual-craft.md).

### emoji-heading
**Tell.** Emoji in headings or labels ("🚀 Get started", "✨ Features").
**Instead.** Use plain, specific headings. If an icon helps recognition, use one from the project's icon set with an accessible label, or `aria-hidden` when it's decorative.

### filler-copy
**Tell.** Marketing filler such as "seamless," "elevate your," "unlock your potential," "supercharge," "effortless," "cutting-edge," "empower," or lorem ipsum.
**Instead.** Write what the user can do and what happens next, in the domain's vocabulary: "Renew your business permit," "3 vehicles need inspection this week." Real copy also tests the layout. Lorem ipsum hides overflow problems.

### sparkle-icon
**Tell.** Sparkle or magic-wand icons (`Sparkles`, `WandSparkles`) on features that aren't AI, or used as generic "new" decoration.
**Instead.** Use an icon that names the action, or none. If the feature really is AI-assisted, label it in words so users know what they're trusting.

### low-contrast-text
**Tell.** Light gray text on white (`text-gray-400`, `#9ca3af`, `#94a3b8`) for body copy, helper text, or placeholders. Gray-400 on white is about 2.5:1, well under 4.5:1.
**Instead.** Use the 500 or 600 step (or the project's "muted" token if it passes 4.5:1). Show hierarchy with size and weight, not by fading text until it's hard to read.

### tiny-text
**Tell.** Text below 12px (`text-[10px]`, `font-size: 11px`, `fontSize: 10`).
**Instead.** Use 12px as the floor for incidental labels and 14 to 16px for anything read. Many users here hold phones at arm's length or turn system font sizes up.

### tiny-target
**Tell.** Interactive elements sized `h-4` to `h-7` or `w-4` to `w-7` (16 to 28px).
**Instead.** Make the hit area at least 44 to 48px on touch screens. Pad around the icon, or use `hitSlop` in React Native, so the visual size can stay small while the target grows. WCAG's 24px minimum is the floor, not the target.

### outline-removed
**Tell.** `outline-none` or `outline: none` with no visible focus style to replace it.
**Instead.** Keep the browser outline, or replace it with a `focus-visible` ring that has 3:1 contrast against the background.

### decorative-motion
**Tell.** `animate-bounce` or `animate-ping` used for decoration, like bouncing arrows or pulsing badges.
**Instead.** Use motion only to show cause and effect (something was added, something moved). Respect `prefers-reduced-motion`. Persistent motion pulls attention from the task. See motion.md.

### card-spam
**Tell.** Everything wrapped in a card: six or more card-like containers (bordered or shadowed, rounded, padded) in one file, or a grid of cards for content that isn't a set of objects.
**Instead.** Use cards only for objects users act on or compare. Group page sections with headings, whitespace, and dividers. Show records as list or table rows. See hierarchy.md.

### nested-card
**Tell.** A card inside a card.
**Instead.** Keep one surface level per region. Separate parts inside a card with spacing or a divider.

### side-stripe
**Tell.** A thick colored stripe down one side (or across the top) of a card, alert, list row, or callout (`border-l-4 border-red-500`, `border-left: 4px solid`, `borderLeftWidth: 4`). It's one of the most recognizable AI-generated patterns, and it reads as decoration rather than meaning.
**Instead.**
- **Status:** a tinted pill badge with an icon and a text label.
- **Alerts and callouts:** a full soft-tint background with an icon and a clear title.
- **Selected items:** a tinted background or a full 1 to 2 px border in the brand color.
- **Emphasis:** type weight and position.

Bottom borders for active tabs and input underlines are a different, conventional pattern, and the detector doesn't flag them. There are no exceptions to this rule: don't suppress it with `prepon-ignore`, even for form errors. Mark a question in error with a soft error tint, a full 1 px border in the error color, the error icon, and the message.

### transition-all
**Tell.** `transition-all` or `transition: all`, the default way to "add some animation".
**Instead.** Name the properties you mean (`transition-colors`, or `transition: transform 200ms, opacity 200ms`). `all` also animates layout and size changes you didn't intend, and that's janky on mid-range Android.

### slow-motion
**Tell.** UI transitions of 500 ms or more (`duration-500`, `duration-700`, `duration-1000`, `transition: … 600ms`).
**Instead.** 100 to 300 ms for interface changes, up to about 350 ms for sheets and dialogs, with exits faster than entrances (motion.md). Long transitions make every interaction feel slow.

### scroll-reveal
**Tell.** Content that fades or slides in as it scrolls into view (`whileInView`, AOS `data-aos`), the landing-page template move.
**Instead.** Render content in place. In an app, users came to read or act, not to watch sections arrive. Save motion for responses to what the user did. Marketing and showcase pages may use scroll-driven motion within the guardrails in motion.md ("Marketing and showcase pages").

### hardcoded-color
**Tell.** Hex colors in component code (`bg-[#1e40af]`, `color: '#333'`) instead of tokens.
**Instead.** Use or add a token in the theme. Hardcoded colors are how a design system drifts into twenty slightly different blues. If the project has no tokens, create a small set first.

### hard-offset-shadow
**Tell.** A crisp, unblurred shadow pushed 4 px or more down and right (`box-shadow: 6px 6px 0 #000`), the sticker look of neo-brutalist templates.
**Instead.** Use the layering system in visual-craft.md: a 1 px border and a soft shadow for resting surfaces, a stronger soft shadow for floating ones. Keep the hard offset only when brutalism is the brand's stated direction.

### grid-background
**Tell.** A faint graph-paper grid behind a hero or the whole page (`bg-grid`, two 1 px linear gradients).
**Instead.** Use a plain surface. A grid belongs where people measure or place things: canvases, maps, diagram editors.

### glow-halo
**Tell.** A radial gradient that fades to transparent behind a heading, card, or screenshot: a soft spotlight or colored glow.
**Instead.** Lead the eye with position, size, contrast, and a clear heading (hierarchy.md). If the product truly needs atmosphere, use its own imagery.

### stripe-pattern
**Tell.** Repeating-gradient stripes used as texture.
**Instead.** Use a plain surface. Keep stripes for meaning: a hazard, a disabled or unavailable area.

### italic-serif-display
**Tell.** A large italic serif headline (`font-serif italic`), the editorial default that shows up on every "tasteful" landing page.
**Instead.** Choose a display style for this product and its audience. If a serif is right, it's the brand's serif, set upright unless italics carry meaning.

### crushed-tracking
**Tell.** Headings with letter spacing pulled to −0.04 em or tighter (`tracking-tighter`), so letters touch at small sizes.
**Instead.** Tighten large headings by −0.01 to −0.02 em at most (visual-craft.md), and leave smaller text at the default.

### bounce-easing
**Tell.** Easing that overshoots and springs back: a `cubic-bezier` with a value above 1 or below 0, `easeOutBack`, elastic or bouncy springs.
**Instead.** Use ease-out curves that settle (motion.md). Overshoot reads as playful, which is wrong for most product UI and grating on repeat.

### pulsing-dot
**Tell.** A small round status dot that pulses or pings forever.
**Instead.** Keep status dots still. Pulse only something genuinely live and time-critical, briefly, and never with reduced motion.

### marquee
**Tell.** A strip of logos, quotes, or items scrolling sideways on its own.
**Instead.** Show the items still in a grid or a row people can scroll themselves. If it must move, give it pause and browse controls (WCAG 2.2.2) and stop it with reduced motion.

### blinking-cursor
**Tell.** A decorative blinking caret after static text, to suggest "typing".
**Instead.** Remove it from static copy. In a simulated terminal or chat (motion.md, marketing pages), let it blink only while text is arriving, then stop.

### em-dash-copy
**Tell.** Interface copy with an em dash in sentence after sentence (five or more in one file).
**Instead.** Write short sentences with full stops. Use commas or parentheses for asides. One dash on a page is fine; a dash in every line is a generated-copy habit.

### forced-contrast
**Tell.** "Not a tool. A platform." and similar not-this-but-that framing.
**Instead.** Say what the product does and for whom, in one plain sentence.

### justified-text
**Tell.** Body text set justified.
**Instead.** Align text to the start of the line. Justified text opens uneven gaps between words, which is worst at phone widths and for readers with dyslexia.

### numbered-sections
**Tell.** "01 / 02 / 03" labels on sections or cards that aren't a sequence.
**Instead.** Number only real steps or ranked items, where order is information the reader needs.

### placeholder-label
**Tell.** Inputs whose only label is the placeholder.
**Instead.** Use a visible label above the field, with helper text below for format hints. Placeholders vanish when typing begins, which is exactly when users with memory or attention difficulties need them.

The next five are the current "premium dark" template: the look that replaced purple gradients once those became a known tell. Any one is fine on its own. Together they are the default.

### sheen-edge
**Tell.** A 1 px white inner shadow along the top of a card (`inset 0 1px 0 rgb(255 255 255 / 0.05)`), so every surface looks lit from above.
**Instead.** Separate surfaces with one border or a tonal step from the project's tokens.

### gradient-surface
**Tell.** Cards filled with a vertical fade between two almost identical surfaces (`linear-gradient(180deg, var(--surface), var(--bg))`, `from-white/5`).
**Instead.** Fill with one flat token. If the brand uses gradients, they have a meaning and a name in the tokens.

### fading-hairline
**Tell.** Dividers that fade out at both ends (`transparent, var(--line), transparent`, `from-transparent via-… to-transparent`).
**Instead.** Use a plain 1 px border, or let space and a heading separate the sections.

### hover-lift
**Tell.** Cards and buttons that rise a few pixels on hover (`:hover { transform: translateY(-2px) }`, `hover:-translate-y-1`).
**Instead.** Show hover with a color or border change (motion.md). Movement should answer something the user did, and hovering isn't a decision.

### eyebrow-everywhere
**Tell.** A small label, often mono or spaced capitals, over every heading on the page (three or more in one file).
**Instead.** Let headings stand alone. Keep a label only where it carries real context: a step in a sequence, a category, a status.

---

## Judgment tells

These need a reviewer's eye. Check them in every audit and before you finish every build.

| Tell | Why it reads as generic | Do this instead |
|---|---|---|
| The SaaS landing structure: centered hero, three icon cards, testimonials, CTA band. | It's the most common page skeleton on the web. | Start from the user's task. A permit portal's home page is a search box and the five most common services, not a hero. |
| Identical card grids for content that isn't equal. | It flattens priority. Users can't tell what matters. | Vary size and placement by importance. Use a list or table when items are comparable records. |
| A dashboard row of four KPI cards with a sparkline in each. | It's the default dashboard, whether or not those numbers drive action. | Ask what decision the user makes from this screen and lead with that, such as exceptions and alerts first for operations. |
| Everything centered. | Centered text is hard to scan and makes forms and data ragged. | Left-align text and forms. Center only short, standalone moments (empty states, confirmations). |
| One generous spacing value everywhere. | It looks airy in screenshots but wastes space in dense tools, and nothing groups. | Use a spacing scale tied to grouping (see Gestalt proximity in ux-laws.md). Make it dense where users scan and roomier where they read. |
| Dark mode by default for enterprise tools. | It's a stylistic default, not a user need. | Default to the platform or system preference, and test both themes if you ship both. |
| Tailwind default blue (`blue-600`) or slate as the whole palette. | It's the color of every starter template. | Derive the palette from the brand, then check contrast. |
| An icon on every label and menu item. | It adds noise, and generic icons don't aid recognition. | Use icons where they speed recognition (navigation, common actions, status) and plain text elsewhere. See icons.md. |
| The overcorrection: no icons at all in an app UI. | Text-only toolbars, navigation, and status are slower to scan and read as unfinished, especially for non-technical users. | Add icons from one set where icons.md says they help, always with labels or accessible names. |
| Badges, pills, and chips everywhere. | When everything is tagged, the tags carry no signal. | Reserve chips for status and filters. Show other metadata as plain text. |
| Fake, round data in mockups ("$12,345", "98%"). | It hides layout problems and reads as a template. | Use realistic values, including long names, zeros, negative amounts, and missing data. |
| Friendly-generic microcopy ("Oops! Something went wrong 😅"). | It's playful in the wrong place and unhelpful. | Say what happened, whether data was saved, and what to do next. |
| Hover-only affordances. | They don't exist on touch screens. | Make actions visible, or reachable through an explicit menu. |
| The overcorrection: no motion at all. | Panels pop in, added rows go unnoticed, and buttons give no feedback, so users tap twice. | Quick, purposeful transitions for feedback, state changes, and spatial continuity (motion.md). |
| The overcorrection: austere and dated. | Square boxes, heavy outlines, underlined UI links, no icons, and default form controls read as a neglected intranet, and in government and banking that reads as unsafe. | Start from the current craft baseline (visual-craft.md), then make it distinctive through brand color, type, density, and imagery. |
| Tables that render every row. | They look fine with demo data, then become slow and unscannable in production. | Pagination on desktop, "Load more" on phones, with a count (visual-craft.md). |
| Illustration of abstract people or blobs in empty states. | It's the stock "friendly" look. | Write a sentence that explains why it's empty, plus the action that fills it. |
| A small label or pill badge above every headline ("NEW", "INTRODUCING", a category). | It's a template reflex that adds a line without information. | Drop it, or fold the information into the headline or the line under it. Keep an overline only where it orients (a step number, a section in a long form). |
| An icon in a tinted square stacked above each heading in a grid of features. | It's the feature-grid template, and the icons rarely add recognition. | Put the icon beside the heading if it helps, or leave it out. |
| A hero headline so large it wraps to four or more lines on a phone. | It pushes the content and the action below the fold. | Shorten the headline, then size it to fit in about two lines at 360 px. |
| Flat type hierarchy: headings barely larger or bolder than body text. | Nothing leads, so the page has to be read line by line. | Set a type scale with clear steps between heading levels (visual-craft.md), then check the blurred capture (hierarchy.md). |
| A single word alone on the last line of a heading or paragraph. | It looks unfinished and breaks the shape of the block. | Use `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs, or adjust the measure. |
| A heading that sits closer to the section above than to its own content. | Proximity groups it with the wrong section. | Give headings more space above than below. |
| Cream or beige page with a serif and a terracotta accent, or near-black with one neon accent. | Both are current generated defaults for "tasteful" and "techy". | Keep them only if they come from the brand. Otherwise derive the palette from the product. |
| Dark mode built from glowing accents and colored shadows. | Glow reads as decoration and lowers text contrast. | Keep the dark theme; use flat accents and surface steps for depth. |
| Grey text on a colored background. | Neutral grey on color looks muddy and often fails contrast. | Use a darker or lighter tint of the background's own hue, then check contrast. |
| Body text in all caps, or headings that skip levels (h1 straight to h4). | Caps slow reading; skipped levels break screen reader navigation. | Sentence case for running text; heading levels that follow the structure. |
| Calling a problem "theater" ("security theater", "productivity theater"). | It's a dismissive stock phrase, not an explanation. | Name the actual problem and what it costs the user. |

---

## Domain-specific tells

- **Government:** a "startup" look (gradients, playful copy, trendy type) undermines authority. Users want to know it's the real government site. Follow the government's design standards if they exist, and use plain language.
- **Banking:** gamification and celebration on money movement. Users want certainty: amounts, recipients, fees, and a reference number.
- **Operations dashboards:** decorative charts with no thresholds. A chart without a target or an alert line rarely helps someone decide anything.
- **Form-heavy workflows:** fancy custom selects and date pickers that break keyboard input and assistive technology. Native controls are usually the more accessible and more familiar choice.

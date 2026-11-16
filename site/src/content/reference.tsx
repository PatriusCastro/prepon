import type { ReactNode } from 'react';
import { Link } from '../router';
import { CodeBlock, Table } from '../ui';
import { RULE_COUNT } from '../showcase';

// The slop-patterns page quotes the very class names and phrases the detector looks for.
// Those lines carry `prepon-ignore` comments: they are documentation, not styling.

const LAWS: [string, string, string, string][] = [
  ['Miller’s law', 'Users hold information in their heads mid-task: a reference number between screens, a code from an SMS, plans being compared.',
    'Don’t make people remember what the screen could show. Chunk long numbers in groups of 3 or 4, keep earlier answers visible on summary steps, compare side by side instead of across tabs.',
    'Reading it as “at most 7 menu items.” It’s about working memory during a task. A visible list can be scanned, so it doesn’t need memorizing.'],
  ['Hick’s law', 'Users pick from options with no strong expectation of where the answer is: first-run choices, action menus, filter panels, dashboards of equal tiles.',
    'Show fewer options at the moment of decision, or make the likely one obvious: a clear primary action, sensible defaults, progressive disclosure, grouped headings.',
    'Splitting one decision into many screens. It also doesn’t apply to lists searched by name, like countries or banks, where a sorted list or type-ahead wins.'],
  ['Fitts’s law', 'An action is frequent, important, or done one-handed, or a small control sits near a destructive one.',
    'Make frequent targets large and close to the thumb or pointer. Primary mobile actions go low. Destructive targets stay small or far away, with confirmation or undo.',
    'Making everything big, so size stops signaling priority. It’s also weak justification on desktop, where the mouse travels anyway.'],
  ['Jakob’s law', 'Deciding behavior: navigation, form controls, where profile and logout sit, platform gestures, how errors appear. Heavier for non-technical users.',
    'Use the conventions users already know for behavior and placement. Put distinctiveness into identity, not into how things work.',
    'Copying another product’s whole visual design, or rejecting any identity at all. It’s about expected behavior, not permission to look identical.'],
  ['Tesler’s law', 'A workflow has unavoidable complexity: tax rules, eligibility, loan calculations, multi-party approvals.',
    'Move complexity into the system wherever it can be computed or looked up: prefill, calculate, infer formats, pick defaults from context.',
    'Hiding consequences users need to see, like fees, deadlines, or legal effects. Show the consequence plainly; remove the work.'],
  ['Interaction cost', 'A task is done often: approvals, data entry, triage queues, checkout, search and filter.',
    'Count the steps on the top tasks and cut them: act in place, prefill and remember choices, keep frequent actions one step away and rare ones behind “More”.',
    'Removing protective steps (confirming a destructive action, review before paying), or putting everything on one screen to save a click. That trades clicks for thinking.'],
  ['Postel’s law', 'Users type phone numbers, IDs, dates, amounts, addresses, and names.',
    'Accept spaces, dashes, pasted formatting, and local date styles, strip them yourself, then show back a normalized, confirmed value.',
    'Accepting anything and silently guessing. For money and identity, be lenient about format and strict about meaning.'],
  ['Doherty threshold', 'Anything with latency: search, filtering, saving, submitting, dashboard loads, especially on mid-range Android over mobile data.',
    'Respond to every input within about 400 ms, even if the work takes longer: pressed states, inline spinners, optimistic updates, skeletons shaped like the content.',
    'Fake delays to feel “premium,” or a full-screen spinner for a 100 ms request. Feedback should be proportional to the wait.'],
  ['Von Restorff effect', 'One thing must stand out: the primary action, a critical alert, an overdue status.',
    'Reserve one distinctive treatment for the thing that matters and keep everything else quieter. In dashboards, the alert color is for real alerts.',
    'Highlighting several things “a bit,” which cancels out. Color alone also fails color-blind users (WCAG 1.4.1).'],
  ['Zeigarnik effect', 'Long or interrupted tasks: multi-step applications, onboarding, document uploads.',
    'Make unfinished work visible and easy to resume: autosave drafts, show what’s done and what remains, return users to where they left off.',
    'Profile-completion bars that nag users into handing over optional data. In government and banking that erodes trust.'],
  ['Serial position effect', 'Users scan a list or sequence: navigation bars, settings, onboarding steps.',
    'Put the most important items first and last.',
    'Reordering a familiar or logical sequence (alphabetical, chronological, platform order) just to exploit it.'],
  ['Peak-end rule', 'An experience has a high or low point and a clear ending: a payment, a submitted application, a resolved error.',
    'Invest in the worst moment and the last one: humane error recovery that keeps data, and a confirmation with a reference number, what happens next, and how to get help.',
    'Confetti on serious tasks. A benefits claim isn’t a game; a calm, specific confirmation is the right peak.'],
  ['Aesthetic-usability effect', 'Weighing polish against function, or interpreting user feedback.',
    'Craft matters, especially in trust-sensitive domains. Spend it on alignment, consistent spacing, and type hierarchy, not decoration.',
    'Justifying gradients, glass, and animation that hide usability problems. It also masks problems in testing.'],
];

const GESTALT: [string, string, string][] = [
  ['Proximity', 'Space within a group is clearly smaller than between groups. Labels sit closer to their own field than to the one above.', 'Uniform spacing, so nothing groups.'],
  ['Similarity', 'Things that behave alike look alike. Each clickable style means one thing.', 'Static tags styled like buttons; primary and secondary buttons nearly identical.'],
  ['Common region', 'A shared background or border groups genuinely separate units.', 'Cards inside cards inside cards.'],
  ['Continuity', 'Align on shared edges so the eye follows a line. Forms stay in one column.', 'Two-column forms of unrelated fields.'],
  ['Closure and figure-ground', 'Overlays and sheets separate clearly from what’s behind them, with a scrim and trapped focus.', 'Low-contrast overlays that blur what’s interactive.'],
  ['Uniform connectedness', 'Lines and shared containers show relationships, as in steppers and timelines.', 'Decorative lines implying relationships that don’t exist.'],
  ['Prägnanz', 'Simple, regular layouts whose structure can be described in one sentence.', 'Complex asymmetric layouts on task-focused screens.'],
];

const MECHANICAL: [string, ReactNode, string][] = [
  // prepon-ignore purple-gradient
  ['purple-gradient', <>Purple, indigo, or violet gradients such as <code>from-purple-500 to-indigo-600</code>, the default “tech” backdrop.</>, 'Use the brand color as a flat surface, or a tonal step of one hue for depth.'],
  // prepon-ignore gradient-text
  ['gradient-text', <>Gradient-filled headlines (<code>bg-clip-text text-transparent</code>).</>, 'Solid ink or brand color; emphasis from size, weight, and space. Gradient text often fails contrast at one end.'],
  ['default-font', 'Inter or Poppins as the only typeface, with no brand reason.', 'The brand font, or a face chosen for the job: tabular figures for data, a legible humanist sans for government. If Inter is right, say why.'],
  // prepon-ignore glassmorphism
  ['glassmorphism', <>Frosted panels (<code>backdrop-blur</code>) as decoration.</>, 'Opaque surfaces with a tonal or border step. Blur is expensive on mid-range Android and makes contrast unpredictable.'],
  // prepon-ignore blur-blob
  ['blur-blob', <>Large blurred circles behind content (<code>absolute rounded-full blur-3xl</code>).</>, 'Remove them. Use relevant imagery or a quiet brand pattern if the page needs atmosphere.'],
  // prepon-ignore oversized-radius
  ['oversized-radius', <><code>rounded-2xl</code> or larger on every card, button, and input.</>, 'One radius scale in tokens (say 4 / 8 / 12), applied by role. Institutional products usually want smaller radii.'],
  // prepon-ignore heavy-shadow
  ['heavy-shadow', <><code>shadow-xl</code> or <code>shadow-2xl</code> on resting cards.</>, 'Borders or a tonal shift at rest; shadows only for things that float, so elevation means something.'],
  ['emoji-heading', 'Emoji in headings and labels, as in “Get started” with a rocket.', 'Plain, specific headings; an icon from the project set if it helps recognition.'],
  // prepon-ignore filler-copy
  ['filler-copy', '“Seamless,” “elevate your,” “supercharge,” “effortless,” “cutting-edge,” “empower,” lorem ipsum.', 'Say what the user can do and what happens next, in the domain’s words. Real copy also tests the layout.'],
  // prepon-ignore sparkle-icon
  ['sparkle-icon', <>Sparkle or magic-wand icons (<code>Sparkles</code>, <code>WandSparkles</code>) on features that aren’t AI.</>, 'An icon that names the action, or none. Label real AI features in words.'],
  // prepon-ignore low-contrast-text
  ['low-contrast-text', <>Light gray on white (<code>text-gray-400</code>) for body or helper text, about 2.5:1.</>, 'The 500 or 600 step, or a muted token that passes 4.5:1. Hierarchy from size and weight.'],
  ['tiny-text', 'Text below 12px.', '12px as the floor for incidental labels, 14 to 16px for anything read.'],
  ['tiny-target', 'Interactive elements 16 to 28px tall or wide.', 'Hit areas of 44 to 48px on touch, via padding or hitSlop. 24px is the WCAG floor, not the target.'],
  // prepon-ignore outline-removed
  ['outline-removed', <><code>outline-none</code> with no replacement focus style.</>, 'Keep the outline, or a focus-visible ring with 3:1 contrast.'],
  // prepon-ignore decorative-motion
  ['decorative-motion', <><code>animate-bounce</code> or <code>animate-ping</code> as decoration.</>, 'Motion only for cause and effect, respecting prefers-reduced-motion.'],
  ['hardcoded-color', 'Hex colors in component code instead of tokens.', 'Use or add a theme token. Hardcoded colors are how a system drifts into twenty slightly different blues.'],
  ['placeholder-label', 'Inputs whose only label is the placeholder.', 'A visible label above the field and format hints below. Placeholders vanish exactly when people need them.'],
  // prepon-ignore ai-vocabulary
  ['ai-vocabulary', '“Delve,” “tapestry,” “a testament to,” “in today’s fast-paced world,” “harness the power,” “look no further,” “all-in-one.”', 'The plain word, or cut the phrase. Most of these sentences survive with it deleted.'],
  // prepon-ignore assistant-leak
  ['assistant-leak', '“I hope this helps,” “Great question,” “Feel free to,” “Let’s dive in” in interface copy.', 'Write what the product would say in that spot. Interfaces don’t make small talk.'],
  // prepon-ignore vague-error
  ['vague-error', '“Oops!”, “Something went wrong,” “An error occurred.”', 'Say what failed, whether the user’s work was kept, and what to do next.'],
  ['vague-link', 'Links that say “click here,” “read more,” or “learn more.”', 'Link text that names the destination. Screen reader users scan links out of context (WCAG 2.4.4).'],
  // prepon-ignore fragment-triplet
  ['fragment-triplet', '“Fast. Simple. Secure.”', 'One sentence that says what is fast, for whom, and how they’d know.'],
  ['exclaim-copy', 'Exclamation marks across the interface: “Success!”, “You’re all set!”', 'Drop them. Calm, exact wording reads as competent, especially on errors and payments.'],
];

const JUDGMENT: [string, string][] = [
  ['The SaaS landing structure: centered hero, three icon cards, testimonials, CTA band.', 'Start from the user’s task. A permit portal’s home page is a search box and the five most-used services.'],
  ['Identical card grids for content that isn’t equal.', 'Vary size and placement by importance; use a list or table for comparable records.'],
  ['Four KPI cards with a sparkline each.', 'Lead with the decision the screen supports, such as exceptions first for operations.'],
  ['Everything centered.', 'Left-align text and forms; center only short standalone moments.'],
  ['One generous spacing value everywhere.', 'A spacing scale tied to grouping: dense where users scan, roomier where they read.'],
  ['Dark mode by default for enterprise tools.', 'Follow the system preference, and test both themes if you ship both.'],
  ['Default Tailwind blue or slate as the whole palette.', 'Derive the palette from the brand, then check contrast.'],
  ['An icon on every label and menu item.', 'Icons where they speed recognition; plain text elsewhere.'],
  ['Badges and chips everywhere.', 'Reserve chips for status and filters.'],
  ['Fake round data (“$12,345”, “98%”).', 'Realistic values: long names, zeros, negative amounts, missing data.'],
  // prepon-ignore vague-error
  ['Friendly-generic microcopy (“Oops! Something went wrong”).', 'Say what happened, whether data was saved, and what to do next.'],
  ['Hover-only affordances.', 'Visible actions, or an explicit menu. Touch screens have no hover.'],
  ['Abstract people or blobs in empty states.', 'A sentence on why it’s empty, plus the action that fills it.'],
];

export const referenceDocs: Record<string, ReactNode> = {
  'choosing-a-mode': (
    <>
      <h2>Calling it</h2>
      <p>Plugin skills are namespaced, so the full command is <code>/prepon:prepon</code>. The bare <code>/prepon</code> works as long as nothing else claims that name. You can also skip the command entirely: Prepon triggers on its own when you ask for UI work.</p>
      <h2>How the mode is inferred</h2>
      <p>If the first word of the request is a mode name, that’s the mode. Otherwise:</p>
      <Table head={['You say', 'Mode']} rows={[
        ['Make or change UI', <Link to="/docs/build">build</Link>],
        ['“Review”, “check”, “what’s wrong with”', <Link to="/docs/audit">audit</Link>],
        ['“Apply the fixes”, after an audit', <Link to="/docs/fix">fix</Link>],
        ['“Why is it like this”, “justify”, “document the design”', <Link to="/docs/cite">cite</Link>],
        ['“Show me examples of”', <Link to="/docs/refs">refs</Link>],
        ['“Explore options”, “show me directions before we code”', <Link to="/docs/canvas">canvas</Link>],
      ]} />
      <p>When two modes are plausible, Prepon says which one it picked and why in one line, then continues.</p>
      <h2>What each mode reads, edits, and returns</h2>
      <Table head={['Mode', 'Edits code', 'Reads first', 'Output']} rows={[
        ['build', 'Yes', 'The matching project type, then only the references that apply', 'Code, slop scan, checklist, before/after for existing UI, rationale table'],
        ['audit', 'Never', 'Project types, UX laws, accessibility, slop patterns, responsive or mobile', <code>docs/ui-audit-YYYY-MM-DD.md</code>],
        ['fix', 'Yes', 'The latest audit report and the before/after procedure', 'Fixes in severity order, before/after, change table'],
        ['cite', 'Never', 'UX laws and project types', 'A Markdown table ready to paste'],
        ['refs', 'Never', 'Project types', '3 to 5 real examples with links and what to adapt'],
        ['canvas', 'Only after you pick', 'Project types, slop patterns, accessibility', 'Artboards, then a review of each'],
      ]} />
      <p>References are loaded on demand rather than all at once. Loading everything would dilute attention on the parts that matter for your project.</p>
    </>
  ),

  'project-types': (
    <>
      <p>Prepon reads only the section that matches your project. If a project spans two, such as a banking app with heavy forms, it reads both and lets the stricter one win on conflicts.</p>
      <h2>Government portals</h2>
      <p><strong>Users are trying to</strong> get one thing done (renew, apply, pay, check status) and leave, often reluctantly and for the first time. Many are older, non-technical, or using a second language, and many are on phones. There’s no alternative service.</p>
      <p><strong>What matters most:</strong> that users can tell it’s the real, official site. Plain language. Their service one step from the home page. Knowing beforehand what they’ll need and what happens after. Accessibility is often a legal requirement.</p>
      <p><strong>Laws with the most weight:</strong> Jakob (follow the national design standard if there is one), Tesler, Peak-end, Zeigarnik, Postel.</p>
      <p><strong>Mistakes:</strong> marketing heroes and carousels burying the services; org-chart navigation instead of task navigation; PDFs as the main form; novel styling that looks unofficial; session timeouts that wipe answers.</p>

      <h2>Banking and finance apps</h2>
      <p><strong>Users are trying to</strong> check balances, move money, pay bills, and confirm a transaction happened, quickly and with confidence. Anxiety is high and mistakes are expensive.</p>
      <p><strong>What matters most:</strong> certainty. Exact amounts, the recipient’s name, fees before confirming, a review step, a reference afterwards. Security that allows paste and password managers. Clear pending, failed, and reversed states.</p>
      <p><strong>Laws with the most weight:</strong> Jakob, Fitts, Peak-end, Von Restorff, Doherty (a slow “send” invites double-sending).</p>
      <p><strong>Mistakes:</strong> celebration animations on money movement; amounts without currency or with inconsistent separators; fees revealed after authentication; red for both negative amounts and brand accents; a gradient-and-glass fintech look on an institution trusted for being solid.</p>

      <h2>Fleet and operations dashboards</h2>
      <p><strong>Users are trying to</strong> spot what needs attention now, act on it, and confirm it’s handled, often over long shifts on large screens. Supervisors may check from a phone.</p>
      <p><strong>What matters most:</strong> exceptions first, with the normal state quiet. Density without clutter. Fast search by ID or plate. Data freshness (“updated 12 s ago”). Status that works for color-blind users.</p>
      <p><strong>Laws with the most weight:</strong> Von Restorff, Gestalt proximity and common region, Hick (a default view that answers “what’s wrong?”), Doherty, Miller.</p>
      <p><strong>Mistakes:</strong> identical KPI cards and charts without thresholds; everything colored by status; auto-refresh that reorders the list under the cursor; low-contrast dark themes chosen for looks; map-only views with no list alternative.</p>

      <h2>Form-heavy workflows</h2>
      <p><strong>Users are trying to</strong> complete a long, unfamiliar process (an application, onboarding, a claim, an inspection report) correctly the first time, possibly across several sessions.</p>
      <p><strong>What matters most:</strong> knowing what’s needed before starting, small steps, saved progress, clear errors, a review before submitting, and never losing data.</p>
      <p><strong>Typical layout:</strong> named steps on desktop and “Step 2 of 5: Address” on mobile, one topic per step, a single column with labels above fields, validation on blur, an error summary linking to each field, a sticky Continue on mobile, a check-your-answers page, and a confirmation with a reference number.</p>
      <p><strong>Mistakes:</strong> placeholder-only labels; multi-column fields; “Invalid email” after one character; clearing the form on error; custom dropdowns for three options; date pickers that block typing a birthday; asking for the same data twice; Back and Next with equal weight.</p>

      <h2>Companion mobile apps</h2>
      <p><strong>Users are trying to</strong> do the few things the web system is too awkward for on the go: approve, check status, capture a photo or signature, scan, or look something up. Sessions are short and connectivity is often poor.</p>
      <p><strong>What matters most:</strong> the top 3 to 5 tasks one or two taps from launch, offline tolerance, large targets for use while moving or with gloves, notifications that open the right item, and the same vocabulary as the web system.</p>
      <p><strong>Mistakes:</strong> porting every web feature and dense table; hamburger menus hiding core tasks; desktop-sized text and targets; losing captured data on a failed upload; inconsistent terminology.</p>
    </>
  ),

  'ux-laws': (
    <>
      <p>These aren’t definitions. Each law is written as a rule: when it applies, what it implies, and how it gets misused. Prepon cites one only when it actually shaped a decision, and the citation has to say something about your project, not restate the law.</p>
      {LAWS.map(([name, applies, rule, misuse], i) => (
        <section key={name} aria-labelledby={`law-${i}`}>
          <h2 id={`law-${i}`}>{name}</h2>
          <dl className="law">
            <dt>Applies when</dt><dd>{applies}</dd>
            <dt>Rule</dt><dd>{rule}</dd>
            <dt>Misuse</dt><dd>{misuse}</dd>
          </dl>
        </section>
      ))}
      <h2>Gestalt principles</h2>
      <p>How users read structure before they read words.</p>
      <Table head={['Principle', 'Rule', 'Common misuse']} rows={GESTALT} />
    </>
  ),

  'slop-patterns': (
    <>
      <p>“Slop” is the look AI-generated interfaces share: what you get when every decision falls back on the most common default. Each tell is paired with what to do instead, because banning a default without replacing it just moves the output to the next default. Purple gradients become teal gradients.</p>
      <p>None of these is wrong in every case. A gradient can be the brand; Inter can be the brand font. A finding means “justify this or change it.”</p>

      <h2>The detector</h2>
      <p><code>scripts/detect-slop.js</code> scans <code>.js</code>, <code>.jsx</code>, <code>.ts</code>, <code>.tsx</code>, <code>.css</code>, <code>.scss</code>, and <code>.html</code> files, prints JSON findings, and exits with 1 if it finds anything. It has no dependencies.</p>
      <CodeBlock label="Run it" code="node plugins/prepon/skills/prepon/scripts/detect-slop.js src/" />
      {/* prepon-ignore gradient-text (sample detector output) */}
      <CodeBlock label="Output" code={'[{ "rule": "gradient-text", "file": "src/Hero.tsx", "line": 6,\n   "match": "bg-clip-text", "suggestion": "Use solid ink or brand color; …" }]'} />
      <p>To keep a deliberate choice, add <code>// prepon-ignore &lt;rule-id&gt;</code> on the line or the line above, and say why in the rationale. The detector is a smoke alarm, not a judge.</p>

      <h2>Mechanical tells</h2>
      <p>Detectable from source text. The rule id is what the script reports. {RULE_COUNT ? `The detector has ${RULE_COUNT} rules; these are the most common.` : 'These are the most common.'} The full list is in <code>references/slop-patterns.md</code>.</p>
      <Table head={['Rule', 'Tell', 'Instead']} rows={MECHANICAL.map(([id, tell, instead]) => [<code>{id}</code>, tell, instead])} />

      <h2>Judgment tells</h2>
      <p>No script catches these. Prepon checks them in every audit and before finishing every build.</p>
      <Table head={['Tell', 'Do this instead']} rows={JUDGMENT} />

      <h2>Domain-specific tells</h2>
      <ul>
        <li><strong>Government:</strong> a startup look (gradients, playful copy, trendy type) undermines authority.</li>
        <li><strong>Banking:</strong> gamification and celebration on money movement. Users want amounts, recipients, fees, and a reference number.</li>
        <li><strong>Operations dashboards:</strong> charts with no target or alert line rarely help anyone decide anything.</li>
        <li><strong>Form-heavy workflows:</strong> custom selects and date pickers that break keyboard input and assistive technology. Native controls are usually more accessible and more familiar.</li>
      </ul>

      <h2>Adding a rule</h2>
      <ol>
        <li>Add an object to the <code>RULES</code> array in <code>detect-slop.js</code>: an <code>id</code>, a global <code>pattern</code>, and a <code>suggestion</code>, with optional <code>exts</code>, <code>when</code>, <code>unless</code>, and <code>skipFile</code>.</li>
        <li>Add a matching entry under “Mechanical tells” in <code>references/slop-patterns.md</code>, with the tell and what to do instead.</li>
        <li>Add a triggering snippet to <code>test/detect-slop.test.js</code> and run <code>node --test test/detect-slop.test.js</code>. The first test fails if any rule never fires.</li>
      </ol>
    </>
  ),

  accessibility: (
    <>
      <p>The target is WCAG 2.2 Level AA, which most government and banking procurement now names. Many of these users are older, outdoors on a cracked screen, with the font size turned up, or new to digital services, so accessibility isn’t a separate pass.</p>
      <h2>Contrast</h2>
      <Table head={['What', 'Minimum (AA)', 'WCAG']} rows={[
        ['Body text', '4.5:1', '1.4.3'],
        ['Large text: 24 CSS px, or 18.66 px bold', '3:1', '1.4.3'],
        ['UI boundaries and states (input borders, focus rings), and meaningful graphics', '3:1 against adjacent colors', '1.4.11'],
        ['Disabled controls and decoration', 'Exempt', '1.4.3, 1.4.11'],
      ]} />
      <p>Compute ratios from actual token values, in both themes if you ship two. Text over images must pass at its worst point. Color is never the only signal (1.4.1): status gets text or an icon, and links in body text get an underline.</p>
      <h2>Target size</h2>
      <Table head={['Requirement', 'Value', 'Source']} rows={[
        ['WCAG 2.2 AA minimum', '24×24 CSS px, or enough spacing between smaller targets', 'SC 2.5.8'],
        ['WCAG AAA', '44×44 CSS px', 'SC 2.5.5'],
        ['iOS', 'Hit region of at least 44×44 pt', 'Apple HIG'],
        ['Android', '48×48 dp, with 8 dp between targets', 'Android accessibility docs'],
      ]} />
      <p>In practice: 24 px is the legal floor on the web, and anything touched often aims for 44 to 48.</p>
      <h2>Layout, zoom, and text</h2>
      <ul>
        <li><strong>Reflow (1.4.10):</strong> no two-dimensional scrolling at 320 CSS px wide. Data tables, maps, and diagrams may scroll on their own.</li>
        <li><strong>Resize text (1.4.4):</strong> 200% without loss of content. Fixed heights on text containers are the usual cause of clipping.</li>
        <li><strong>Text spacing (1.4.12):</strong> nothing breaks at 1.5× line height and wider letter and word spacing.</li>
        <li><strong>Orientation (1.3.4):</strong> not locked unless it’s essential.</li>
      </ul>
      <h2>Focus and keyboard</h2>
      <ul>
        <li>Everything interactive works by keyboard, in a logical order.</li>
        <li>Focus is visible, and a custom ring needs 3:1 contrast.</li>
        <li><strong>Focus not obscured (2.4.11, new in 2.2):</strong> sticky headers, footers, and banners can’t fully hide the focused element. Use <code>scroll-padding</code>.</li>
        <li>Modals trap focus, close on Escape, and return focus to their trigger.</li>
      </ul>
      <h2>Forms</h2>
      <Table head={['Check', 'Requirement', 'WCAG']} rows={[
        ['Labels', 'Every input has a programmatic, visible label. A placeholder isn’t one.', '1.3.1, 3.3.2'],
        ['Input purpose', <>Personal fields use <code>autocomplete</code> tokens</>, '1.3.5'],
        ['Errors', 'Described in text, tied to the field, with a suggested fix', '3.3.1, 3.3.3'],
        ['Error prevention', 'Legal, financial, and data-changing submissions can be reviewed or reversed', '3.3.4'],
        ['Redundant entry', 'Don’t ask for the same information twice in one process', '3.3.7'],
        ['Accessible authentication', 'No memory or transcription test to log in; allow paste and password managers', '3.3.8'],
        ['Consistent help', 'Help sits in the same place on every page', '3.2.6'],
        ['Dragging', 'Anything draggable also works with a single pointer', '2.5.7'],
        ['Status messages', <>Announced without moving focus (<code>role="status"</code>)</>, '4.1.3'],
      ]} />
      <p>WCAG 2.2 removed 4.1.1 Parsing, so Prepon doesn’t cite it.</p>
      <h2>React Native</h2>
      <p>Custom touchables get <code>accessibilityRole</code>, <code>accessibilityLabel</code> when there’s no visible text, and <code>accessibilityState</code>. Leave <code>allowFontScaling</code> on and fix layouts that break. Group a card’s text into one focusable element. Test with TalkBack, since that’s what most of these users have.</p>
    </>
  ),

  responsive: (
    <>
      <p>Mobile-first: write the 360 px layout first, then add complexity with <code>min-width</code> queries. For these projects the phone layout is the primary product, not a fallback.</p>
      <h2>Widths to design and test</h2>
      <Table head={['Width', 'Why']} rows={[
        ['320 CSS px', 'The WCAG reflow test width, and what a 1280 px laptop shows at 400% zoom.'],
        ['360 CSS px', 'The most common Android phone width, and the primary design width.'],
        ['768 CSS px', 'Small tablets; usually where a second column first fits.'],
        ['1024 to 1280 CSS px', 'Laptops, and the usual width for back-office tools.'],
        ['1440 CSS px', 'Desktop. Check that text doesn’t stretch into unreadable line lengths.'],
      ]} />
      <h2>Breakpoints</h2>
      <ul>
        <li>They come from content, not devices: add one where the layout starts to break, then snap it to the project’s existing set.</li>
        <li>Use the project’s breakpoints. Read the Tailwind config rather than assuming its defaults.</li>
        <li>Container queries for components that live in slots of different widths; viewport queries for page layout.</li>
        <li>Two or three layout changes per screen is usually enough. Every breakpoint is another layout to test.</li>
      </ul>
      <h2>Layout rules</h2>
      <ul>
        <li><strong>Line length</strong> of about 45 to 75 characters for reading text.</li>
        <li><strong>Forms stay one column</strong> at every width. Short related pairs like city and postcode are the exception.</li>
        <li><strong>Tables on phones:</strong> record lists become stacked rows; real comparison tables keep their own horizontal scroll with a sticky first column.</li>
        <li><strong>Navigation:</strong> a bottom bar for five or fewer destinations in phone-heavy apps, otherwise a top bar. Same items, same order at every width.</li>
        <li><strong>Images</strong> get dimensions or an aspect ratio, <code>srcset</code>, and lazy loading below the fold.</li>
        <li><strong>At most one sticky top and one sticky bottom,</strong> with <code>scroll-padding</code> so focused fields aren’t hidden.</li>
      </ul>
      <h2>Fluid type</h2>
      <CodeBlock label="clamp() with rem bounds" code={'--step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);   /* body: 16 → 18px */\n--step-2: clamp(1.375rem, 1.2rem + 0.9vw, 1.875rem);  /* h2 */\n--step-4: clamp(1.75rem, 1.4rem + 1.8vw, 2.75rem);    /* h1 */'} />
      <p>Never size text in <code>vw</code> alone: it doesn’t grow with browser zoom. Body text on phones is at least 16px, which also stops iOS Safari zooming on input focus. Use tabular figures for amounts and live numbers.</p>
      <h2>Safe areas</h2>
      <p>For full-bleed layouts on notched phones, add <code>viewport-fit=cover</code> and pad edges with <code>env(safe-area-inset-*)</code>, for example <code>padding-bottom: max(1rem, env(safe-area-inset-bottom))</code> on a bottom bar.</p>
    </>
  ),

  mobile: (
    <>
      <p>Unless the project says otherwise, Prepon designs for a mid-range Android phone: about 360dp wide, a modest CPU, gesture navigation, often outdoors, sometimes on unreliable data, and often used one-handed. If it works there, it works on a flagship.</p>
      <h2>Touch targets</h2>
      <p>48×48 dp on Android with 8 dp between targets, a 44×44 pt hit region on iOS, and 24 CSS px as the WCAG floor on the web. In React Native, <code>hitSlop</code> on <code>Pressable</code> lets a 24dp icon keep a 48dp hit area, as long as neighbours don’t overlap.</p>
      <h2>Safe areas</h2>
      <p>Use <code>react-native-safe-area-context</code>; the built-in <code>SafeAreaView</code> is deprecated and iOS-only. Apply insets where content meets an edge rather than wrapping the whole screen. Android gesture navigation reserves the bottom edge, so keep swipe-from-bottom interactions and tiny targets away from it.</p>
      <h2>Thumb zones</h2>
      <p>Practitioner heuristics from observational research, not standards:</p>
      <ul>
        <li>The bottom-centre third is easiest to reach one-handed; the top corners are hardest.</li>
        <li>Primary and frequent actions go low: bottom navigation, the primary button at the end of a form, a sticky bottom bar on long forms.</li>
        <li>Destructive and rare actions go out of the easy zone, or behind a menu or confirmation, and never directly next to the primary one.</li>
      </ul>
      <h2>Platform behavior</h2>
      <ul>
        <li><strong>Android back</strong> closes the sheet, then goes up the stack, then asks before discarding unsaved input.</li>
        <li><strong>Bottom tabs</strong> for 3 to 5 destinations, with visible labels.</li>
        <li><strong>Keyboards:</strong> the right <code>keyboardType</code>, autofill hints, <code>returnKeyType</code>, and keyboard avoidance so the focused field and submit stay visible.</li>
        <li><strong>Pickers:</strong> platform date and time pickers; radio rows or a segmented control for fewer than about seven options.</li>
        <li><strong>Feedback:</strong> an immediate pressed state on every press, and reduced motion respected.</li>
      </ul>
      <h2>Type, performance, offline</h2>
      <ul>
        <li>Body 16, secondary 14, nothing under 12. Test at the largest system font; use <code>minHeight</code>, not fixed heights.</li>
        <li><code>FlatList</code> or <code>FlashList</code> for long lists. Avoid blur, large shadows, and many simultaneous animations on lower-end GPUs.</li>
        <li>Show connection state when it matters, queue writes and say so, persist drafts, and prevent double submits.</li>
      </ul>
    </>
  ),

  'before-after': (
    <>
      <p>When build or fix changes UI that already exists, Prepon captures it before and after at 360, 768, and 1440 px and publishes a side-by-side comparison, so you can judge the change with your own eyes. New screens skip this. The rule that matters most: it never describes a visual result it didn’t capture.</p>
      <h2>On the web</h2>
      <ol>
        <li>Work out the routes that show the affected UI, one per distinct state.</li>
        <li>Find the running dev server, or start it if the project script is obvious. Never guess a URL and screenshot an error page.</li>
        <li>Check for Playwright in the project. If it’s missing, Prepon asks before installing it, since it adds a dev dependency and a browser download.</li>
        <li>Capture the before state, keeping the printed <code>stamp</code>.</li>
        <li>Make the changes.</li>
        <li>Capture the after state with the same stamp.</li>
        <li>Write <code>compare.html</code> with before on the left and after on the right for each route and width, two or three annotations per row, and publish it with the images as supporting files.</li>
      </ol>
      <CodeBlock label="Snapshot script" code={'node ${CLAUDE_SKILL_DIR}/scripts/snapshot.js --base http://localhost:5173 \\\n  --routes /login,/dashboard --phase before'} />
      <p>Check each shot’s <code>finalUrl</code>: a protected route that landed on the login page wasn’t captured. Pass <code>--storage-state auth.json</code> or treat that route as not capturable. Add <code>--wait-for</code> with a selector if content loads late.</p>
      <h2>Keep screenshots out of git</h2>
      <p>Snapshots go in <code>.prepon/snapshots/&lt;stamp&gt;/</code>, and the script adds <code>.prepon/</code> to your <code>.gitignore</code> if it’s missing. Screenshots of client screens don’t belong in version control.</p>
      <h2>React Native</h2>
      <p>With a running simulator or emulator (<code>xcrun simctl io booted screenshot</code>, or <code>adb exec-out screencap -p</code>), screens go into the same folders as <code>&lt;screen&gt;@&lt;device&gt;.png</code>.</p>
      <h2>When it can’t capture</h2>
      <p>No dev server, no simulator, a login it can’t get past, or no artifact support: Prepon says which one in a line, skips the screenshots, and gives the change table and the diff. It won’t write “the button now looks balanced” about something it hasn’t seen.</p>
      <h2>The change summary table</h2>
      <p>Always included, captured or not: What changed / Before / After / Principle or reason, with real values from the code. See <Link to="/docs/fix">fix</Link> for an example.</p>
    </>
  ),
};

import type { ReactNode } from 'react';
import { Link } from '../router';
import { CodeBlock, Table } from '../ui';

const Example = ({ code }: { code: string }) => <CodeBlock label="Example" code={code} />;

export const modeDocs: Record<string, ReactNode> = {
  build: (
    <>
      <Example code="/prepon:prepon build a vehicle detail drawer for the dispatch console" />
      <p>Build runs whenever you ask Claude to make or change interface code, even if the request never says “design.” That includes screens, components, forms, flows, tables, navigation, and React Native screens.</p>

      <h2>It reads the project before designing</h2>
      <p>Most of what a designer would ask is already in the repository, so Prepon looks there first:</p>
      <ul>
        <li><strong>Project type and domain</strong> from the README, package name, route names, UI copy, and API names, matched to one of the <Link to="/docs/project-types">project types</Link>.</li>
        <li><strong>Audience:</strong> who signs in, how technical they are, and what device they’re likely on. Unless the project says otherwise, it assumes non-technical users on mid-range Android phones over unreliable connections.</li>
        <li><strong>Platform:</strong> React web, React Native, or both (Vite, Next.js, Expo, and so on).</li>
        <li><strong>Existing system:</strong> design tokens, theme files, Tailwind config, CSS variables, and component libraries such as MUI, Chakra, shadcn, or React Native Paper. Existing tokens are treated as the project’s identity. Prepon extends them instead of replacing them with its own taste.</li>
        <li><strong>Brand tone:</strong> logo, colors, copy voice, and any brand guide in the repo.</li>
      </ul>
      <p>It then summarizes what it found in a few lines. If something essential is still unknown, usually the audience or the brand, it asks about that one thing before it writes code.</p>

      <h2>The workflow</h2>
      <ol>
        <li><strong>Context,</strong> as above, even for small changes. Small changes are where one-off styles creep in.</li>
        <li><strong>Read selectively.</strong> The matching project-type section, then only the references that apply: mobile, responsive, accessibility, or a specific UX law.</li>
        <li><strong>Commit to a direction</strong> in one or two sentences tied to the context, before any code. For example: “Dense, calm operations look: neutral slate surfaces with one signal color reserved for alerts, tabular figures, and a compact 4px spacing scale, because dispatchers scan many vehicles at once.” That gives you something concrete to push back on.</li>
        <li><strong>Before state.</strong> If existing UI is changing, capture it first (see <Link to="/docs/before-after">Before and after</Link>).</li>
        <li><strong>Mobile-first.</strong> Build the 360 px layout first, then add complexity at wider breakpoints.</li>
        <li><strong>Slop scan.</strong> Run the <Link to="/docs/slop-patterns">detector</Link> on the changed files, fix real findings, and justify deliberate ones. Then review the judgment tells no script can catch.</li>
        <li><strong>Self-review checklist,</strong> below, checked against the code.</li>
        <li><strong>After state</strong> and a side-by-side comparison, if there was a before state.</li>
        <li><strong>Rationale table:</strong> Decision / Principle / Why it applies here.</li>
      </ol>

      <h2>Conventional behavior, distinctive identity</h2>
      <p>Familiar patterns and a distinctive look pull against each other. Prepon settles it by splitting the two:</p>
      <ul>
        <li><strong>Behavior stays conventional:</strong> navigation placement, form patterns, where primary and destructive actions sit, back behavior, platform idioms, error handling, and familiar icons. Enterprise users didn’t pick your product for its novelty.</li>
        <li><strong>Identity is where the product earns its character:</strong> typography, color, spacing scale, layout rhythm, illustration, and copy voice. This is where generic defaults show up, so this is where they get replaced with choices drawn from the brand and the domain.</li>
        <li><strong>Government and banking lean further toward clarity.</strong> Distinctive there means unmistakably <em>this</em> institution: steady, legible, calm. Not unusual.</li>
      </ul>

      <h2>The self-review checklist</h2>
      <ul>
        <li>Body text contrast at least 4.5:1, large text 3:1, UI boundaries, focus rings, and meaningful icons 3:1.</li>
        <li>Web targets at least 24×24 CSS px; primary touch targets aim for 44pt on iOS and 48dp on Android.</li>
        <li>No horizontal scrolling at 320 CSS px, except data tables and maps in their own scroll container.</li>
        <li>Every input has a visible label, and errors say what went wrong and how to fix it, next to the field.</li>
        <li>Keyboard focus is visible and never hidden behind sticky headers or footers.</li>
        <li>State isn’t conveyed by color alone.</li>
        <li>Loading, empty, error, and offline states exist for every data region.</li>
        <li>Safe areas are respected on mobile.</li>
        <li>Primary actions are within thumb reach on phones, and destructive actions aren’t next to primary ones.</li>
        <li>Text survives 200% zoom or the largest OS font size without clipping.</li>
        <li>Values come from the project’s tokens, with no new one-off colors, sizes, or radii.</li>
        <li>The slop scan is clean, or each remaining finding is justified.</li>
      </ul>

      <h2>What you get back</h2>
      <p>The code, the scan results, the checklist results, a before/after comparison when existing UI changed, and a rationale table like this one:</p>
      <Table head={['Decision', 'Principle', 'Why it applies here']} rows={[
        ['Alert red used only for vehicles off route', 'Von Restorff effect', 'Dispatchers scan 40 rows at once; if the accent is everywhere, the one real fault doesn’t stand out.'],
        ['Teal accent', 'none', 'Judgment call: matches the existing card style.'],
      ]} />
      <p>A principle appears only when it actually drove the decision. If a choice came from the brand guide, an existing token, a stakeholder request, or taste, the table says so. “Fitts’s law” next to every button is exactly the kind of decoration that makes a client stop trusting the table.</p>
    </>
  ),

  audit: (
    <>
      <Example code="/prepon:prepon audit src/pages/PermitApplication.tsx" />
      <p>An audit reviews existing UI and writes a report. It never changes source code: a review people can trust has to be separate from the fixing, so you decide what changes. The target can be a file, a directory, a component name, or a route.</p>

      <h2>Steps</h2>
      <ol>
        <li><strong>Resolve the target</strong> to the files that render it, including shared components and styles. If it’s ambiguous, Prepon lists what it found and asks.</li>
        <li><strong>Read the references:</strong> the matching project type, UX laws, accessibility, slop patterns, and responsive or mobile depending on the platform.</li>
        <li><strong>Run the detector</strong> on the target’s files and confirm each finding in context before reporting it.</li>
        <li><strong>Look at it, if possible.</strong> With a dev server and Playwright available, it captures screenshots and reviews them too, since many hierarchy problems only show up visually. Otherwise the report says it was code-only.</li>
        <li><strong>Review</strong> against each area of the rubric and the judgment tells.</li>
        <li><strong>Write the report</strong> to <code>docs/ui-audit-YYYY-MM-DD.md</code> in your project, adding <code>-2</code>, <code>-3</code> if one exists for today.</li>
        <li><strong>Reply</strong> with the scores, the critical findings, and the file path.</li>
      </ol>

      <h2>Severity</h2>
      <Table head={['Severity', 'Meaning']} rows={[
        ['Critical', 'Blocks or derails a core task, risks data or money loss, or fails WCAG 2.2 AA in a core flow, such as an unlabeled required field.'],
        ['Major', 'Real friction in a common task, an AA failure off the core flow, or a slop tell that undermines trust in this domain.'],
        ['Minor', 'Inconsistency, polish, or a low-impact convention break.'],
      ]} />

      <h2>Scoring, out of 50</h2>
      <p>Five areas, each scored 0 to 10 against fixed anchors, with one sentence of reasoning per score. A screen with a critical accessibility failure in its main flow can’t score above 5 on accessibility, and scores aren’t averaged toward 7 out of habit.</p>
      <Table head={['Area', '9–10', '6–8', '3–5', '0–2']} rows={[
        ['Usability', 'Core tasks obvious and efficient; errors recoverable.', 'Works, with friction.', 'Users struggle in a core task.', 'Core task blocked.'],
        ['Accessibility', 'Meets WCAG 2.2 AA throughout, as far as can be checked.', 'A few AA gaps off the core flow.', 'AA failures in the core flow.', 'Unusable by keyboard or screen reader.'],
        ['Responsiveness and mobile', 'Works from 320 to 1440; targets, safe areas, thumb reach handled.', 'Minor breakage at some widths.', 'A squeezed desktop on phones.', 'Broken on phones.'],
        ['Distinctiveness', 'Identity clearly from the brand and domain.', 'Mostly specific, some defaults.', 'Reads as a template.', 'Pure default output.'],
        ['Consistency', 'One radius scale, one set of button variants with full states, one term per concept, across screens.', 'A few visual outliers, or one behavior that drifts.', 'Several button styles or radii; behavior differs between screens.', 'Reads as several products stitched together.'],
      ]} />
      <p>Consistency is scored against the whole product, not the target alone. If the target is the only screen, it’s scored on internal consistency and the reason says so.</p>

      <h2>The report</h2>
      <p>A summary of what the screen is for and the most important problem, the score table, a findings table (ID, severity, file and line, finding, principle or rule, suggested fix), a prioritized fix list, and a “Not checked” section for what couldn’t be verified. Findings are numbered A1, A2, and so on so that <Link to="/docs/fix">fix</Link> can refer to them.</p>
    </>
  ),

  fix: (
    <>
      <Example code="/prepon:prepon fix A1-A3" />
      <p>Fix applies findings from an audit report. Without a report it offers to run an audit first, because fixing without one turns into an unreviewed redesign.</p>
      <h2>Steps</h2>
      <ol>
        <li><strong>Find the audit:</strong> the latest <code>docs/ui-audit-*.md</code>, unless you name one.</li>
        <li><strong>Scope:</strong> the findings you asked for (“top three”, “A1–A4”, “all criticals”). If you didn’t say, it proposes all criticals plus the majors in the same files, and confirms.</li>
        <li><strong>Capture the before state.</strong></li>
        <li><strong>Fix in severity order,</strong> each fix as small as it can be while still addressing the cause. A contrast problem gets fixed in the token, not by overriding one component. If a fix needs a design decision the audit didn’t settle, it asks.</li>
        <li><strong>Re-check:</strong> run the detector on the changed files and verify each fixed finding against its rule.</li>
        <li><strong>Capture the after state</strong> and publish the comparison.</li>
        <li><strong>Update the report</strong> with a “Fixes applied” section listing each finding ID, what was done, and whether it was verified visually or only in code.</li>
        <li><strong>Reply</strong> with the change summary table and the comparison link.</li>
      </ol>
      <h2>The change summary table</h2>
      <Table head={['What changed', 'Before', 'After', 'Principle or reason']} rows={[
        // prepon-ignore low-contrast-text (quoted as the "before" value in an example table)
        ['Primary button on login', <>32px tall, <code>text-gray-400</code> label</>, <>48px full-width, <code>--color-ink</code> label</>, 'Fitts’s law: one-handed use on phones; contrast went from 2.5:1 to 7:1 (WCAG 1.4.3)'],
      ]} />
      <p>Before and After hold real values from the code, not adjectives.</p>
    </>
  ),

  cite: (
    <>
      <Example code="/prepon:prepon cite the transfer review screen" />
      <p>Cite explains an existing design for client documentation. It never edits code. It picks out the notable decisions (layout, navigation, primary action placement, form patterns, type and color, density, states, platform behavior), skips trivia, and gives each one an honest status.</p>
      <h2>Four statuses</h2>
      <Table head={['Status', 'Meaning']} rows={[
        ['Justified', 'A principle or standard supports it, and it fits this project’s users.'],
        ['Judgment call', 'Reasonable, but no principle drove it: brand preference, consistency with other screens, or taste. That’s a legitimate answer.'],
        ['Unjustified', 'No clear reason, and it costs something.'],
        ['Contradicts', 'It goes against a named principle or standard, and it matters here.'],
      ]} />
      <h2>Output</h2>
      <p>A Markdown table you can paste straight into documentation:</p>
      <Table head={['#', 'Decision', 'Where', 'Principle or standard', 'Why it applies to this project', 'Status']} rows={[
        ['1', 'Single-column form with labels above fields', 'ApplicationForm.tsx', 'Gestalt continuity; WCAG 3.3.2', 'Applicants on phones fill this in one pass. A single reading line prevents skipped fields.', 'Justified'],
        ['2', 'Teal accent color', 'theme.ts', 'none', 'Matches the agency logo.', 'Judgment call'],
      ]} />
      <p>Below it comes a short “Flagged” list of the Unjustified and Contradicts rows, each with a one-line suggestion.</p>
      <h2>Why the “why” column matters</h2>
      <p>It has to say something about this project or its users. If it would only restate the law’s definition, the citation is decorative and gets dropped. The point of the table is that a client can trust it.</p>
    </>
  ),

  refs: (
    <>
      <Example code="/prepon:prepon refs multi-step identity verification" />
      <p>Refs finds 3 to 5 real reference designs for a pattern, relevant to your project type. They inform structure and behavior. They aren’t visuals to copy.</p>
      <h2>Steps</h2>
      <ol>
        <li><strong>Clarify the pattern</strong> if it’s vague. “Onboarding” for whom, on which platform?</li>
        <li><strong>Search,</strong> preferring pattern pages with documented reasoning over screenshot galleries: GOV.UK Design System, U.S. Web Design System, Material Design, Apple HIG, IBM Carbon, Atlassian, Shopify Polaris, well-regarded public services, and published case studies from banks or operations-software teams.</li>
        <li><strong>Verify every link</strong> by fetching it. A URL that hasn’t been confirmed to exist and show what’s claimed doesn’t get listed.</li>
        <li><strong>Output</strong> a table: Example / Link / What it does well / Principle it demonstrates / What to adapt for this project, plus two or three lines on which structure to borrow and how your identity would differ.</li>
      </ol>
      <h2>Adapt the structure, not the look</h2>
      <p>Step order, information hierarchy, interaction patterns, and error handling are fair to borrow. Another product’s visual design, logo, illustrations, or distinctive styling are not, partly for legal reasons and partly because copying someone else’s identity is just a different kind of generic.</p>
    </>
  ),

  canvas: (
    <>
      <Example code="/prepon:prepon canvas mobile banking settings screen" />
      <p>Canvas is visual exploration before any code changes. It’s useful when you want to compare directions before committing to one.</p>
      <h2>Steps</h2>
      <ol>
        <li><strong>Context,</strong> established the same way build does it.</li>
        {/* prepon-ignore filler-copy (names the tell to avoid) */}
        <li><strong>A design brief</strong> shown to you first: project type, audience, platform, the task the screen supports, real content (realistic labels and data, not lorem ipsum), the constraints that apply (target sizes, contrast floors, safe areas, the slop tells to avoid in this domain), and the number of directions, three by default.</li>
        <li><strong>Publish the canvas,</strong> with one artboard per direction at the target device size: 360 wide for phones, plus 1440 for web.</li>
        <li><strong>Review each direction</strong> for strengths, issues (contrast, targets, slop tells, convention breaks), and the principles involved, then recommend one in a sentence or two.</li>
        <li><strong>When you pick one,</strong> it switches to <Link to="/docs/build">build</Link>, with that direction as the committed visual direction. If you edited the canvas in the browser, it reads your version first.</li>
      </ol>
      <h2>Directions that actually differ</h2>
      <p>The three directions differ in identity (type, color, density, layout rhythm) and share the same behavioral conventions. Three color swaps of one layout isn’t exploration.</p>
      <h2>Where it publishes</h2>
      <Table head={['Situation', 'What you get']} rows={[
        ['Design canvas available', 'Artboards on the same canvas /design produces. Needs Claude Code v2.1.265 or later, a claude.ai login, and an organization that hasn’t turned off the Design template.'],
        ['Artifacts available, Design type not offered', 'One self-contained HTML page with the directions side by side as device-sized frames, published as a regular artifact.'],
        ['No artifacts (Bedrock, Vertex, Foundry, or claude -p)', <>The same HTML page written to <code>.prepon/canvas/</code>, with its path.</>],
      ]} />
    </>
  ),
};

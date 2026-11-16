# Project types

Read only the section that matches the project. If a project spans two (a banking app with heavy forms), read both and let the stricter one win on conflicts. Each section covers what users are trying to do, what matters most, which laws carry the most weight, the typical layouts, and the usual mistakes.

## Contents

- [Government portals](#government-portals)
- [Banking and finance apps](#banking-and-finance-apps)
- [Fleet and operations dashboards](#fleet-and-operations-dashboards)
- [Form-heavy workflows](#form-heavy-workflows)
- [Companion mobile apps](#companion-mobile-apps)
- [Projects that don't match a type](#projects-that-dont-match-a-type)

---

## Government portals

**Users are trying to** get one specific thing done (renew, apply, pay, check status) and leave, often reluctantly and often for the first time. Many are older, non-technical, or using a second language, and many are on phones. They didn't choose this service, because there's no alternative.

**What matters most:** that users can tell this is the real, official site. Plain language. Users find their service in one step from the home page. They know before starting what they'll need (documents, fees, time) and what happens after. Accessibility is often a legal requirement here, not just good practice.

**Laws with the most weight:** Jakob (follow national government design standards if they exist; many countries publish one), Tesler (the system should look things up, not the citizen), Peak-end (the confirmation with a reference number and next steps), Zeigarnik (saved progress on long applications), and Postel (accept IDs and phone numbers in any reasonable format).

**Typical layouts:** a search-first home page with the most-used services as a plain list. A "before you start" page. One-question-per-page or short-section forms (see form-heavy workflows). A check-your-answers summary. A confirmation page. Status tracking by reference number.

**Mistakes to avoid:**
- Marketing-style heroes, carousels, and news on the home page while the services are buried.
- Agency org-chart navigation ("Office of X") instead of task navigation ("Renew a permit").
- PDFs as the main way to deliver forms.
- Novel visual styling that makes the site look unofficial. Trust comes from clarity, consistency, and the official identity.
- The opposite failure: a dated, neglected look (square boxes, heavy outlines, default controls). Current national design systems are plain but crafted, and citizens compare the site with the apps on their phones (visual-craft.md).
- Session timeouts that wipe answers without warning.

## Banking and finance apps

**Users are trying to** check balances, move money, pay bills, and confirm that a transaction happened, with confidence and quickly. Anxiety is high around money and security, and mistakes are expensive.

**What matters most:** certainty. That means exact amounts, the recipient's name, fees shown before confirming, a clear review step, and a reference afterwards. Security that doesn't punish legitimate users (WCAG 3.3.8: allow paste and password managers). Fast access to the balance and recent transactions. Clear wording for pending, failed, and reversed states.

**Laws with the most weight:** Jakob (users bring habits from other banking and wallet apps), Fitts (one-handed transfers, and destructive actions placed away from primary ones), Peak-end (the transfer confirmation and the failure state), Von Restorff (one prominent primary action per screen), and Doherty (instant feedback on taps, because a slow "send" invites double-sending).

**Typical layouts:** a home screen with the balance and quick actions (transfer, pay, top-up), then recent transactions. Flows of amount, then recipient, then review, then authenticate, then receipt. Transaction lists grouped by date with clear credit and debit signs and tabular figures. Settings grouped by task (security, notifications, limits, profile).

**Mistakes to avoid:**
- Celebration animations on money movement. Calm confirmation builds more trust.
- Showing amounts without currency, or with inconsistent decimal and thousands separators.
- Hiding fees until after authentication.
- Ambiguous colors: red for negative amounts but also for brand accents.
- A "fintech startup" look (gradients, glass) on an institution that's trusted for being solid.

## Fleet and operations dashboards

**Users are trying to** spot what needs attention now (a vehicle off route, a missed delivery, a sensor fault), act on it, and confirm it's handled. They often watch for long shifts on large screens and make quick decisions under time pressure. Supervisors may also check from a phone.

**What matters most:** exceptions first. The normal state should be quiet, so problems stand out. High information density without clutter. Fast filtering and search by ID or plate. Timestamps and data freshness ("updated 12 s ago"). Status that works for color-blind users.

**Laws with the most weight:** Von Restorff (save alert color for real alerts), Gestalt proximity and common region (group by vehicle, region, or shift), Hick (a default view that answers "what's wrong?" without configuring filters), Doherty (live updates without full refreshes or jumpy layouts), and Miller (don't make users memorize IDs across views; link them).

**Typical layouts:** an alert or exception list alongside a map or table. A filterable, sortable, paginated table with a sticky header and first column. A detail drawer that opens without losing the list position. A compact KPI strip, but only for numbers someone acts on. Login screens are clean and fast, with SSO if available.

**Mistakes to avoid:**
- A grid of identical KPI cards and decorative charts with no thresholds.
- Everything colored by status, so the screen is a rainbow and real alerts get lost.
- Auto-refresh that reorders the list under the user's cursor.
- Low-contrast dark themes chosen for looks. If a dark theme is needed for control rooms, test it for contrast.
- Map-only views with no list or keyboard alternative (and WCAG 2.5.7 for drag interactions).

## Form-heavy workflows

**Users are trying to** complete a long, often unfamiliar process (an application, an onboarding, a claim, an inspection report) correctly, the first time, possibly over several sessions.

**What matters most:** knowing what's needed before starting. Small steps. Saved progress. Clear errors. A review before submitting. Never losing data. Mobile entry that doesn't fight the keyboard.

**Laws with the most weight:** Tesler (prefill and compute), Postel (forgiving input formats), Zeigarnik (progress and resume), Hick (one decision per step for complex choices), Gestalt proximity and continuity (single column, labels close to their fields), and Peak-end (the error and confirmation moments).

**Typical layouts:**
- A stepper with named steps on desktop, and "Step 2 of 5: Address" on mobile.
- One topic per step.
- A single column with labels above fields.
- Inline validation on blur, not on every keystroke.
- An error summary at the top on submit, linking to each field.
- A sticky bottom Continue button on mobile.
- A check-your-answers page with "Change" links.
- A confirmation with a reference number.

**Mistakes to avoid:**
- Placeholder-only labels. Multi-column field layouts.
- Validating while the user is still typing ("Invalid email" after one character).
- Clearing the form on an error.
- Custom dropdowns for 3 options. Date pickers that block typing a known date like a birthday.
- Asking for the same data twice (WCAG 3.3.7).
- "Next" and "Back" buttons with equal weight, or Back placed where Next is expected.

## Companion mobile apps

**Users are trying to** do the few things the web system is too awkward for on the go: approve, check status, capture a photo or signature, scan, get notified, or do a quick lookup. Sessions are short and interrupted. Connectivity is often poor (field staff, drivers, inspectors).

**What matters most:** the top 3 to 5 tasks are one or two taps from launch. Offline tolerance. Large targets for use while moving or with gloves. Push notifications that link straight to the relevant item. The same vocabulary and data as the web system, so users don't relearn anything.

**Laws with the most weight:** Fitts and thumb zones (one-handed use), Jakob (platform conventions for navigation and back), Doherty (instant feedback on unreliable networks), Hick (a small, focused feature set that isn't the whole web app shrunk down), and Zeigarnik (draft capture that survives interruptions).

**Typical layouts:**
- A bottom tab bar with 3 to 5 tasks.
- A list-to-detail stack.
- Full-screen capture flows (camera, scan, signature) with clear retake and confirm.
- A sticky bottom primary action.
- A pending-sync indicator.

**Mistakes to avoid:**
- Porting every web feature and dense table into the app.
- Hamburger menus hiding the core tasks.
- Small text and targets copied from the desktop design.
- Assuming connectivity and losing captured data on a failed upload.
- Inconsistent terminology with the web system.

## Projects that don't match a type

Some projects won't be any of the types above, such as a developer tool's docs site, an internal admin panel, or a marketing page for a product. Don't force a fit, and don't carry over the enterprise defaults.

1. **Name the closest type and the differences.** For example, "Docs site: closest to form-heavy workflows for the reading-and-finding parts, but there are no forms, and the users are developers on desktops." Use the parts of the closest section that transfer.
2. **State the audience explicitly.** Who they are, what they're trying to do, how technical they are, and what device they're on. Work this out from the project, and ask if it's unclear. The default of non-technical users on mid-range Android phones applies to the enterprise types, not here.
3. **Pick the laws that carry weight from the task, not the domain.** Reading and finding favor Jakob (familiar docs conventions), Gestalt, and serial position. Deciding favors Hick and Von Restorff. Doing favors Fitts, Doherty, and Tesler.
4. **The other references still apply.** Accessibility, responsive, and slop patterns don't depend on the project type.

# Before and after

Use this whenever build or fix changes UI that already exists. Brand-new screens skip the before step but still get an after capture when possible (see [New screens](#new-screens)). A comparison lets the user judge the change with their own eyes instead of trusting a description, and that's the whole point. So the one rule that matters most is to never describe a visual result you didn't capture.

## Web

1. **Find the routes.** Work out which routes show the UI you're about to change. Include one route per distinct state that matters (for example `/login` and `/dashboard`), not every page.
2. **Check the dev server.** Look for a running dev server (try the port from `package.json` scripts or the framework default, such as 5173 for Vite or 3000 for Next.js). If none is running, ask the user to start it, or start it yourself in the background if the project's script is obvious. Don't guess a URL and report screenshots of an error page.
3. **Check Playwright.** It should be in the project's `node_modules` (`playwright` or `@playwright/test`). If it's missing, ask before installing, since it adds a dev dependency and a browser download to their project. With approval: `npm i -D playwright && npx playwright install chromium`, or the project's package manager.
4. **Capture the before state** from the project root (`<scripts>` is the scripts folder named in SKILL.md):
   ```
   node <scripts>/snapshot.js --base http://localhost:5173 --routes /login,/dashboard --phase before
   ```
   - Default widths are 360, 768, and 1440. The script also adds `.prepon/` to the project's `.gitignore` if it's missing.
   - To keep captures out of the project folder (a shared checkout, a repo that mustn't change, or when the user asks), add `--out <dir>`. Still run it from the project root so its Playwright is found. Nothing is added to `.gitignore`, and the printed paths are absolute. `tap-map.js` takes the same flag.
   - Routes resolve relative to `--base`, so a site served under a base path keeps it. With `--base http://localhost:5173/app/`, the route `/settings` captures `/app/settings`.
   - In Git Bash on Windows, arguments that start with `/` get rewritten into file paths. Write routes without the leading slash (`login,dashboard`). The script stops with a clear error if it receives a rewritten path.
   - If the script reports `playwright-browser-missing`, run `npx playwright install chromium` in the foreground and wait for it to finish before retrying.
   - The script prints JSON with a `stamp`. Keep it, because the after run must reuse it.
   - Check `finalUrl` for each shot. If a protected route ended up on the login page, you didn't get past authentication. Either ask the user for a Playwright storage state file (`--storage-state auth.json`) or treat that route as not capturable.
   - Captures are full-page by default. Add `--viewport` for screen-sized captures (files end in `-viewport`). Use it to check sticky headers and bottom bars, which a full-page capture shows mid-page, and what a phone shows before scrolling.
   - Look at a couple of the images to confirm they show the real screen, not a spinner or an error. Add `--wait-for "<selector>"` if content loads late.
5. **Make the changes.**
6. **Capture the after state** with the same routes and `--stamp <stamp> --phase after`. Do this after your last code change. If reviewing the captures leads to more fixes, capture every after image again, including state and viewport shots, so the comparison never shows a version that no longer exists.
7. **Publish the comparison.** Write `compare.html` in `.prepon/snapshots/<stamp>/`:
   - one section per route, and inside it one row per width, with before on the left and after on the right (stacked on narrow viewports)
   - two or three short annotations per row on what changed and why, matching the change summary table
   - images referenced by relative path (`before/login@360.png`)

   Publish it as an artifact, passing the images as supporting files so they're served next to the page. Don't inline them as data URIs, because full-page PNGs add up quickly against the size limit. Give the user the link.
8. **Reply** with the change summary table (below) and the link.

## New screens

A new screen has no before state, but it still deserves to be looked at. If a dev server and Playwright are available, run `snapshot.js --phase after` on the new routes and review the images yourself at each width. Check reflow at 360, hierarchy, and anything the checklist marked "code only". Fix what you see, then capture again. You don't need to publish a comparison. Mention in the reply that you reviewed the captures, and give their folder. If you couldn't capture, mark the visual checklist items "code only" (see the self-review checklist in SKILL.md).

## Interaction states

`snapshot.js` only captures each route as it first loads. Drawers, dialogs, validation errors, and loading, empty, or offline states need someone to interact with the page first. For those, write a short one-off Playwright script in `.prepon/` (already ignored by git). It should open the page, click or fill whatever triggers the state, and save to the same snapshot folder with names like `<route>-<state>@<width>.png`. Keep it throwaway: it's evidence for this change, not a test suite. Capture the states the change actually touches. A form change needs its error state, and a list change needs its empty state.

## React Native

Screenshots need a running simulator or emulator. If one is available (for example `xcrun simctl io booted screenshot` on macOS, or `adb exec-out screencap -p > file.png` for Android), capture the affected screens before and after into the same `.prepon/snapshots/<stamp>/{before,after}/` folders, named `<screen>@<device>.png`, and add `.prepon/` to `.gitignore` yourself. If no simulator is available, use the fallback.

## Fallback

When screenshots aren't possible (no dev server, no simulator, a login you can't get past, or no artifact support in this session), say which of these it was in one line. Skip the capture and publish steps, and give the change summary table plus the code diff. Don't write phrases like "the button now looks balanced." You haven't seen it, and the user will reasonably assume you have.

## Change summary table

Always include this in the reply, captured or not:

| What changed | Before | After | Principle or reason |
|---|---|---|---|
| Primary button on login | 32px tall, `text-gray-400` label | 48px full-width, `--color-ink` label | Fitts's law: one-handed use on phones; contrast went from 2.5:1 to 7:1 (WCAG 1.4.3) |

Use real values from the code in the Before and After columns. The last column follows the citation rules in SKILL.md: name a principle only when it drove the change.

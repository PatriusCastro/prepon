# Motion and animation

Good motion answers the user's question "what just happened?" A button that responds to a press, a sheet that slides up from the edge it belongs to, a row that briefly highlights after it's added: these explain cause and effect and make the interface feel responsive and trustworthy. An interface with no motion at all feels abrupt. Panels pop in, state changes are easy to miss, and users tap twice because nothing seemed to happen.

The slop is motion as decoration: every section fading up on scroll, bouncing arrows, parallax, looping glows. In enterprise products, motion should be quick, quiet, and always in service of the task.

## Use motion for

| Purpose | Examples | Typical duration |
|---|---|---|
| Press feedback | Button pressed state, ripple, checkbox tick | 100 ms or less, immediate |
| Small state change | Toggle, tooltip, hover, tab indicator, input focus | 150–200 ms |
| Revealing content | Accordion expand, dropdown, popover, inline error appearing | 200–250 ms |
| Spatial continuity | Bottom sheet, side drawer, dialog, page-level transition on mobile | 250–350 ms |
| Change confirmation | New row highlight, "saved" check, count update | 200 ms in, a short hold, then fade |
| Waiting | Spinner in a button, skeleton shimmer, progress bar | runs until done; keep it calm |

The durations are practitioner guidance, not a standard. The principle behind them: small, frequent changes are fastest, and larger distances and areas take a little longer. Exits should be shorter than entrances (about two thirds), because the user has already moved on. Anything over about 400 ms in a task flow feels slow and delays the user.

## How to animate

- **Easing.** Use ease-out (decelerate) for things entering, ease-in (accelerate) for things leaving, and a standard ease-in-out for things moving on screen. Use linear only for spinners and progress. Avoid bounce and elastic easing in enterprise products, since they read as playful and add perceived time.
- **Cheap properties.** Animate `transform` and `opacity`. They run on the compositor and stay smooth on mid-range Android phones. Avoid animating `height`, `width`, `top`, `left`, `box-shadow`, or `filter: blur()`. For expanding content, use `grid-template-rows: 0fr → 1fr` or a transform. Name the properties (`transition: transform 200ms, opacity 200ms`) instead of using `transition: all`, which also animates layout changes you didn't intend.
- **React Native.** Use the project's animation library. If there's none, use `Animated` with `useNativeDriver: true` for transform and opacity. Reanimated is the usual choice when the project already has it. Check performance on a mid-range Android device or emulator, not only on a desktop browser.
- **Interruptible.** Never block input while something animates. If the user taps again or navigates, the animation should yield.
- **Tokens.** Define durations and easings once (`--motion-fast: 150ms`, `--motion-base: 220ms`, `--ease-out: cubic-bezier(0.2, 0, 0, 1)`) and reuse them. Motion drifts out of consistency just like color does (see consistency.md).

## Accessibility (WCAG 2.2)

- **Reduced motion.** Honor `prefers-reduced-motion: reduce` (in React Native, `AccessibilityInfo.isReduceMotionEnabled()`, or `useReducedMotion` in Reanimated). Under reduced motion, remove movement such as slides, zooms, and parallax, and keep instant changes or short opacity fades. SC 2.3.3 Animation from Interactions is AAA, but motion can trigger vestibular symptoms, and the media query costs one block of CSS. Treat it as required.
- **Pause, stop, hide (SC 2.2.2, Level A).** Anything that moves, blinks, or scrolls on its own for more than 5 seconds, and runs alongside other content, needs a way to pause or hide it. Carousels and tickers are the usual offenders.
- **Three flashes (SC 2.3.1, Level A).** Nothing may flash more than three times in any one-second period.
- **Don't carry meaning in motion alone.** A shake on a wrong password is fine as reinforcement, but the error message must still be there in text.

## Skip motion for

- Content fading or sliding in on page load or on scroll ("scroll reveals") on screens people work in. It delays reading and adds nothing there. The exception is entry screens seen once per session or less (sign-in, onboarding, a confirmation): they may have one short entrance, so the product feels alive at the door. Keep it to opacity plus a rise of 8 px or less, at most three groups staggered 40 ms apart, finished within about 350 ms. It must never block input, and with reduced motion it becomes a plain fade.
- Looping decoration: pulsing badges, bouncing arrows, glowing borders, animated gradients.
- Parallax and scroll-jacking.
- Celebration on serious tasks: confetti on a payment, or fireworks on a submitted application.
- Long or chained sequences in task flows. Users wait for every millisecond of them.

## Marketing and showcase pages

The "skip" list above is for product UI, where people come to do a task. Landing pages, product showcases, and launch pages have a different job: to show what a product is and make people want it. There, expressive motion is part of the message, and scroll-driven sections, animated gradients, and simulated product demos (a typed chat, a terminal session, a UI that assembles itself) are fair tools. The bar is that motion explains or demonstrates something, not that it fills space. Guardrails:

- **Every animation shows something about the product:** how it works, what changes, what the result looks like. A gradient that drifts behind a headline is atmosphere; keep atmosphere to one place per page.
- **Gradients come from the brand, not the default palette:** two or three hues from the identity, slow (8 to 20 s per loop), low contrast against the text over them. Never the purple-to-blue default (`purple-gradient`), and text over a gradient still passes 4.5:1 at every frame.
- **Scroll animation reveals once and stays.** Prefer CSS scroll-driven animations (`animation-timeline: view()`) or an IntersectionObserver that adds a class once. Content must be readable and in place without JavaScript, and never hidden until it scrolls into view for search engines and screen readers. No scroll-jacking: the scroll wheel always scrolls.
- **Simulations are honest.** A simulated chat or terminal uses real commands and realistic output, and is labelled as a simulation. Users can pause or replay it, and it doesn't loop forever on its own (WCAG 2.2.2: anything that moves for more than 5 seconds needs a pause control).
- **Reduced motion gets a complete page:** loops stop, scroll effects show their end state, simulations show their final frame with a replay button.
- **Performance:** animate transform, opacity, and (for gradients) background-position or a CSS `@property` angle. No layout properties, no large blurred layers on mobile. Check on a CPU throttled 4×.

In audits and slop scans of marketing pages, suppress `scroll-reveal` and `decorative-motion` findings that meet these guardrails, giving the reason, and treat everything else as usual.

## Low-end devices

Most users aren't on the laptop the UI was built on. A budget Android phone runs JavaScript, style and layout four to six times slower, so motion that is smooth in development stutters there, and stutter reads as "broken", not "slow". The fix is almost never less motion. It is motion the phone's compositor can run on its own.

- **Compositor-only properties.** `transform`, `opacity` (and the individual `translate`, `scale`, `rotate`) and `filter` without blur animate on the GPU even while the main thread is busy. Everything else (size, position, margins, colors, shadows, `offset-distance`, CSS custom properties) needs the main thread for every frame. The detector flags the common cases (`layout-animation`, `paint-animation`); `motion-perf.js` lists every running animation that isn't compositor-only.
- **Equivalents.** Width → `scaleX` with `transform-origin`. Top/left → `translate`. Height for an accordion → `grid-template-rows: 0fr → 1fr`, or animate the content's opacity and translate. A glow → a pseudo-element with the shadow, fading in. A motion path (`offset-path`) → `translate` keyframes along the same curve, or accept it as main-thread work and keep it to a few elements.
- **Stop what nobody sees.** An endless animation keeps costing frames after it scrolls off screen. Pause loops outside the viewport (`IntersectionObserver` toggling `animation-play-state`, or `content-visibility: auto` on the section) and in background tabs.
- **Layers are memory.** `will-change` and `backdrop-filter` each create a GPU layer. A few are fine; dozens, or a blur over most of the screen, exhaust a cheap phone's GPU memory and everything stutters.
- **Scroll and touch.** Scroll-linked effects belong in `IntersectionObserver` or `animation-timeline`, not scroll handlers. Wheel and touch listeners are passive.
- **JavaScript animation.** Prefer CSS or the Web Animations API. When JS must drive motion (a cursor follower, physics), write styles directly from a `requestAnimationFrame` loop that stops when it arrives, never through framework state on every frame, and never read layout (`getBoundingClientRect`, `offsetWidth`) after writing styles in the same frame.
- **Degrade, don't remove.** If a showcase effect still can't hold its frame rate at 6× slowdown, give it a simpler version (fewer moving elements, no blur) rather than dropping it for everyone. `prefers-reduced-motion` is about comfort, not device speed, so don't use it as the low-end switch.

**Measure it.** With a dev server running:

```sh
node <scripts>/motion-perf.js --base http://localhost:5173 --routes /,/dashboard --cpu 4   # mid-range phone; --cpu 6 for low-end
```

It loads each route at phone size with the CPU slowed, lets loading finish, then traces 3 s of idle and a scroll through the page. Frames come from the browser's own frame reporting, so motion the GPU runs is judged by what reaches the screen. It reports `dropped-frames` (over 10% of frames late), `long-frame` (a frame over 100 ms, with the scripts the browser blames), `main-thread-animation`, `offscreen-animation`, and `heavy-layer`. Run it before and after a motion change, and quote both sets of numbers. The throttling is an emulation: the numbers are comparable between runs on one machine, not a promise about a specific phone. Say so, and test on a real low-end device when one is available.

## How to check

- Every interactive element visibly responds to a press within about 100 ms (Doherty threshold).
- Every state change that's easy to miss (an item added, a panel opened, an error appearing) has a brief transition or highlight.
- Durations in the code are under about 400 ms, use the motion tokens, and animate only transform and opacity.
- Turn on reduced motion (OS setting, or the DevTools rendering emulation) and confirm movement stops or becomes a fade.
- Run `motion-perf.js` at `--cpu 4` (and `--cpu 6` for products used on budget phones), or throttle the CPU in DevTools, and check that nothing stutters: no dropped-frames or long-frame issues, and every main-thread animation either fixed or justified ("Low-end devices" above).

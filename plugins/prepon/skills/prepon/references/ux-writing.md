# UX writing: interface copy that fits

Copy is interface. A label, an error, or a button word decides whether people finish the task, and generated copy is the fastest way a screen starts to read as unattended. The mechanical tells (`filler-copy`, `ai-vocabulary`, `assistant-leak`, `vague-error`, `vague-link`, `fragment-triplet`, `exclaim-copy`, `em-dash-copy`, `forced-contrast`) are in slop-patterns.md. This file is what to write instead. Each rule names its source; cite it only when it drove the wording.

## Contents

- [Voice and plain language](#voice-and-plain-language)
- [Labels, buttons, and links](#labels-buttons-and-links)
- [Errors](#errors)
- [Empty, loading, and success states](#empty-loading-and-success-states)
- [Confirmations and destructive actions](#confirmations-and-destructive-actions)
- [Checking copy](#checking-copy)
- [Sources](#sources)

---

## Voice and plain language

- **Write for the user on the screen, in "you".** Not about them ("Empowering citizens…") and not as a slogan. (Apple HIG, Writing)
- **Use the words users use, not the system's.** "Business permit," not "LGU-BP application record." Field names, statuses, and menu items follow the domain's own vocabulary. (Nielsen heuristic 2, Match between the system and the real world)
- **Short sentences, common words, active voice.** Aim for about 15 to 20 words a sentence at most for government and banking audiences, many of whom read in a second language or under stress. (Digital.gov plain language guide; GOV.UK A to Z style guide)
- **Front-load.** Put the information people scan for at the start of the heading, label, and sentence: "Renew by 31 March" rather than "Please be aware that renewal must take place by 31 March." (Digital.gov plain language guide)
- **Cut padding.** "In order to" → "to." "Please note that" → delete. "Simply" and "just" tell a struggling user the task is easy; delete them. (GOV.UK A to Z style guide)
- **Sentence case** for headings, buttons, labels, and menu items, unless the brand guide says otherwise. It's faster to read and the current convention in most design systems. (GOV.UK A to Z style guide, "Capitals")
- **One term per concept.** If it's "application" on one screen, it isn't "request" or "submission" on the next. Wording drift is a consistency finding (consistency.md). (Nielsen heuristic 4, Consistency and standards)

## Labels, buttons, and links

- **Buttons say what happens:** a verb and, when it helps, the object: "Pay ₱1,250," "Save vehicle," "Send for approval." Not "Submit," "OK," or "Continue" when something irreversible happens. (Apple HIG, Writing; GOV.UK Question pages)
- **Ask one thing per page in long forms,** with the question as the page heading. It's easier to answer, to validate, and to come back to. (GOV.UK Question pages; GOV.UK Service Manual, Structuring forms)
- **Labels are visible and stay put.** Format hints go in helper text under the label ("For example, 27 3 2026"), never only in the placeholder. Split dates into day, month, year fields rather than a picker for known dates like birthdays. (GOV.UK Date input; WCAG 3.3.2)
- **Only ask what you need, and never twice.** Prefill what the system already knows, and don't make people re-enter information they gave earlier in the same process. (WCAG 3.3.7 Redundant entry; GOV.UK Structuring forms)
- **Link text names the destination,** readable out of context: "Read the fee schedule," not "Learn more" or "Click here." (WCAG 2.4.4 Link purpose; NN/g, "Learn more" links)
- **Let people review before they commit:** a check-your-answers page with a "Change" link per answer before any submission that is hard to undo. (GOV.UK Check answers)

## Errors

- **Say what went wrong and how to fix it, next to the field,** in words, not only in red. (WCAG 3.3.1 Error identification and 3.3.3 Error suggestion; NN/g Error-message guidelines)
- **Be specific to the field and the cause:** "Enter a date of birth in the past," "Enter your mobile number using 11 digits," not "Invalid input." Use the same wording in the error summary at the top and at the field. (GOV.UK Error message)
- **No blame, no jokes, no "Oops."** The user is stuck; playful or apologetic filler costs them time and trust. Plain and polite is enough. (GOV.UK Error message; NN/g Error-message guidelines)
- **Validate at the right moment.** Inline validation helps once a field is finished, but don't mark a field wrong while the user is still typing in it, and do confirm good input for fields that are easy to get wrong. (Baymard, Inline form validation)
- **System errors say what was kept and what to do next:** "Payment not sent. Your answers are saved. Try again in a few minutes, or call 8888 if it keeps happening." Include a reference code when support will need one. (Nielsen heuristic 9, Help users recognize, diagnose, and recover from errors)

## Empty, loading, and success states

- **Empty states explain and offer the next action:** why it's empty ("No vehicles need inspection this week"), and the action that fills it, if there is one. An illustration doesn't replace that sentence. (NN/g, Designing empty states in complex applications)
- **Loading says what is happening when it takes more than about a second,** and shows progress when it takes more than about ten. Under 0.1 s, show nothing. (NN/g, Response time limits; Nielsen heuristic 1, Visibility of system status)
- **Success says what happened and what comes next,** with what the user needs to keep: "Application sent. Reference PRM-2026-04417. We'll email you within 2 working days." No exclamation marks or confetti on money or legal actions. (GOV.UK Question pages; Nielsen heuristic 1)

## Confirmations and destructive actions

- **Prefer undo to "Are you sure?"** for actions that can be reversed. Confirm only what can't be undone or is costly, so the dialog keeps its meaning. (NN/g, Confirmation dialogs; Nielsen heuristic 3, User control and freedom)
- **A confirmation names the thing and the consequence,** and its buttons repeat the action: "Delete 3 drafts? You can't undo this." with "Delete drafts" and "Cancel," never "Yes / No." (NN/g, Confirmation dialogs)

## Checking copy

In build and audit, read every string on the screen once, in order, and check:

1. Could a first-time user act on each label, button, and message without other context?
2. Does every error say what's wrong and how to fix it?
3. Does any sentence survive with its first clause, adverb, or adjective deleted? Then delete it.
4. Is the same thing called the same name everywhere?
5. Would this read as written by this institution, for this user, rather than as a template?
6. The detector is clean for the copy rules, or each remaining finding is justified.

In an audit, copy findings belong under Usability (or Accessibility for link text and errors), cite the rule's source above, and quote the exact string with its replacement.

## Sources

- Nielsen Norman Group, 10 usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g, Error-message guidelines: https://www.nngroup.com/articles/error-message-guidelines/
- NN/g, "Learn more" links: https://www.nngroup.com/articles/learn-more-links/
- NN/g, Response time limits: https://www.nngroup.com/articles/response-times-3-important-limits/
- NN/g, Designing empty states in complex applications: https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g, Confirmation dialogs: https://www.nngroup.com/articles/confirmation-dialog/
- WCAG 2.2 Understanding: 2.4.4 https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html, 3.3.1 https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html, 3.3.3 https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html, 3.3.7 https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html
- GOV.UK Design System: Error message https://design-system.service.gov.uk/components/error-message/, Question pages https://design-system.service.gov.uk/patterns/question-pages/, Check answers https://design-system.service.gov.uk/patterns/check-answers/, Date input https://design-system.service.gov.uk/components/date-input/
- GOV.UK Service Manual, Structuring forms: https://www.gov.uk/service-manual/design/form-structure
- GOV.UK A to Z style guide: https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/
- Digital.gov plain language guide (successor to plainlanguage.gov): https://digital.gov/guides/plain-language
- Apple Human Interface Guidelines, Writing: https://developer.apple.com/design/human-interface-guidelines/writing
- Baymard Institute, Inline form validation: https://baymard.com/blog/inline-form-validation

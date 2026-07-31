# Backlog

Deferred features for the tuition content tracker, recorded 2026-07-31. Not started — this file exists so scope is written down before it's implemented, not to prescribe exact code.

## 1. Password login (simple authentication) — DONE 2026-07-31

Built: `apps-script.gs` (standalone Web App, auth-only endpoint) + a
"🔒 Atikah login" control in the top bar (`index.html`), gated by a
SHA-256 password hash checked server-side, token kept in `localStorage`.
Viewing remains fully public/no-login, per the design below — the login
button doesn't unlock anything yet since #2 (the actual write feature) isn't
built. See README.md § "Atikah login setup" for the one-time manual Apps
Script deployment step (unavoidable — needs your Google account to click
through OAuth/deploy, can't be automated). Verified: unit tests in
`tests/test_apps_script.js` pass, page renders with no console errors
(headless Chrome dump), auth button starts in locked state.

Currently the page is fully public/read-only with no auth of any kind. Needed as a prerequisite for #2, since that introduces a write path — right now nobody can change data through the page at all, so there's nothing to gate.

- Simple shared-password gate is enough (matches the pattern already used in [[coupleapp-project]] / pika-coon: client-side hash, server-side compare, token in localStorage) — no need for full user accounts for a single-tutor tool.
- Only Atikah needs to authenticate to get write access; viewing stays public/no-login, same as today.
- Whatever backend ends up handling #2 (see below) should also own the password check — the static page has no server of its own to check a password against.

## 2. One-tap progress increment with timestamp logging

Button **at the sub-concept level** (inside the expanded chapter view — see #4) that Atikah taps to bump that sub-concept's progress up by one step (0 → 1 → 2 → 3), each tap recording the date it happened.

- Example: a "Not Started" (0/3) row → tap → becomes "Started" (1/3) → tap again → "Halfway" (2/3) → tap again → "Completed" (3/3). Each tap's date gets logged against that increment (not just a single "last updated" date).
- **This requires a write path back to the Google Sheet**, which the current architecture deliberately doesn't have (view-only gviz fetch, no backend at all — see the original build-plan doc's §4). Likely needs the same shape as pika-coon: a Google Apps Script Web App deployed against each student's sheet, called from the page, gated by the password from #1.
- Needs a place to store per-increment timestamps, not just the current `Progress (0-3)` value — either a new column (e.g. a JSON blob of dates keyed by increment) or a separate log tab per student sheet. Worth designing this data model explicitly before building, since it changes the sheet schema. With #5 (multi-level workbooks) in scope, this log needs to be scoped per level-tab, not just per workbook.
- Button touch target should be ≥44px (mobile tap-target minimum) — noted in the UI/UX audit below.
- Should probably be disabled/hidden at 3/3 (nothing to increment to) and require the password/session from #1 before it's clickable.

## 3. Show latest update date + hover history on the completion bar

- Surface the most recent date a chapter/sub-concept's progress changed, visible without interacting.
- Hovering (or tapping, on touch devices — hover doesn't exist there) the progress bar shows the full history of dates each increment was logged.
- Tooltip must be an *enhancement*, not the only way to reach the info — the latest date should already be visible as plain text, per the interaction pattern in the UI/UX audit below.
- Depends on #2's data model (can't show increment history that isn't being recorded yet).

## 4. Chapter accordion + sticky quick-nav dropdown

Restructures the page layout: the current two separate sections ("Chapters" summary cards, then a completely separate flat "All Sub-Concepts" list of all 30 rows) merge into one. A chapter row shows its summary (the existing % Complete bars) collapsed by default; **clicking the chapter header expands it in place** to reveal that chapter's own sub-concept rows — which is where the increment button from #2 lives.

- Removes the redundant flat sub-concept list entirely — sub-concepts are only ever seen nested under their chapter now.
- **Quick navigation dropdown**, listing every chapter, to jump straight to (and expand) a given chapter without scrolling through the others — useful once a chapter list is collapsed by default and scanning top-to-bottom is no longer the primary way to find one.
- This nav dropdown is **sticky** — stays on screen while scrolling, same treatment as the existing `.topbar` (which is already `position:sticky`). Likely lives inside or directly below the topbar rather than as a third sticky layer.
- Open questions to settle at build time (not blocking this backlog entry, just flagging):
  - Accordion behavior — can multiple chapters be open at once, or is it exclusive (opening one closes the previous)?
  - Does selecting a chapter from the quick-nav dropdown scroll-and-expand, or just scroll?
- Depends on/interacts with #5 below — once a student can have multiple levels, the quick-nav and the chapter list both need a level dimension, not just a flat chapter list.

## 5. Multi-level workbook support (1–4 levels per student)

Some students Atikah tutors span **two levels of the syllabus** (e.g. P5 and P6 math), tracked in **one Google Sheets workbook** with **between 1 and 4 tabs**, each tab being one level's own Content Tracker (so a single-level student still has exactly 1 tab — nothing changes for them). This replaces the current one-tab-per-student assumption baked into `STUDENTS`/`TAB_NAME` in `index.html`.

- **Config shape changes** from today's `{ name, sheetId }` (implicitly one fixed `"Content Tracker"` tab) to something like `{ name, sheetId, levels: [{ label, tabName }, ...] }` — one workbook, 1–4 named level-tabs. A "student" is still one entry; a level is no longer assumed to be 1:1 with a student.
- **Three tiers of aggregation**, up from today's two:
  1. **Grand overall** — rolled up across every level in the workbook.
  2. **Overall per level** — one summary per level-tab (e.g. a P5 overall and a separate P6 overall).
  3. **Per-chapter within each level** — same computation as today, just nested under its level now.
- For the common case of a student with only 1 level-tab, the grand overall and the level overall are identical — the UI should collapse back to today's single-overall-card behavior rather than showing a pointless duplicate, so single-level students see no change in layout.
- **Fetching**: one gviz CSV fetch per level-tab, done in parallel — a 4-level workbook does 4 fetches instead of 1 on load. Still small/fast given sheet size, but worth noting as a real change from today's single-fetch model.
- Interacts directly with #4: the chapter accordion and quick-nav dropdown both need a level dimension once a student can have more than one — e.g. chapters grouped/labeled by level in the dropdown, or a level switcher above the chapter list (parallel to today's student switcher).
- Tab-naming convention needs to be consistent across a workbook (e.g. exact tab names like `"P5 Content Tracker"` / `"P6 Content Tracker"`) so the `tabName` values in config match exactly — same fragility as the existing single-tab `TAB_NAME` constant, just multiplied by up to 4 per student.

## Related
- Full UI/UX audit of the current (pre-these-features) page: see the audit report delivered 2026-07-31 (chat/artifact) for issues to fix independent of this backlog — most notably the progress-bar fill/track contrast and the refresh-flash bug, both worth fixing before adding the increment button on top of the same bar component.
- The audit's findings on `.chapters-grid` and the flat sub-concept list (§2/§3 of that report) apply to the *current* layout — revisit them against the new accordion structure from #4 once that's built, since the underlying markup changes.

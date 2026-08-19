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

## 4. Chapter accordion + sticky quick-nav dropdown — DONE 2026-08-19

Built: chapters merged into one accordion (`renderChapterCard`/`renderPage` in `index.html`), multiple chapters can be open independently, open state persists across the 60s auto-refresh (`openChapters` Set, cleared only on student switch), and a "Jump to chapter…" `<select>` in the top bar scrolls-to-and-expands. Lives inside `.topbar-controls` rather than as a third sticky bar, per the open question below. Verified: 117 `tests/test_logic.js` assertions pass; live-browser check (local server + Chrome) confirmed expand/collapse, quick-nav scroll+expand, and state surviving a simulated refresh and a real student switch.

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

## 6. Drill-down to matching worksheets — DONE 2026-08-19

Built: click a chapter to reveal its sub-concepts (per #4's accordion); a sub-concept (or, for the two unmatched decimals worksheets, the chapter itself) with matching worksheets shows each one as a small link (`renderWorksheetLinks` in `index.html`) that opens the PDF in the browser's own viewer in a new tab — changed from the originally-planned forced `download` attribute per a mid-build decision (browser preview is better for a quick glance mid-lesson; the browser's own viewer still lets the file be saved if needed). A sub-concept/chapter with no match shows nothing extra. 29 worksheet-only PDFs (answer keys excluded) synced into `tracker/worksheets/` via the new `sync_worksheets.sh`. Verified: 9 new `tests/test_logic.js` assertions for the lookup functions pass; live-browser check confirmed links render only where mapped, a link opens the correct PDF in Chrome's native viewer, and multi-set worksheets show every Set.

Click a chapter to reveal its sub-concepts (per #4's accordion); clicking a sub-concept that has matching worksheets shows the list of them. A sub-concept with no matching worksheet shows nothing extra (no dead-end UI).

**Confirmed there's real overlap to build against** — cross-checked all three of Dani's trackers (P5/P4/P3) against the worksheet generator's databank ([[atikah-worksheet-generator-project]], `~/Documents/claude-workspace/projects/atikah-tuition/worksheets/`) and found matches in every level, several sub-concepts with more than one applicable worksheet/Set:

- P5 Ch3 "Expressing fractions as decimals" → WS3, WS4 (+SetB, SetC)
- P5 Ch7 "Multiplying/dividing decimals by 10, 100, 1000" → WS7 (+SetB)
- P5 Ch8 "Finding simple rate" / "Finding metre rate" → Rate WS1, Rate WS2
- P4 Ch2 "Multiples and common multiples" → NumOps WS1, WS2, WS3
- P4 Ch9 "Place values (tenths/hundredths/thousandths)" → WS2 (+SetB)
- P4 Ch9 "Comparing and ordering decimals" → WS8, WS9
- P4 Ch9 "Expressing fraction as decimal" → WS3, WS4 (+SetB, SetC)
- P4 Ch10 "Adding decimals" → WS1
- P4 Ch10 "Multiplying decimals by 1-digit" → WS10
- P4 Ch10 "Dividing decimals by 1-digit" → WS11
- P3 Ch4 "Multiplying/dividing within multiplication table" → NumOps WS4 (mental division)
- P3 Ch5 "Dividing 3-digit by 1-digit" (no remainder / remainder) → NumOps WS5, WS6 (+SetB each)

Two types (WS5/WS6 "Reading Number Line in Decimal") don't match any specific sub-concept text anywhere — general decimals practice, no home at the sub-concept level. Decide at build time whether these hang off the chapter level instead or get left out of this feature.

**Two things need solving before this is just UI work:**
- **Mapping table.** There's no shared taxonomy between the tracker's free-text chapter/sub-concept labels (author's own wording, sheet by sheet) and the worksheet generator's type IDs (`ws7_multiplying_by_powers_of_10_i`, etc). Needs an explicit config mapping `{sheetId, chapter, sub-concept} → [worksheet type IDs]`, maintained by hand like the `STUDENTS` array — matching by string-similarity/keyword would be fragile given how differently the two sources phrase the same topic.
- **Hosting.** The worksheet PDFs currently live only in the worksheets project's local git repo — no public remote, no deploy (per [[git-hosting-pattern]], never needed one before). The tracker is served from public GitHub Pages. Downloadable-from-the-tracker means the PDFs (or at least the ones actually mapped) need to be reachable from that public site — e.g. copied/synced into the tracker repo's own static assets, or hosted somewhere else public and linked. Worth deciding whether *all* worksheet output ships publicly or just the mapped subset, given the databank also contains internal-use content (answer keys) that arguably shouldn't be public.
- New worksheet types/Sets get added on an ongoing basis (Cowork sessions, per [[atikah-worksheet-generator-project]]) — the mapping table will go stale unless updating it becomes part of that workflow, or the tracker build regenerates it from some structured source instead of hand-maintained JSON.

Depends on #4 (accordion — this is where the sub-concept-level drill-down lives) and interacts with #1 (login) only if answer keys end up gated to Atikah-only; the worksheets themselves (not answer keys) are presumably fine as public downloads, same visibility as everything else on the page today.

## 2026-08-20: audit fixes (P1–P3) — DONE
A live UI/UX audit of #4/#6 (published as an Artifact report) found 0 blocking defects but 2 High-severity ones: the chapter accordion header was a bare `<div>` with no `tabindex`/`role`/keyboard handler (unreachable and unusable via keyboard or screen reader), and `fetchSheetAsCsv` had no timeout, so a hung Google Sheets request left the page on an infinite loading skeleton with zero feedback (reproduced live, not simulated). Also flagged: the chapter-toggle icon itself — a raw Unicode glyph, 10×13px rendered — too small/low-weight to notice, with no hover feedback on the header at all.

Fixed this session (P1–P3 only; the P0 fetch-timeout/retry fix from the same audit was explicitly deferred, not forgotten):
- **P1**: `.chapter-header` now has `role="button"`, `tabindex="0"`, `aria-controls` pointing at a stable per-chapter id (`slugify()`), and a delegated `keydown` handler treating Enter/Space like a click. Verified via direct DOM focus + dispatched `KeyboardEvent` — `.focus()` reaches the header, Enter toggles `aria-expanded` and un-hides the body.
- **P1**: toggle icon replaced with a sized (18px) inline SVG chevron that rotates on open, plus a `:hover`/`:focus-visible` background+outline on the whole header — both the original size complaint and the missing-affordance problem in one fix.
- **P2**: `<main>` landmark added around the content area; chapter titles changed from `<span>` to `<h3>` for screen-reader heading navigation.
- **P3**: worksheet-link pills got more touch-friendly padding, the login modal now closes on `Escape`, and `#content` got `aria-live="polite"` so loading/error/success state changes get announced.

122/122 tests pass (5 new `slugify()` assertions). Committed locally, push pending. Full findings + board discussion: audit Artifact linked in this session's chat history.

## Related
- Full UI/UX audit of the current (pre-these-features) page: see the audit report delivered 2026-07-31 (chat/artifact) for issues to fix independent of this backlog — most notably the progress-bar fill/track contrast and the refresh-flash bug, both worth fixing before adding the increment button on top of the same bar component.
- The audit's findings on `.chapters-grid` and the flat sub-concept list (§2/§3 of that report) apply to the *current* layout — revisit them against the new accordion structure from #4 once that's built, since the underlying markup changes.

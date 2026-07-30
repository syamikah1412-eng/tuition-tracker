# Backlog

Deferred features for the tuition content tracker, recorded 2026-07-31. Not started — this file exists so scope is written down before it's implemented, not to prescribe exact code.

## 1. Password login (simple authentication)

Currently the page is fully public/read-only with no auth of any kind. Needed as a prerequisite for #2, since that introduces a write path — right now nobody can change data through the page at all, so there's nothing to gate.

- Simple shared-password gate is enough (matches the pattern already used in [[coupleapp-project]] / pika-coon: client-side hash, server-side compare, token in localStorage) — no need for full user accounts for a single-tutor tool.
- Only Atikah needs to authenticate to get write access; viewing stays public/no-login, same as today.
- Whatever backend ends up handling #2 (see below) should also own the password check — the static page has no server of its own to check a password against.

## 2. One-tap progress increment with timestamp logging

Button next to each sub-concept row that Atikah taps to bump progress up by one step (0 → 1 → 2 → 3), each tap recording the date it happened.

- Example: a "Not Started" (0/3) row → tap → becomes "Started" (1/3) → tap again → "Halfway" (2/3) → tap again → "Completed" (3/3). Each tap's date gets logged against that increment (not just a single "last updated" date).
- **This requires a write path back to the Google Sheet**, which the current architecture deliberately doesn't have (view-only gviz fetch, no backend at all — see the original build-plan doc's §4). Likely needs the same shape as pika-coon: a Google Apps Script Web App deployed against each student's sheet, called from the page, gated by the password from #1.
- Needs a place to store per-increment timestamps, not just the current `Progress (0-3)` value — either a new column (e.g. a JSON blob of dates keyed by increment) or a separate log tab per student sheet. Worth designing this data model explicitly before building, since it changes the sheet schema.
- Button touch target should be ≥44px (mobile tap-target minimum) — noted in the UI/UX audit below.
- Should probably be disabled/hidden at 3/3 (nothing to increment to) and require the password/session from #1 before it's clickable.

## 3. Show latest update date + hover history on the completion bar

- Surface the most recent date a chapter/sub-concept's progress changed, visible without interacting.
- Hovering (or tapping, on touch devices — hover doesn't exist there) the progress bar shows the full history of dates each increment was logged.
- Tooltip must be an *enhancement*, not the only way to reach the info — the latest date should already be visible as plain text, per the interaction pattern in the UI/UX audit below.
- Depends on #2's data model (can't show increment history that isn't being recorded yet).

## Related
- Full UI/UX audit of the current (pre-these-features) page: see the audit report delivered 2026-07-31 (chat/artifact) for issues to fix independent of this backlog — most notably the progress-bar fill/track contrast and the refresh-flash bug, both worth fixing before adding the increment button on top of the same bar component.

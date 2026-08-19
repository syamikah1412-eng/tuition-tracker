# Tuition Content Tracker

Read-only, mobile-friendly webpage that mirrors Atikah's tuition content-coverage
tracker(s). Viewing is fully public and requires no login. Atikah can optionally
log in (see "Atikah login setup" below) — logging in doesn't do anything by
itself yet, it's the foundation for write features (progress increment button,
etc.) being added on top of this.

## Architecture

```
Google Sheet (one per student, source of truth, edited by Atikah)
        │  gviz CSV endpoint, public "view" link, no API key
        ▼
index.html  (static, no build step)  ──password──▶  apps-script.gs (Web App)
        │                                              (auth check only, for now)
        ▼
GitHub Pages
```

## Adding a new student

1. In Google Sheets, duplicate the sample sheet (or `File → Make a copy`).
2. Edit the `Content Tracker` tab's rows for that student — keep the header row
   layout (`Chapter | Sub-Concept | Progress (0-3) | Unit 1 | Unit 2 | Unit 3 |
   Status | Date Taught | Notes | Tested for Assessment?`); the `Unit 1-3` and
   `Status` columns can stay blank, the page derives them from `Progress (0-3)`.
3. **File → Share → General access → "Anyone with the link" → Viewer.** This is
   required — the page fetches data with no login, so without this setting the
   page will show a fetch error for that student.
4. Copy the Sheet ID from the sheet's URL
   (`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`).
5. Add an entry to the `STUDENTS` array near the top of `index.html`:
   ```js
   const STUDENTS = [
     { name: "Sample Tutee", sheetId: "1KPBu...GhmU73iLtE" },
     { name: "New Student Name", sheetId: "PASTE_NEW_SHEET_ID_HERE" },
   ];
   ```
6. Deploy (see below). No other code changes needed — chapters/sub-concepts are
   read entirely from each sheet's own rows.

## Chapters, quick-nav, and worksheets

Chapters collapse to a summary card by default — click a chapter header to expand it and see its sub-concept rows. Multiple chapters can be open at once (not exclusive), and the open/closed state survives the 60s auto-refresh (only cleared when switching student). The "Jump to chapter…" dropdown in the top bar scrolls to and expands a chapter directly.

Where a sub-concept (or, for a couple of decimals sub-concepts with no exact match, a whole chapter) has matching practice worksheets from the [worksheet generator project](../worksheets/), they show as small links under that row — clicking one opens the PDF in the browser's own viewer (not a forced download). This is driven by three config objects near the top of `index.html`:

- `WORKSHEET_FILES` — registry of every shipped worksheet type and its Set(s) (paths under `worksheets/`).
- `WORKSHEET_MAP` — exact `(Chapter, Sub-Concept)` text → worksheet type id(s). Matching is topic-based, not sheet-scoped: the same worksheet applies wherever that exact text appears, across any student/level sheet.
- `CHAPTER_WORKSHEET_MAP` — chapter-level fallback for worksheets with no exact sub-concept match.

**To add a new worksheet/Set here:** generate it in the worksheet generator project as usual, then run `./sync_worksheets.sh` from this directory to copy the new PDF(s) in (answer keys are deliberately excluded), and add/update an entry in `WORKSHEET_FILES` (and `WORKSHEET_MAP`/`CHAPTER_WORKSHEET_MAP` if it should link from a chapter/sub-concept). The mapping is hand-maintained — there's no shared taxonomy between the tracker sheets' free-text labels and the worksheet generator's type ids, so this needs a human decision each time, not an automated match.

## Local preview

```bash
cd tracker
python3 -m http.server 8000
# open http://localhost:8000
```

## Running tests

```bash
node tests/test_logic.js
node tests/test_apps_script.js
```

`test_logic.js` covers the pure parsing/derivation/summary functions and
cross-checks the sample dataset against the real sample sheet's own
Summary-tab numbers. `test_apps_script.js` covers the auth hash/token logic
mirrored from `apps-script.gs` (the actual Google-service calls in that file
can only be exercised by deploying it — see below).

## Atikah login setup (one-time, manual — needs your Google account)

The page itself has no server, so the password check lives in a small
Apps Script Web App. This can't be automated end-to-end because deploying it
requires clicking through Google's own OAuth/deploy screens under your
account:

1. Go to [script.google.com](https://script.google.com) → **New project**.
   (Standalone project — not "attached" to any one sheet, since this same
   script will later need to write to whichever student's sheet a request
   names.)
2. Delete the default `Code.gs` contents and paste in the contents of this
   repo's `apps-script.gs`.
3. Pick a password, then compute its hash: in the Apps Script editor, select
   the `rehash` function from the function dropdown and click **Run** (first
   run will prompt you to authorize the script — that's expected, it's your
   own script). Open **View → Logs** (or **Executions**) and copy the 64-character
   hex string that was logged — edit the password in the `rehash()` function
   first if you don't want to use the placeholder `'your-new-password'`.
4. **Project Settings** (gear icon, left sidebar) → **Script Properties** →
   **Add script property** → key `PASSWORD_HASH`, value = the hash from step 3.
5. **Deploy → New deployment → Web app.** Set "Execute as" to **Me** and
   "Who has access" to **Anyone**. Click Deploy, authorize again if prompted,
   then copy the Web app URL it gives you (ends in `/exec`).
6. In `index.html`, find `AUTH_CFG` near the top of the `<script>` block and
   paste that URL as `scriptUrl`.
7. Push/redeploy the site. Click "🔒 Atikah login" in the top bar and enter
   the password from step 3 to confirm it works — it should switch to
   "🔓 Atikah (logged in)".

If you ever need to change the password, repeat steps 3–4 with a new hash —
no redeploy of the Web app needed, script properties update live.

## Deploying (GitHub Pages)

1. Push this folder to a public GitHub repo (e.g. `tuition-tracker`).
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Share the resulting `https://<user>.github.io/<repo>/` URL.

Nothing sensitive is exposed in the public source beyond each student's
view-only Sheet ID and the Apps Script Web App URL (the URL alone grants
nothing — it always checks the password hash before treating a request as
Atikah).

## Notes

- Auto-refreshes every 60s, plus on tab focus (`visibilitychange`).
- Last-viewed student is remembered per-browser via `localStorage`.
- If a student's card shows a load error, the most common cause is the sharing
  setting in step 3 above not being set to "Anyone with the link — Viewer" yet.

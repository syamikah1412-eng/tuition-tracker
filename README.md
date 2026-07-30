# Tuition Content Tracker

Read-only, mobile-friendly webpage that mirrors Atikah's tuition content-coverage
tracker(s). Each student's data lives in their own Google Sheet — the page never
writes back, so editing always happens in Google Sheets itself (app or browser).

## Architecture

```
Google Sheet (one per student, source of truth, edited by Atikah)
        │  gviz JSON endpoint, public "view" link, no API key
        ▼
index.html  (static, no backend, no build step)
        │
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

## Local preview

```bash
cd tracker
python3 -m http.server 8000
# open http://localhost:8000
```

## Running tests

```bash
node tests/test_logic.js
```

Tests cover the pure parsing/derivation/summary functions and cross-check the
sample dataset against the real sample sheet's own Summary-tab numbers.

## Deploying (GitHub Pages)

1. Push this folder to a public GitHub repo (e.g. `tuition-tracker`).
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Share the resulting `https://<user>.github.io/<repo>/` URL.

Nothing sensitive is exposed in the public source beyond each student's
view-only Sheet ID — there is no write path, password, or API key in this app.

## Notes

- Auto-refreshes every 60s, plus on tab focus (`visibilitychange`).
- Last-viewed student is remembered per-browser via `localStorage`.
- If a student's card shows a load error, the most common cause is the sharing
  setting in step 3 above not being set to "Anyone with the link — Viewer" yet.

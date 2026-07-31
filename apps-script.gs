// Tuition Content Tracker — Backend (Apps Script Web App)
// Paste this entire file into a *standalone* Apps Script project (not bound to
// one spreadsheet — this script is called with a sheetId per request so it can
// eventually write to whichever student's sheet a request names).
// Deploy as Web App: Execute as Me · Who has access: Anyone

// PASSWORD_HASH is never committed to git — set it once via the Apps Script
// editor: Project Settings (gear icon) → Script Properties → Add script
// property → key "PASSWORD_HASH", value = hashPassword('your-password')
// (run the rehash() helper below in the Apps Script editor to compute it).
var PASSWORD_HASH = PropertiesService.getScriptProperties().getProperty('PASSWORD_HASH');

// ── Entry points ─────────────────────────────────────────────────────────────

function doGet(e) {
  var params = e ? e.parameter : {};
  if (params.action === 'auth') return authResponse(params.token);
  return error('Unknown action: ' + params.action);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function authResponse(token) {
  return respond({ ok: validToken(token) });
}

function validToken(token) {
  return !!PASSWORD_HASH && token === PASSWORD_HASH;
}

function hashPassword(pw) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
                pw, Utilities.Charset.UTF_8);
  return bytes.map(function(b){
    return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2);
  }).join('');
}

// Run this once in the Apps Script editor (Run ▸ rehash) to get the hash for
// a new password, then paste the result into the PASSWORD_HASH script
// property described above. Check the execution log for the output.
function rehash() {
  Logger.log(hashPassword('your-new-password'));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(msg) {
  return respond({ error: msg });
}

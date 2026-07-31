// Unit tests for the auth logic in ../apps-script.gs (pure JS — no Google services)
// Run: node tests/test_apps_script.js

const crypto = require("crypto");

var pass = 0, fail = 0;

function assert(label, condition) {
  if (condition) { console.log('  PASS', label); pass++; }
  else           { console.error('  FAIL', label); fail++; }
}

// ── Pure logic copied from apps-script.gs (Google services excluded — those
// are exercised manually against a live deployment) ─────────────────────────

function validToken(token, passwordHash) {
  return !!passwordHash && token === passwordHash;
}

// hashPassword() in apps-script.gs uses Utilities.computeDigest(SHA_256, ...),
// which is equivalent to a plain SHA-256 hex digest — reproduced here with
// Node's crypto module so this hash can be checked without Apps Script itself.
function hashPassword(pw) {
  return crypto.createHash("sha256").update(pw, "utf8").digest("hex");
}

console.log('\nApps Script Auth Tests\n');

var KNOWN_HASH = hashPassword("correct-horse-battery-staple");

console.log('hashPassword:');
assert('produces a 64-char hex digest', /^[0-9a-f]{64}$/.test(KNOWN_HASH));
assert('is deterministic for the same input', hashPassword("correct-horse-battery-staple") === KNOWN_HASH);
assert('differs for a different password', hashPassword("wrong-password") !== KNOWN_HASH);

console.log('\nvalidToken:');
assert('matching token accepted', validToken(KNOWN_HASH, KNOWN_HASH) === true);
assert('wrong token rejected', validToken('bad-token', KNOWN_HASH) === false);
assert('empty token rejected', validToken('', KNOWN_HASH) === false);
assert('undefined token rejected', validToken(undefined, KNOWN_HASH) === false);
assert('missing PASSWORD_HASH rejects everything', validToken(KNOWN_HASH, undefined) === false);
assert('missing PASSWORD_HASH rejects empty token too', validToken('', undefined) === false);

console.log('\n─────────────────────────────');
console.log('Total:', pass + fail, '  Pass:', pass, '  Fail:', fail);
if (fail > 0) { console.error('TESTS FAILED'); process.exit(1); }
else          { console.log('All tests passed.'); }

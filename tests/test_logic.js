// Unit tests for the pure logic functions in ../index.html
// Run: node tests/test_logic.js
// Keep these functions in sync with the copies inlined in index.html.

var pass = 0, fail = 0;

function assert(label, condition) {
  if (condition) { console.log('  PASS', label); pass++; }
  else           { console.error('  FAIL', label); fail++; }
}

// ── Pure functions copied from index.html ───────────────────────────────────

function parseGvizResponse(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Unexpected gviz response format');
  const json = JSON.parse(match[1]);
  if (json.status === 'error') {
    const msg = (json.errors && json.errors[0] && json.errors[0].detailed_message) || 'gviz query error';
    throw new Error(msg);
  }
  return json.table.rows.map(function (r) {
    return r.c.map(function (cell) { return cell ? cell.v : null; });
  });
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === 'Chapter') return i;
  }
  throw new Error('Could not find header row (expected first column "Chapter")');
}

function mapRowsByHeader(rows, headerRowIndex) {
  const headers = rows[headerRowIndex].map(function (h) {
    return h == null ? '' : String(h).trim();
  });
  const dataRows = rows.slice(headerRowIndex + 1);
  return dataRows
    .filter(function (row) { return row && row[0]; })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) {
        if (h) obj[h] = row[i] == null ? '' : row[i];
      });
      return obj;
    });
}

function clampProgress(value) {
  const p = Number(value);
  return Number.isFinite(p) ? Math.max(0, Math.min(3, Math.round(p))) : 0;
}

const STATUS_BY_PROGRESS = {
  0: { label: 'Not Started', color: 'var(--status-red)' },
  1: { label: 'Started', color: 'var(--status-inprogress)' },
  2: { label: 'Halfway', color: 'var(--status-inprogress)' },
  3: { label: 'Completed', color: 'var(--status-green)' },
};

function deriveRowState(progress) {
  const clamped = clampProgress(progress);
  const status = STATUS_BY_PROGRESS[clamped];
  return {
    unit1Filled: clamped >= 1,
    unit2Filled: clamped >= 2,
    unit3Filled: clamped >= 3,
    statusLabel: status.label,
    statusColor: status.color,
  };
}

function isTested(row) {
  return String(row['Tested for Assessment?'] || '').trim().toLowerCase() === 'yes';
}

function summarize(rows) {
  const subConceptCount = rows.length;
  const totalUnits = subConceptCount * 3;
  const unitsAchieved = rows.reduce(function (sum, r) { return sum + clampProgress(r['Progress (0-3)']); }, 0);
  const pctAll = totalUnits === 0 ? 0 : unitsAchieved / totalUnits;

  const testedRows = rows.filter(isTested);
  const testedUnits = testedRows.length * 3;
  const testedAchieved = testedRows.reduce(function (sum, r) { return sum + clampProgress(r['Progress (0-3)']); }, 0);
  const pctAssessment = testedUnits === 0 ? null : testedAchieved / testedUnits;

  return { subConceptCount, totalUnits, unitsAchieved, pctAll, testedUnits, testedAchieved, pctAssessment };
}

function computeChapterSummary(rows) {
  const chapters = [];
  const byChapter = new Map();
  rows.forEach(function (row) {
    const chapter = row['Chapter'];
    if (!chapter) return;
    if (!byChapter.has(chapter)) {
      byChapter.set(chapter, []);
      chapters.push(chapter);
    }
    byChapter.get(chapter).push(row);
  });

  return chapters.map(function (chapter) {
    const chapterRows = byChapter.get(chapter);
    return Object.assign({ chapter: chapter }, summarize(chapterRows));
  });
}

function computeOverallSummary(rows) {
  return summarize(rows);
}

function pct1(pct) {
  return pct === null ? 'N/A' : (pct * 100).toFixed(1) + '%';
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Raw gviz JSONP response (captured shape) wrapping banner rows + header row + 2 data rows.
const GVIZ_SAMPLE_TEXT =
  '/*O_o*/\ngoogle.visualization.Query.setResponse(' + JSON.stringify({
    status: 'ok',
    table: {
      cols: [],
      rows: [
        { c: [{ v: '[merged] P5 Standard Mathematics — Content Coverage Tracker' }] },
        { c: [{ v: 'Tutee Name:' }, null, null, { v: 'Last Updated:' }] },
        { c: [{ v: 'How to use:' }, { v: 'Progress: type 0-3...' }] },
        { c: [null] },
        { c: [{ v: 'Chapter' }, { v: 'Sub-Concept' }, { v: 'Progress (0-3)' }, { v: 'Unit 1' }, { v: 'Unit 2' }, { v: 'Unit 3' }, { v: 'Status' }, { v: 'Date Taught' }, { v: 'Notes' }, { v: 'Tested for Assessment?' }] },
        { c: [{ v: 'Chapter 1: Numbers to 10 million' }, { v: 'Reading and writing numbers in numerals and in words' }, { v: 3 }, null, null, null, { v: 'Completed' }, null, null, { v: 'Yes' }] },
        { c: [{ v: 'Chapter 2: Four Operations of Whole Numbers' }, { v: 'Multiplying and dividing whole numbers by 10, 100 and 1000' }, { v: 3 }, null, null, null, { v: 'Completed' }, null, null, { v: 'Yes' }] },
      ],
    },
  }) + ');';

// Full 30-row dataset matching the real sample sheet, used to cross-check against its
// existing Summary-tab numbers (verified via the Google Drive read of the live sheet).
const SAMPLE_ROWS_RAW = [
  ['Chapter 1: Numbers to 10 million', 'Reading and writing numbers in numerals and in words', 3, '', 'Yes'],
  ['Chapter 2: Four Operations of Whole Numbers', 'Multiplying and dividing whole numbers by 10, 100 and 1000', 3, '', 'Yes'],
  ['Chapter 2: Four Operations of Whole Numbers', 'Working out multiple operations using BODMAS', 3, '', 'Yes'],
  ['Chapter 3: Fraction and Division', 'Expressing number division as a fraction', 3, '', 'Yes'],
  ['Chapter 3: Fraction and Division', 'Expressing fractions as decimals', 2, 'Outstanding: recurring decimals', 'Yes'],
  ['Chapter 4: Four Operations of Fractions', 'Adding and subtracting mixed numbers', 0, 'Aiesyah to go through before WA3', 'Yes'],
  ['Chapter 4: Four Operations of Fractions', 'Multiplying fractions', 2, 'Outstanding: fraction of', 'Yes'],
  ['Chapter 5: Area of Triangle', 'Finding perpendicular height to base', 3, '', 'Yes'],
  ['Chapter 5: Area of Triangle', 'Area of triangle formula', 3, '', 'Yes'],
  ['Chapter 5: Area of Triangle', 'Finding area of composite figures', 0, 'Outstanding: word problems in area', 'Yes'],
  ['Chapter 6: Volume', 'Counting unit cubes', 3, '', 'Yes'],
  ['Chapter 6: Volume', 'Drawing of a cube and cuboid on isometric grid', 2, 'Outstanding: painted surfaces', 'Yes'],
  ['Chapter 6: Volume', 'Volume of cube and cuboid formula', 1, 'Outstanding: word problems in volume', 'Yes'],
  ['Chapter 7: Decimals', 'Multiplying and dividing decimals by 10, 100 and 1000', 3, '', 'Yes'],
  ['Chapter 7: Decimals', 'Unit Conversion for Measurements', 3, '', 'Yes'],
  ['Chapter 8: Rate', 'Finding simple rate', 2, 'Outstanding: word problems in rate', 'Yes'],
  ['Chapter 8: Rate', 'Finding metre rate', 0, 'Atikah to go through before WA3', 'Yes'],
  ['Chapter 9: Percentage', 'Expressing fraction and decimal as a percentage', 0, 'Atikah to go through before WA3', 'Yes'],
  ['Chapter 9: Percentage', 'Finding percentage of a whole', 0, 'Atikah to go through before WA3', 'Yes'],
  ['Chapter 9: Percentage', 'Finding discount, GST and annual interest', 0, 'Atikah to go through before WA3', 'Yes'],
  ['Chapter 10: Angles', 'Property - Angles on a straight line', 0, '', 'No'],
  ['Chapter 10: Angles', 'Property - Angles at a point', 0, '', 'No'],
  ['Chapter 10: Angles', 'Property - Vertically opposite angles', 0, '', 'No'],
  ['Chapter 11: Triangles', 'Property - Right-angled, Equilateral and Isosceles triangle', 0, '', 'No'],
  ['Chapter 11: Triangles', 'Property - Sum of angles in a triangles', 0, '', 'No'],
  ['Chapter 12: Quadrilaterals', 'Shapes - Parallelogram, Rhombus and Trapezium', 0, '', 'No'],
  ['Chapter 12: Quadrilaterals', 'Property - Opposite Angles in a Parallelogram', 0, '', 'No'],
  ['Chapter 12: Quadrilaterals', 'Property - Corresponding Angles', 0, '', 'No'],
  ['Chapter 12: Quadrilaterals', 'Property - Interior Angles', 0, '', 'No'],
  ['Chapter 12: Quadrilaterals', 'Property - Alternate Angles', 0, '', 'No'],
];

function buildSampleRows() {
  return SAMPLE_ROWS_RAW.map(function (r) {
    return { 'Chapter': r[0], 'Sub-Concept': r[1], 'Progress (0-3)': r[2], 'Notes': r[3], 'Tested for Assessment?': r[4] };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nTracker Logic Tests\n');

console.log('parseGvizResponse():');
const parsedRows = parseGvizResponse(GVIZ_SAMPLE_TEXT);
assert('strips JSONP wrapper and parses rows', Array.isArray(parsedRows));
assert('includes banner rows unfiltered', parsedRows.length === 7);
assert('header row content intact', parsedRows[4][0] === 'Chapter');
assert('data row content intact', parsedRows[5][0] === 'Chapter 1: Numbers to 10 million');

const errorText = '/*O_o*/\ngoogle.visualization.Query.setResponse(' + JSON.stringify({
  status: 'error', errors: [{ detailed_message: 'Invalid sheet name' }],
}) + ');';
console.log('\nparseGvizResponse() error handling:');
try {
  parseGvizResponse(errorText);
  assert('throws on gviz error status', false);
} catch (e) {
  assert('throws on gviz error status', e.message === 'Invalid sheet name');
}

console.log('\nfindHeaderRow():');
assert('finds header row past banner rows', findHeaderRow(parsedRows) === 4);
try {
  findHeaderRow([['not a header'], ['still not']]);
  assert('throws when no header row found', false);
} catch (e) {
  assert('throws when no header row found', /Could not find header row/.test(e.message));
}

console.log('\nmapRowsByHeader():');
const mapped = mapRowsByHeader(parsedRows, 4);
assert('maps correct number of data rows', mapped.length === 2);
assert('maps by header name', mapped[0]['Chapter'] === 'Chapter 1: Numbers to 10 million');
assert('maps Progress column', mapped[0]['Progress (0-3)'] === 3);
assert('blank Unit columns do not break mapping', mapped[0]['Tested for Assessment?'] === 'Yes');

console.log('\nderiveRowState():');
assert('0 → Not Started, no units filled', deriveRowState(0).statusLabel === 'Not Started' && !deriveRowState(0).unit1Filled);
assert('1 → Started, unit1 filled only', deriveRowState(1).statusLabel === 'Started' && deriveRowState(1).unit1Filled && !deriveRowState(1).unit2Filled);
assert('2 → Halfway, units 1-2 filled', deriveRowState(2).statusLabel === 'Halfway' && deriveRowState(2).unit2Filled && !deriveRowState(2).unit3Filled);
assert('3 → Completed, all units filled', deriveRowState(3).statusLabel === 'Completed' && deriveRowState(3).unit3Filled);
assert('out-of-range high clamps to Completed', deriveRowState(5).statusLabel === 'Completed');
assert('out-of-range low clamps to Not Started', deriveRowState(-2).statusLabel === 'Not Started');
assert('non-numeric treated as 0', deriveRowState('').statusLabel === 'Not Started');

console.log('\ncomputeChapterSummary() — cross-checked against the live sample sheet\'s Summary tab:');
const sampleRows = buildSampleRows();
const chapterSummaries = computeChapterSummary(sampleRows);
const byName = {};
chapterSummaries.forEach(function (c) { byName[c.chapter] = c; });

const expectedChapters = [
  ['Chapter 1: Numbers to 10 million', 1, 3, 3, '100.0%', 3, 3, '100.0%'],
  ['Chapter 2: Four Operations of Whole Numbers', 2, 6, 6, '100.0%', 6, 6, '100.0%'],
  ['Chapter 3: Fraction and Division', 2, 6, 5, '83.3%', 6, 5, '83.3%'],
  ['Chapter 4: Four Operations of Fractions', 2, 6, 2, '33.3%', 6, 2, '33.3%'],
  ['Chapter 5: Area of Triangle', 3, 9, 6, '66.7%', 9, 6, '66.7%'],
  ['Chapter 6: Volume', 3, 9, 6, '66.7%', 9, 6, '66.7%'],
  ['Chapter 7: Decimals', 2, 6, 6, '100.0%', 6, 6, '100.0%'],
  ['Chapter 8: Rate', 2, 6, 2, '33.3%', 6, 2, '33.3%'],
  ['Chapter 9: Percentage', 3, 9, 0, '0.0%', 9, 0, '0.0%'],
  ['Chapter 10: Angles', 3, 9, 0, '0.0%', 0, 0, 'N/A'],
  ['Chapter 11: Triangles', 2, 6, 0, '0.0%', 0, 0, 'N/A'],
  ['Chapter 12: Quadrilaterals', 5, 15, 0, '0.0%', 0, 0, 'N/A'],
];

expectedChapters.forEach(function (row) {
  const [name, subCount, totalUnits, unitsAchieved, pctAll, testedUnits, testedAchieved, pctAssessment] = row;
  const c = byName[name];
  assert(name + ': sub-concept count', c && c.subConceptCount === subCount);
  assert(name + ': total units', c.totalUnits === totalUnits);
  assert(name + ': units achieved', c.unitsAchieved === unitsAchieved);
  assert(name + ': % complete (all)', pct1(c.pctAll) === pctAll);
  assert(name + ': tested units', c.testedUnits === testedUnits);
  assert(name + ': tested units achieved', c.testedAchieved === testedAchieved);
  assert(name + ': % complete (assessment)', pct1(c.pctAssessment) === pctAssessment);
});

console.log('\ncomputeOverallSummary() — cross-checked against the sample sheet\'s OVERALL row:');
const overall = computeOverallSummary(sampleRows);
assert('30 sub-concepts', overall.subConceptCount === 30);
assert('90 total units', overall.totalUnits === 90);
assert('36 units achieved', overall.unitsAchieved === 36);
assert('40.0% complete (all)', pct1(overall.pctAll) === '40.0%');
assert('60 tested units', overall.testedUnits === 60);
assert('36 tested units achieved', overall.testedAchieved === 36);
assert('60.0% complete (assessment)', pct1(overall.pctAssessment) === '60.0%');

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
if (fail > 0) process.exit(1);

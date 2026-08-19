// Unit tests for the pure logic functions in ../index.html
// Run: node tests/test_logic.js
// Keep these functions in sync with the copies inlined in index.html.

var pass = 0, fail = 0;

function assert(label, condition) {
  if (condition) { console.log('  PASS', label); pass++; }
  else           { console.error('  FAIL', label); fail++; }
}

// ── Pure functions copied from index.html ───────────────────────────────────

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore, paired \n below ends the row
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const COLUMNS = { CHAPTER: 0, SUB_CONCEPT: 1, PROGRESS: 2, DATE_TAUGHT: 7, NOTES: 8, TESTED: 9 };

function mapCsvRows(rows) {
  const dataRows = rows.slice(1).filter(function (row) { return row && row[COLUMNS.CHAPTER]; });
  if (dataRows.length === 0) {
    throw new Error('No data rows found — check the Content Tracker tab layout');
  }
  return dataRows.map(function (row) {
    return {
      'Chapter': row[COLUMNS.CHAPTER] || '',
      'Sub-Concept': row[COLUMNS.SUB_CONCEPT] || '',
      'Progress (0-3)': row[COLUMNS.PROGRESS] || '',
      'Date Taught': row[COLUMNS.DATE_TAUGHT] || '',
      'Notes': row[COLUMNS.NOTES] || '',
      'Tested for Assessment?': row[COLUMNS.TESTED] || '',
    };
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

// ── Worksheet mapping (mirrors the registry inlined in ../index.html) ──────
// Trimmed to just the entries exercised by the tests below — the full
// registry lives in index.html and is the source of truth.

const WORKSHEET_FILES = {
  ws3_fraction_to_decimal_i: { title: 'Worksheet 3: Fraction to Decimal I', sets: { A: 'worksheets/decimals/WS3_Fraction_to_Decimal_I.pdf' } },
  ws4_fraction_to_decimal_ii: { title: 'Worksheet 4: Fraction to Decimal II', sets: { A: 'worksheets/decimals/WS4_Fraction_to_Decimal_II.pdf', B: 'worksheets/decimals/WS4_SetB_Fraction_to_Decimal_II.pdf', C: 'worksheets/decimals/WS4_SetC_Fraction_to_Decimal_II.pdf' } },
  ws5_reading_number_line: { title: 'Worksheet 5: Reading Number Line (in Decimal)', sets: { A: 'worksheets/decimals/WS5_Reading_Number_Line_in_Decimal.pdf', B: 'worksheets/decimals/WS5_SetB_Reading_Number_Line_in_Decimal.pdf', C: 'worksheets/decimals/WS5_SetC_Reading_Number_Line_in_Decimal.pdf' } },
  ws6_reading_number_line_ii: { title: 'Worksheet 6: Reading Number Line (in Decimal) II', sets: { A: 'worksheets/decimals/WS6_Reading_Number_Line_in_Decimal_II.pdf', B: 'worksheets/decimals/WS6_SetB_Reading_Number_Line_in_Decimal_II.pdf', C: 'worksheets/decimals/WS6_SetC_Reading_Number_Line_in_Decimal_II.pdf' } },
  ws8_comparing_decimals: { title: 'Worksheet 8: Comparing Decimals', sets: { A: 'worksheets/decimals/WS8_Comparing_Decimals.pdf' } },
  ws9_ordering_decimals: { title: 'Worksheet 9: Ordering Decimals', sets: { A: 'worksheets/decimals/WS9_Ordering_Decimals.pdf' } },
  rate_ws1_finding_and_using_rate: { title: 'Rate Worksheet 1: Finding and Using Rate', sets: { A: 'worksheets/rate/WS1_Finding_and_Using_Rate.pdf' } },
  rate_ws2_postage_rate_tables: { title: 'Rate Worksheet 2: Postage Rate Tables', sets: { A: 'worksheets/rate/WS2_Postage_Rate_Tables.pdf' } },
};

const WORKSHEET_MAP = [
  { chapter: 'Chapter 8: Rate', subConcept: 'Finding simple rate', worksheetIds: ['rate_ws1_finding_and_using_rate', 'rate_ws2_postage_rate_tables'] },
  { chapter: 'Chapter 9: Decimals', subConcept: 'Comparing and ordering decimals', worksheetIds: ['ws8_comparing_decimals', 'ws9_ordering_decimals'] },
  { chapter: 'Chapter 9: Decimals', subConcept: 'Expressing fraction as decimal', worksheetIds: ['ws3_fraction_to_decimal_i', 'ws4_fraction_to_decimal_ii'] },
];

const CHAPTER_WORKSHEET_MAP = [
  { chapter: 'Chapter 7: Decimals', worksheetIds: ['ws5_reading_number_line', 'ws6_reading_number_line_ii'] },
];

function expandWorksheetIds(worksheetIds) {
  const out = [];
  worksheetIds.forEach(function (id) {
    const entry = WORKSHEET_FILES[id];
    if (!entry) return;
    const setLabels = Object.keys(entry.sets);
    setLabels.forEach(function (setLabel) {
      out.push({
        title: entry.title,
        setLabel: setLabels.length > 1 ? setLabel : null,
        path: entry.sets[setLabel],
      });
    });
  });
  return out;
}

function findWorksheetsForSubConcept(chapter, subConcept) {
  const c = String(chapter || '').trim();
  const s = String(subConcept || '').trim();
  const match = WORKSHEET_MAP.find(function (m) { return m.chapter === c && m.subConcept === s; });
  return match ? expandWorksheetIds(match.worksheetIds) : [];
}

function findWorksheetsForChapter(chapter) {
  const c = String(chapter || '').trim();
  const match = CHAPTER_WORKSHEET_MAP.find(function (m) { return m.chapter === c; });
  return match ? expandWorksheetIds(match.worksheetIds) : [];
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Captured shape of the real gviz CSV response: merged banner/title rows above
// the real header collapse into a single (garbled) row 0, then clean data rows.
const CSV_SAMPLE_TEXT =
  '"P5 Standard Mathematics — Content Coverage Tracker Tutee Name: How to use: Chapter","Progress: type 0-3... Sub-Concept","Progress (0-3)","Last Updated: Unit 1","Unit 2","Unit 3","Status","Date Taught","Notes","Tested for Assessment?"\n' +
  '"Chapter 1: Numbers to 10 million","Reading and writing numbers in numerals and in words","3","","","","Completed","","","Yes"\n' +
  '"Chapter 2: Four Operations of Whole Numbers","Multiplying and dividing whole numbers by 10, 100 and 1000","3","","","","Completed","","","Yes"\n' +
  '"Chapter 4: Four Operations of Fractions","Multiplying fractions","2","","","","Halfway","","Outstanding: How to interpret ""fraction of"" in short-answer types","Yes"\n';

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
  // Progress is stringified — CSV cells are always strings in production, and
  // clampProgress()/Number() must handle that (not just numeric literals).
  return SAMPLE_ROWS_RAW.map(function (r) {
    return { 'Chapter': r[0], 'Sub-Concept': r[1], 'Progress (0-3)': String(r[2]), 'Notes': r[3], 'Tested for Assessment?': r[4] };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nTracker Logic Tests\n');

console.log('parseCsv():');
const parsedRows = parseCsv(CSV_SAMPLE_TEXT);
assert('parses correct number of rows (1 garbled header + 3 data)', parsedRows.length === 4);
assert('splits quoted fields with embedded commas correctly', parsedRows[2][1] === 'Multiplying and dividing whole numbers by 10, 100 and 1000');
assert('unescapes doubled quotes ("" -> ")', parsedRows[3][8] === 'Outstanding: How to interpret "fraction of" in short-answer types');
assert('row 0 is the garbled banner+header row, not data', parsedRows[0][0] !== 'Chapter 1: Numbers to 10 million');

console.log('\nmapCsvRows():');
const mapped = mapCsvRows(parsedRows);
assert('skips row 0 (garbled banner+header)', mapped.length === 3);
assert('maps Chapter by position', mapped[0]['Chapter'] === 'Chapter 1: Numbers to 10 million');
assert('maps Progress by position', mapped[0]['Progress (0-3)'] === '3');
assert('maps Tested column despite blank Unit 1-3 columns in between', mapped[0]['Tested for Assessment?'] === 'Yes');
assert('preserves unescaped quotes in Notes', mapped[2]['Notes'] === 'Outstanding: How to interpret "fraction of" in short-answer types');
try {
  mapCsvRows([['garbled header only, no data']]);
  assert('throws when no data rows found', false);
} catch (e) {
  assert('throws when no data rows found', /No data rows found/.test(e.message));
}

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

console.log('\nfindWorksheetsForSubConcept() / findWorksheetsForChapter() (backlog #6):');

const rateMatch = findWorksheetsForSubConcept('Chapter 8: Rate', 'Finding simple rate');
assert('sub-concept match: two worksheet types, one set each', rateMatch.length === 2);
assert('sub-concept match: single-set worksheets get no set label', rateMatch.every(function (w) { return w.setLabel === null; }));
assert('sub-concept match: paths resolve into the worksheets/ dir', rateMatch[0].path.indexOf('worksheets/rate/') === 0);

const decimalsMatch = findWorksheetsForSubConcept('Chapter 9: Decimals', 'Expressing fraction as decimal');
assert('sub-concept match: multi-set worksheet expands every set', decimalsMatch.length === 4);
assert('sub-concept match: multi-set worksheet gets A/B/C labels', decimalsMatch.filter(function (w) { return w.setLabel === 'C'; }).length === 1);

assert('sub-concept no-match returns empty array', findWorksheetsForSubConcept('Chapter 1: Numbers to 10 million', 'Reading and writing numbers in numerals and in words').length === 0);
assert('sub-concept match trims whitespace', findWorksheetsForSubConcept('  Chapter 8: Rate  ', '  Finding simple rate  ').length === 2);

const chapterMatch = findWorksheetsForChapter('Chapter 7: Decimals');
assert('chapter-level match: two worksheet types, three sets each', chapterMatch.length === 6);
assert('chapter-level no-match returns empty array', findWorksheetsForChapter('Chapter 1: Numbers to 10 million').length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
if (fail > 0) process.exit(1);

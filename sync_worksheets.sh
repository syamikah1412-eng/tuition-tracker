#!/bin/bash
# Syncs the worksheet PDFs referenced by WORKSHEET_FILES in index.html from the
# worksheet generator project into this repo's worksheets/ dir for GitHub Pages
# hosting. Answer keys are intentionally excluded — worksheet-only downloads.
#
# Run after adding a new worksheet/Set to worksheets/, then update WORKSHEET_FILES
# in index.html (and WORKSHEET_MAP/CHAPTER_WORKSHEET_MAP if it should be linked
# from a chapter/sub-concept) to reference the new file.
set -euo pipefail

SRC="../worksheets/output"
DST="worksheets"

if [ ! -d "$SRC" ]; then
  echo "Error: $SRC not found — run this script from the tracker/ directory." >&2
  exit 1
fi

sync_topic() {
  local topic="$1"
  shift
  mkdir -p "$DST/$topic"
  for f in "$@"; do
    if [ ! -f "$SRC/$topic/$f" ]; then
      echo "Error: $SRC/$topic/$f not found" >&2
      exit 1
    fi
    cp "$SRC/$topic/$f" "$DST/$topic/$f"
  done
}

sync_topic decimals \
  WS1_Addition_of_Decimals.pdf \
  WS2_Place_Value_of_Decimals.pdf \
  WS2_SetB_Place_Value_of_Decimals.pdf \
  WS3_Fraction_to_Decimal_I.pdf \
  WS4_Fraction_to_Decimal_II.pdf \
  WS4_SetB_Fraction_to_Decimal_II.pdf \
  WS4_SetC_Fraction_to_Decimal_II.pdf \
  WS5_Reading_Number_Line_in_Decimal.pdf \
  WS5_SetB_Reading_Number_Line_in_Decimal.pdf \
  WS5_SetC_Reading_Number_Line_in_Decimal.pdf \
  WS6_Reading_Number_Line_in_Decimal_II.pdf \
  WS6_SetB_Reading_Number_Line_in_Decimal_II.pdf \
  WS6_SetC_Reading_Number_Line_in_Decimal_II.pdf \
  WS7_Multiplying_Decimals_by_10_100_1000_I.pdf \
  WS7_SetB_Multiplying_Decimals_by_10_100_1000_I.pdf \
  WS8_Comparing_Decimals.pdf \
  WS9_Ordering_Decimals.pdf \
  WS10_Multiplication_of_Decimals.pdf \
  WS11_Division_of_Decimals.pdf

sync_topic number_operations \
  NumOps_WS1_Multiples_2_to_10_I.pdf \
  NumOps_WS2_Multiples_2_to_10_II.pdf \
  NumOps_WS3_Multiples_2_to_10_III.pdf \
  NumOps_WS4_Division.pdf \
  NumOps_WS5_Long_Division_I.pdf \
  NumOps_WS5_SetB_Long_Division_I.pdf \
  NumOps_WS6_Long_Division_II.pdf \
  NumOps_WS6_SetB_Long_Division_II.pdf

sync_topic rate \
  WS1_Finding_and_Using_Rate.pdf \
  WS2_Postage_Rate_Tables.pdf

echo "Synced $(find "$DST" -name '*.pdf' | wc -l | tr -d ' ') worksheet PDFs into $DST/"

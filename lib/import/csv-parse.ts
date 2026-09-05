// Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes, commas
// and newlines inside quotes, and a leading UTF-8 BOM. Returns rows of cells.
export interface CsvRecord {
  cells: string[]
  // 1-based physical line in the source where this record starts, for error reporting.
  line: number
}

// BCA and other bank exports vary the field separator (comma, semicolon, or tab). The delimiter is
// sniffed by the caller and passed in; it defaults to comma for plain CSV.
export function parseCsvRecords(text: string, delimiter = ','): CsvRecord[] {
  const input = text.replace(/^﻿/, '')
  const records: CsvRecord[] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let physLine = 1
  let rowStartLine = 1

  const flush = () => {
    row.push(cell)
    if (row.some((c) => c.trim() !== '')) records.push({ cells: row, line: rowStartLine })
    row = []
    cell = ''
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        if (ch === '\n') physLine++
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || (ch === '\r' && input[i + 1] !== '\n')) {
      // Row terminator: LF, or a lone CR (classic Mac). CRLF is handled by its LF.
      flush()
      physLine++
      rowStartLine = physLine
    } else if (ch === '\r') {
      // CR of a CRLF pair; the following LF ends the row.
      continue
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) flush()
  return records
}

export function parseCsv(text: string): string[][] {
  return parseCsvRecords(text).map((r) => r.cells)
}

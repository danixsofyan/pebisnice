// Build CSV text. Values with a comma, quote, or newline are quoted and their quotes doubled (RFC 4180). Prefixed with a UTF-8 BOM so Excel opens accents and rupiah correctly.
export type CsvValue = string | number | null | undefined

// A cell that starts with =, +, -, @, tab, or CR is treated as a formula by Excel/LibreOffice/
// Sheets when the file is opened — CSV (formula) injection. A cashier or a public-order customer
// could plant a payload (e.g. in a product name) that runs in the owner's spreadsheet. We prepend
// a single quote to neutralise it, but leave plain numbers (incl. negatives) alone so numeric
// columns stay numeric.
function needsFormulaGuard(text: string): boolean {
  if (!/^[=+\-@\t\r]/.test(text)) return false
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) return false
  return true
}

function escapeCell(value: CsvValue): string {
  let text = value == null ? '' : String(value)
  if (needsFormulaGuard(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  return '﻿' + lines.join('\r\n')
}

/** Safe filename from a label and date range. */
export function exportFileName(prefix: string, start: string, end: string): string {
  const safe = prefix.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `${safe}-${start}-sampai-${end}.csv`
}

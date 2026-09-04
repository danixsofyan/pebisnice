// Build CSV text. Values with a comma, quote, or newline are quoted and their quotes doubled (RFC 4180). Prefixed with a UTF-8 BOM so Excel opens accents and rupiah correctly.
export type CsvValue = string | number | null | undefined

function escapeCell(value: CsvValue): string {
  const text = value == null ? '' : String(value)
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

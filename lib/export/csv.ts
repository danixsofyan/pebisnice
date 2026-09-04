/**
 * Membuat teks CSV. Nilai yang mengandung koma, kutip, atau baris baru dibungkus
 * kutip dan kutipnya digandakan (aturan RFC 4180). Diawali BOM UTF-8 supaya
 * Excel membuka aksen dan rupiah dengan benar.
 */
export type CsvValue = string | number | null | undefined

function escapeCell(value: CsvValue): string {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  return '﻿' + lines.join('\r\n')
}

/** Nama berkas aman dari label dan rentang tanggal. */
export function exportFileName(prefix: string, start: string, end: string): string {
  const safe = prefix.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `${safe}-${start}-sampai-${end}.csv`
}

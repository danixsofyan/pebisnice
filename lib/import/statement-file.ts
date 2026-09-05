import { parseCsvRecords, type CsvRecord } from './csv-parse'

// Turn an uploaded bank-statement file into rows, matching what BCA actually hands out: a CSV/TXT
// (comma, semicolon, or tab separated) OR the ".xls" that KlikBCA/myBCA produce, which is really an
// HTML table. True binary spreadsheets (.xls BIFF / .xlsx zip) are refused up front by magic bytes:
// parsing them would mean decompressing untrusted archives (zip-bomb risk), so we never open one and
// instead tell the user to export as CSV. Everything here is bounded, text-only work — no regex that
// can backtrack catastrophically, no decompression — so a hostile file can't blow up memory or CPU.

// Comfortably above any real BCA statement (a busy business account for a month is well under 1 MB
// as text) yet small enough that holding it in memory is harmless.
export const STATEMENT_MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export type StatementExtract =
  | { ok: true; records: CsvRecord[] }
  | { ok: false; reason: string }

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false
  return sig.every((b, i) => bytes[i] === b)
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function cleanCellHtml(raw: string): string {
  // `<[^>]*>` is linear-time (no nested quantifier), so it can't be used for ReDoS.
  return decodeEntities(raw.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCells(rowHtml: string): string[] {
  const cells: string[] = []
  const lower = rowHtml.toLowerCase()
  let pos = 0
  while (pos < rowHtml.length) {
    const td = lower.indexOf('<td', pos)
    const th = lower.indexOf('<th', pos)
    const start = td === -1 ? th : th === -1 ? td : Math.min(td, th)
    if (start === -1) break
    const openEnd = lower.indexOf('>', start)
    if (openEnd === -1) break
    const closeTd = lower.indexOf('</td', openEnd)
    const closeTh = lower.indexOf('</th', openEnd)
    const closes = [closeTd, closeTh].filter((x) => x !== -1)
    const close = closes.length ? Math.min(...closes) : rowHtml.length
    cells.push(cleanCellHtml(rowHtml.slice(openEnd + 1, close)))
    pos = close + 4
  }
  return cells
}

function extractHtmlTable(text: string): CsvRecord[] {
  const records: CsvRecord[] = []
  const lower = text.toLowerCase()
  let pos = 0
  while (pos < text.length) {
    const trStart = lower.indexOf('<tr', pos)
    if (trStart === -1) break
    const openEnd = lower.indexOf('>', trStart)
    if (openEnd === -1) break
    const trEnd = lower.indexOf('</tr', openEnd)
    const inner = text.slice(openEnd + 1, trEnd === -1 ? text.length : trEnd)
    const cells = extractCells(inner)
    if (cells.some((c) => c !== '')) records.push({ cells, line: records.length + 1 })
    pos = trEnd === -1 ? text.length : trEnd + 4
  }
  return records
}

function sniffDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  const count = (ch: string) => firstLine.split(ch).length - 1
  const candidates: Array<[string, number]> = [
    [',', count(',')],
    [';', count(';')],
    ['\t', count('\t')],
  ]
  candidates.sort((a, b) => b[1] - a[1])
  return candidates[0]![1] > 0 ? candidates[0]![0] : ','
}

export function extractStatementRecords(bytes: Uint8Array): StatementExtract {
  if (bytes.length === 0) return { ok: false, reason: 'Berkas kosong' }
  if (bytes.length > STATEMENT_MAX_BYTES) {
    return { ok: false, reason: 'Ukuran berkas melebihi 2 MB' }
  }

  // .xlsx / any zip container.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return {
      ok: false,
      reason: 'Berkas .xlsx tidak didukung. Simpan/ekspor sebagai CSV dari KlikBCA lalu unggah.',
    }
  }
  // Legacy binary .xls (OLE2 / BIFF).
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return {
      ok: false,
      reason: 'Berkas .xls biner tidak didukung. Simpan/ekspor sebagai CSV dari KlikBCA lalu unggah.',
    }
  }

  const text = new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '')

  const looksHtml = /<table[\s>]/i.test(text) || /<tr[\s>]/i.test(text)
  const records = looksHtml ? extractHtmlTable(text) : parseCsvRecords(text, sniffDelimiter(text))

  if (records.length === 0) {
    return { ok: false, reason: 'Tidak ada baris yang bisa dibaca dari berkas' }
  }
  return { ok: true, records }
}

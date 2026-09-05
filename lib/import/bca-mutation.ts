import type { CsvRecord } from './csv-parse'

export interface ParsedMutation {
  mutationDate: string // YYYY-MM-DD
  description: string
  amount: string // decimal string, always positive
  direction: 'in' | 'out'
  balanceAfter: string | null
}

export interface MutationParseError {
  line: number
  message: string
}

export interface MutationImportResult {
  rows: ParsedMutation[]
  errors: MutationParseError[]
}

const COLS = ['tanggal', 'keterangan', 'cabang', 'mutasi', 'saldo'] as const
type Col = (typeof COLS)[number]

// KlikBCA labels the amount column "Mutasi"; some exports use "Jumlah".
const AMOUNT_ALIASES = ['mutasi', 'jumlah']

// Parse "1,000,000.00" or "1.000.000,00": the last separator is the decimal point.
function parseIndoNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, '')
  if (!cleaned) return null
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized: string
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = cleaned.replace(/,/g, '')
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

// Accept DD/MM, DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD; fall back year for the short form.
function parseDate(raw: string, fallbackYear: number): string | null {
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parts = s.split(/[/-]/)
  if (parts.length < 2) return null
  const day = Number(parts[0])
  const month = Number(parts[1])
  const year = parts[2] ? Number(parts[2].length === 2 ? `20${parts[2]}` : parts[2]) : fallbackYear
  if (!day || !month || day > 31 || month > 12) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Parse a BCA statement (KlikBCA CSV) into normalized mutations. The header names the
// columns in any order; CR/DB in the amount cell (or a separate column) sets direction.
export function parseBcaMutations(records: CsvRecord[], year: number): MutationImportResult {
  if (records.length === 0) return { rows: [], errors: [{ line: 0, message: 'Berkas kosong' }] }

  // Real BCA exports (and the HTML ".xls") often carry preamble rows — account number, period,
  // opening balance — before the column header. Scan for the header row rather than assuming it's
  // the first, so those files parse without hand-editing.
  let headerRow = -1
  const index = {} as Record<Col, number>
  for (let r = 0; r < records.length; r++) {
    const cells = records[r]!.cells.map((h) => h.trim().toLowerCase())
    const tanggal = cells.indexOf('tanggal')
    let mutasi = cells.indexOf('mutasi')
    if (mutasi === -1) mutasi = AMOUNT_ALIASES.map((a) => cells.indexOf(a)).find((i) => i >= 0) ?? -1
    if (tanggal >= 0 && mutasi >= 0) {
      headerRow = r
      for (const key of COLS) index[key] = cells.indexOf(key)
      index.mutasi = mutasi
      break
    }
  }
  if (headerRow === -1) {
    return {
      rows: [],
      errors: [{ line: records[0]!.line, message: 'Header wajib memuat kolom Tanggal dan Mutasi' }],
    }
  }

  const rows: ParsedMutation[] = []
  const errors: MutationParseError[] = []

  for (let i = headerRow + 1; i < records.length; i++) {
    const cells = records[i]!.cells
    const line = records[i]!.line
    const get = (key: Col) => (index[key] >= 0 ? (cells[index[key]] ?? '').trim() : '')

    const date = parseDate(get('tanggal'), year)
    if (!date) {
      errors.push({ line, message: `Tanggal tidak valid: "${get('tanggal')}"` })
      continue
    }

    const amountCell = get('mutasi')
    const amount = parseIndoNumber(amountCell)
    if (amount === null || amount <= 0) {
      errors.push({ line, message: `Nominal tidak valid: "${amountCell}"` })
      continue
    }

    // Direction from a CR/DB marker in the amount cell, else a trailing DB anywhere on the row.
    const rowText = cells.join(' ').toUpperCase()
    const direction: 'in' | 'out' = /\bDB\b|DEBET|DEBIT/.test(rowText.replace(/CREDIT/g, ''))
      ? 'out'
      : /\bCR\b|CREDIT|KREDIT/.test(rowText)
        ? 'in'
        : 'out'

    const balance = index.saldo >= 0 ? parseIndoNumber(get('saldo')) : null

    rows.push({
      mutationDate: date,
      description: get('keterangan') || amountCell,
      amount: amount.toFixed(2),
      direction,
      balanceAfter: balance !== null ? balance.toFixed(2) : null,
    })
  }

  return { rows, errors }
}

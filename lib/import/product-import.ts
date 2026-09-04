export interface ParsedProductRow {
  name: string
  type: 'finished' | 'material'
  sku: string | null
  variantName: string | null
  hpp: string
  initialStock: number
}

export interface RowError {
  line: number
  message: string
}

export interface ProductImportResult {
  rows: ParsedProductRow[]
  errors: RowError[]
}

const HEADERS = ['name', 'type', 'sku', 'variant', 'hpp', 'stock'] as const
type Header = (typeof HEADERS)[number]

// Validate a parsed CSV into product rows. The header row names the columns
// (any order); each data row is validated independently so one bad row doesn't
// sink the rest. When `lines` is given it reports the true source line, otherwise
// the 1-based table index.
export function parseProductRows(table: string[][], lines?: number[]): ProductImportResult {
  if (table.length === 0) return { rows: [], errors: [{ line: 0, message: 'Berkas kosong' }] }

  const header = table[0]!.map((h) => h.trim().toLowerCase())
  const index = {} as Record<Header, number>
  for (const key of HEADERS) index[key] = header.indexOf(key)
  if (index.name === -1) {
    return {
      rows: [],
      errors: [{ line: lines?.[0] ?? 1, message: 'Kolom "name" wajib ada di header' }],
    }
  }

  const rows: ParsedProductRow[] = []
  const errors: RowError[] = []

  for (let i = 1; i < table.length; i++) {
    const cells = table[i]!
    const line = lines?.[i] ?? i + 1
    const get = (key: Header) => (index[key] >= 0 ? (cells[index[key]] ?? '').trim() : '')

    const name = get('name')
    if (!name) {
      errors.push({ line, message: 'Nama kosong' })
      continue
    }

    const typeRaw = get('type').toLowerCase()
    const type: 'finished' | 'material' = typeRaw === 'material' ? 'material' : 'finished'

    const hppRaw = get('hpp')
    if (hppRaw && !/^\d+(\.\d{1,2})?$/.test(hppRaw)) {
      errors.push({ line, message: `HPP tidak valid: "${hppRaw}"` })
      continue
    }

    const stockRaw = get('stock')
    if (stockRaw && !/^\d+$/.test(stockRaw)) {
      errors.push({ line, message: `Stok tidak valid: "${stockRaw}"` })
      continue
    }

    rows.push({
      name,
      type,
      sku: get('sku') || null,
      variantName: get('variant') || null,
      hpp: hppRaw ? Number(hppRaw).toFixed(2) : '0',
      initialStock: stockRaw ? Number(stockRaw) : 0,
    })
  }

  return { rows, errors }
}

export const PRODUCT_CSV_TEMPLATE =
  'name,type,sku,variant,hpp,stock\nKopi Susu,finished,KS-01,Reguler,8000,50\n'

import { describe, expect, it } from 'vitest'
import { parseProductRows } from '@/lib/import/product-import'

describe('parseProductRows', () => {
  it('maps valid rows and defaults type/hpp/stock', () => {
    const r = parseProductRows([
      ['name', 'type', 'sku', 'variant', 'hpp', 'stock'],
      ['Kopi Susu', 'finished', 'KS-01', 'Reguler', '8000', '50'],
      ['Gula', '', '', '', '', ''],
    ])
    expect(r.errors).toEqual([])
    expect(r.rows[0]).toEqual({
      name: 'Kopi Susu',
      type: 'finished',
      sku: 'KS-01',
      variantName: 'Reguler',
      hpp: '8000.00',
      initialStock: 50,
    })
    expect(r.rows[1]).toEqual({
      name: 'Gula',
      type: 'finished',
      sku: null,
      variantName: null,
      hpp: '0',
      initialStock: 0,
    })
  })

  it('requires a name column and reports bad rows by line', () => {
    expect(parseProductRows([['sku'], ['x']]).errors[0]!.message).toMatch(/name/)
    const r = parseProductRows([
      ['name', 'hpp', 'stock'],
      ['', '1', '1'],
      ['Ok', 'abc', '1'],
      ['Ok2', '1', 'x'],
    ])
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4])
    expect(r.rows).toEqual([])
  })

  it('respects column order from the header', () => {
    const r = parseProductRows([
      ['stock', 'name', 'hpp'],
      ['10', 'Teh', '2000'],
    ])
    expect(r.rows[0]).toMatchObject({ name: 'Teh', initialStock: 10, hpp: '2000.00' })
  })
})

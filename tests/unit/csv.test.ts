import { describe, expect, it } from 'vitest'
import { toCsv, exportFileName } from '@/lib/export/csv'

describe('toCsv', () => {
  it('menyusun header dan baris', () => {
    const csv = toCsv(
      ['a', 'b'],
      [
        ['1', '2'],
        ['3', '4'],
      ]
    )
    expect(csv).toBe('﻿a,b\r\n1,2\r\n3,4')
  })

  it('membungkus dan menggandakan kutip untuk nilai berisi koma/kutip/baris', () => {
    expect(toCsv(['x'], [['a,b']])).toContain('"a,b"')
    expect(toCsv(['x'], [['dia "bilang"']])).toContain('"dia ""bilang"""')
    expect(toCsv(['x'], [['baris\nbaru']])).toContain('"baris\nbaru"')
  })

  it('memperlakukan null/undefined sebagai kosong', () => {
    expect(toCsv(['x', 'y'], [[null, undefined]])).toBe('﻿x,y\r\n,')
  })

  it('menetralkan sel yang bisa dieksekusi sebagai formula (CSV injection)', () => {
    expect(toCsv(['x'], [['=1+1']])).toContain("'=1+1")
    expect(toCsv(['x'], [['+SUM(A1)']])).toContain("'+SUM(A1)")
    expect(toCsv(['x'], [['@SUM(A1)']])).toContain("'@SUM(A1)")
    expect(toCsv(['x'], [['=HYPERLINK("http://evil")']])).toContain('"\'=HYPERLINK(""http://evil"")"')
    expect(toCsv(['x'], [['-2+3']])).toContain("'-2+3")
  })

  it('membiarkan angka biasa termasuk negatif tetap numerik', () => {
    expect(toCsv(['x'], [['-500']])).toBe('﻿x\r\n-500')
    expect(toCsv(['x'], [['-1000.50']])).toBe('﻿x\r\n-1000.50')
    expect(toCsv(['x'], [[1234]])).toBe('﻿x\r\n1234')
  })
})

describe('exportFileName', () => {
  it('membersihkan prefiks dan menyisipkan rentang', () => {
    expect(exportFileName('Transaksi Kasir', '2026-09-01', '2026-09-30')).toBe(
      'transaksi-kasir-2026-09-01-sampai-2026-09-30.csv'
    )
  })
})

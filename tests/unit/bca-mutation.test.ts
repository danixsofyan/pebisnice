import { describe, expect, it } from 'vitest'
import { parseCsvRecords } from '@/lib/import/csv-parse'
import { parseBcaMutations } from '@/lib/import/bca-mutation'

function parse(csv: string, year = 2025) {
  return parseBcaMutations(parseCsvRecords(csv), year)
}

describe('parseBcaMutations', () => {
  it('parses credit and debit rows with CR/DB markers', () => {
    const csv = [
      'Tanggal,Keterangan,Cabang,Mutasi,Saldo',
      '01/09,TRSF E-BANKING CR,0000,"100,000.00 CR","5,100,000.00"',
      '02/09,BIAYA ADM,0000,"15,000.00 DB","5,085,000.00"',
    ].join('\n')
    const { rows, errors } = parse(csv)
    expect(errors).toEqual([])
    expect(rows[0]).toEqual({
      mutationDate: '2025-09-01',
      description: 'TRSF E-BANKING CR',
      amount: '100000.00',
      direction: 'in',
      balanceAfter: '5100000.00',
    })
    expect(rows[1]).toMatchObject({
      mutationDate: '2025-09-02',
      amount: '15000.00',
      direction: 'out',
      balanceAfter: '5085000.00',
    })
  })

  it('accepts the Indonesian 1.000.000,00 number format', () => {
    const csv = 'Tanggal,Keterangan,Mutasi\n03/09,SETORAN,"2.500.000,50 CR"'
    const { rows } = parse(csv)
    expect(rows[0]).toMatchObject({ amount: '2500000.50', direction: 'in' })
  })

  it('accepts full dates and reports invalid rows by line', () => {
    const csv = ['Tanggal,Keterangan,Mutasi', '2025-09-05,OK,"1,000.00 DB"', 'xx,BAD,"1 CR"'].join(
      '\n'
    )
    const { rows, errors } = parse(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.mutationDate).toBe('2025-09-05')
    expect(errors[0]!.line).toBe(3)
  })

  it('requires Tanggal and Mutasi columns', () => {
    expect(parse('Keterangan,Saldo\nx,y').errors[0]!.message).toMatch(/Tanggal dan Mutasi/)
  })
})

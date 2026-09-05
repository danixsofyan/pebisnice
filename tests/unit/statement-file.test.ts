import { describe, expect, it } from 'vitest'
import { extractStatementRecords, STATEMENT_MAX_BYTES } from '@/lib/import/statement-file'
import { parseBcaMutations } from '@/lib/import/bca-mutation'

const enc = (s: string) => new TextEncoder().encode(s)

describe('extractStatementRecords', () => {
  it('parses comma CSV', () => {
    const res = extractStatementRecords(enc('Tanggal,Mutasi\n01/09,"1,000.00 CR"'))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.records[0]!.cells).toEqual(['Tanggal', 'Mutasi'])
  })

  it('sniffs semicolon and tab delimiters', () => {
    const semi = extractStatementRecords(enc('Tanggal;Keterangan;Mutasi\n01/09;GAJI;100 CR'))
    expect(semi.ok && semi.records[0]!.cells).toEqual(['Tanggal', 'Keterangan', 'Mutasi'])
    const tab = extractStatementRecords(enc('Tanggal\tKeterangan\tMutasi\n01/09\tGAJI\t100 CR'))
    expect(tab.ok && tab.records[0]!.cells).toEqual(['Tanggal', 'Keterangan', 'Mutasi'])
  })

  it('parses the BCA ".xls" that is really an HTML table', () => {
    const html = `<html><body><table>
      <tr><td>No. Rekening</td><td>1234567890</td></tr>
      <tr><td>Tanggal</td><td>Keterangan</td><td>Cabang</td><td>Mutasi</td><td>Saldo</td></tr>
      <tr><td>01/09</td><td>TRSF E-BANKING CR</td><td>0000</td><td>100,000.00 CR</td><td>5,100,000.00</td></tr>
    </table></body></html>`
    const res = extractStatementRecords(enc(html))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    // Header is not the first row (preamble present); parseBcaMutations scans for it.
    const { rows, errors } = parseBcaMutations(res.records, 2025)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({
      mutationDate: '2025-09-01',
      amount: '100000.00',
      direction: 'in',
      balanceAfter: '5100000.00',
    })
  })

  it('decodes HTML entities inside cells', () => {
    const html = '<table><tr><td>Tanggal</td><td>Mutasi</td></tr><tr><td>01/09</td><td>50&nbsp;CR</td></tr></table>'
    const res = extractStatementRecords(enc(html))
    expect(res.ok && res.records[1]!.cells[1]).toBe('50 CR')
  })

  it('rejects a true binary .xls (OLE2) with guidance', () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00])
    const res = extractStatementRecords(ole)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/CSV/)
  })

  it('rejects an .xlsx (zip) with guidance', () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])
    const res = extractStatementRecords(zip)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toMatch(/xlsx/i)
  })

  it('rejects empty and oversize files', () => {
    expect(extractStatementRecords(new Uint8Array(0)).ok).toBe(false)
    const huge = new Uint8Array(STATEMENT_MAX_BYTES + 1)
    huge[0] = 0x61 // 'a' so it isn't caught as empty
    expect(extractStatementRecords(huge).ok).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { buildOrderId, toMidtransAmount } from '@/lib/domain/billing/order'

describe('order id Midtrans', () => {
  it('membentuk id yang stabil dari komponennya', () => {
    const id = buildOrderId('user_abc123', 1_788_500_000_000, 'deadbeefcafe')
    expect(id.startsWith('SUB-userabc123-')).toBe(true)
    expect(id.length).toBeLessThanOrEqual(50)
  })

  it('membuang karakter tak aman dari user id (mis. cuid dengan simbol)', () => {
    const id = buildOrderId('a.b-c:d', 1, 'xyz')
    expect(id).toMatch(/^SUB-[a-zA-Z0-9-]+$/)
  })

  it('tidak pernah melebihi 50 karakter walau masukan panjang', () => {
    const id = buildOrderId('x'.repeat(40), 999999999999, 'y'.repeat(40))
    expect(id.length).toBeLessThanOrEqual(50)
  })
})

describe('konversi jumlah Midtrans', () => {
  it('membuang desimal rupiah', () => {
    expect(toMidtransAmount('99000.00')).toBe(99000)
    expect(toMidtransAmount('990000.00')).toBe(990000)
  })
  it('membulatkan pecahan', () => {
    expect(toMidtransAmount('100.50')).toBe(101)
  })
  it('menolak nilai tak sah', () => {
    expect(() => toMidtransAmount('abc')).toThrow()
    expect(() => toMidtransAmount('-5')).toThrow()
  })
})

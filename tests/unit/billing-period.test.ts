import { describe, expect, it } from 'vitest'
import {
  accessState,
  addMonths,
  daysLeft,
  paidPeriod,
  trialPeriod,
} from '@/lib/domain/billing/period'

describe('penambahan bulan', () => {
  it('menjepit akhir bulan, tidak meluber', () => {
    expect(addMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe(
      '2026-02-28T00:00:00.000Z'
    )
  })
  it('menambah setahun sebagai 12 bulan', () => {
    expect(addMonths(new Date('2026-03-15T00:00:00Z'), 12).toISOString()).toBe(
      '2027-03-15T00:00:00.000Z'
    )
  })
})

describe('periode', () => {
  const now = new Date('2026-09-04T00:00:00Z')

  it('trial berakhir sekian hari kemudian', () => {
    expect(trialPeriod(now, 14).end.toISOString()).toBe('2026-09-18T00:00:00.000Z')
  })

  it('perpanjangan saat masih aktif menyambung dari akhir periode', () => {
    const currentEnd = new Date('2026-10-01T00:00:00Z')
    expect(paidPeriod(now, 'monthly', currentEnd).end.toISOString()).toBe(
      '2026-11-01T00:00:00.000Z'
    )
  })

  it('perpanjangan setelah kedaluwarsa dihitung dari sekarang', () => {
    const currentEnd = new Date('2026-08-01T00:00:00Z')
    expect(paidPeriod(now, 'monthly', currentEnd).end.toISOString()).toBe(
      '2026-10-04T00:00:00.000Z'
    )
  })
})

describe('keputusan akses', () => {
  const now = new Date('2026-09-04T00:00:00Z')
  const future = new Date('2026-09-20T00:00:00Z')
  const past = new Date('2026-09-01T00:00:00Z')

  it('tanpa langganan → none', () => {
    expect(accessState(null, now)).toBe('none')
  })
  it('trial berjalan → active', () => {
    expect(accessState({ status: 'trialing', currentPeriodEnd: future }, now)).toBe('active')
  })
  it('trial lewat tanggal → expired', () => {
    expect(accessState({ status: 'trialing', currentPeriodEnd: past }, now)).toBe('expired')
  })
  it('dibatalkan → expired walau tanggal masih ada', () => {
    expect(accessState({ status: 'canceled', currentPeriodEnd: future }, now)).toBe('expired')
  })
  it('sisa hari dihitung ke atas', () => {
    expect(daysLeft(future, now)).toBe(16)
    expect(daysLeft(past, now)).toBe(0)
  })
})

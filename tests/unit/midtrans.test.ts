import { describe, expect, it } from 'vitest'
import { mapMidtransStatus, grantsAccess } from '@/lib/domain/billing/midtrans-status'
import { verifyMidtransSignature } from '@/lib/security/midtrans-signature'
import crypto from 'crypto'

describe('pemetaan status Midtrans', () => {
  it('settlement dan capture (tanpa challenge) = paid', () => {
    expect(mapMidtransStatus({ transaction_status: 'settlement' })).toBe('paid')
    expect(mapMidtransStatus({ transaction_status: 'capture', fraud_status: 'accept' })).toBe(
      'paid'
    )
  })
  it('capture dengan challenge belum lunas', () => {
    expect(mapMidtransStatus({ transaction_status: 'capture', fraud_status: 'challenge' })).toBe(
      'pending'
    )
  })
  it('memetakan status akhir lainnya', () => {
    expect(mapMidtransStatus({ transaction_status: 'expire' })).toBe('expired')
    expect(mapMidtransStatus({ transaction_status: 'deny' })).toBe('failed')
    expect(mapMidtransStatus({ transaction_status: 'cancel' })).toBe('canceled')
  })
  it('hanya paid yang memberi akses', () => {
    expect(grantsAccess('paid')).toBe(true)
    expect(grantsAccess('pending')).toBe(false)
  })
})

describe('verifikasi tanda tangan Midtrans', () => {
  const serverKey = 'SB-Mid-server-CONTOH'
  const orderId = 'SUB-abc-123'
  const statusCode = '200'
  const grossAmount = '150000.00'
  const good = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex')

  it('menerima tanda tangan yang benar', () => {
    expect(
      verifyMidtransSignature({ orderId, statusCode, grossAmount, serverKey, signatureKey: good })
    ).toBe(true)
  })
  it('menolak tanda tangan palsu', () => {
    expect(
      verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount,
        serverKey,
        signatureKey: 'palsu',
      })
    ).toBe(false)
  })
  it('menolak bila jumlah diubah', () => {
    expect(
      verifyMidtransSignature({
        orderId,
        statusCode,
        grossAmount: '1.00',
        serverKey,
        signatureKey: good,
      })
    ).toBe(false)
  })
})

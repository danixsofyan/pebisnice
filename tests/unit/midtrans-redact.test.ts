import { describe, expect, it } from 'vitest'
import { redactMidtransPayload } from '@/lib/domain/billing/midtrans-redact'

describe('redaksi payload Midtrans', () => {
  it('menyimpan hanya field audit, membuang tanda tangan dan detail bank', () => {
    const raw = {
      order_id: 'SUB-1',
      transaction_id: 't-1',
      transaction_status: 'settlement',
      status_code: '200',
      payment_type: 'bank_transfer',
      gross_amount: '99000.00',
      fraud_status: 'accept',
      signature_key: 'RAHASIA-panjang-sha512',
      va_numbers: [{ bank: 'bca', va_number: '1234567890' }],
      permata_va_number: '9876543210',
      biller_code: '70012',
      bill_key: '000123',
    }
    const out = redactMidtransPayload(raw)

    expect(out.transaction_status).toBe('settlement')
    expect(out.gross_amount).toBe('99000.00')
    expect(out).not.toHaveProperty('signature_key')
    expect(out).not.toHaveProperty('va_numbers')
    expect(out).not.toHaveProperty('permata_va_number')
    expect(out).not.toHaveProperty('bill_key')
    expect(out).not.toHaveProperty('biller_code')
  })

  it('mengabaikan field yang tidak ada', () => {
    expect(redactMidtransPayload({ order_id: 'x' })).toEqual({ order_id: 'x' })
  })
})

import { describe, expect, it } from 'vitest'
import {
  teamInviteEmail,
  paymentConfirmedEmail,
  subscriptionExpiringEmail,
  passwordResetEmail,
  roleLabel,
} from '@/lib/email/templates'

describe('teamInviteEmail', () => {
  it('menyusun subject, teks, kredensial sementara, dan tombol', () => {
    const msg = teamInviteEmail({
      to: 'staf@toko.id',
      projectName: 'Toko Maju',
      role: 'cashier',
      loginUrl: 'https://app.pebisnice.my.id/login',
      tempPassword: 'Abcd-2345-Wxyz',
    })
    expect(msg.to).toBe('staf@toko.id')
    expect(msg.subject).toContain('Toko Maju')
    expect(msg.html).toContain('Toko Maju')
    expect(msg.html).toContain('Kasir')
    expect(msg.html).toContain('staf@toko.id')
    expect(msg.html).toContain('Abcd-2345-Wxyz')
    expect(msg.html).toContain('https://app.pebisnice.my.id/login')
    expect(msg.text).toContain('Abcd-2345-Wxyz')
  })

  it('meng-escape HTML pada nama toko untuk mencegah injeksi markup', () => {
    const msg = teamInviteEmail({
      to: 'x@y.id',
      projectName: '<img src=x onerror=alert(1)>',
      role: 'admin',
      loginUrl: 'https://app.pebisnice.my.id/login',
      tempPassword: 'Abcd-2345-Wxyz',
    })
    expect(msg.html).not.toContain('<img src=x')
    expect(msg.html).toContain('&lt;img')
  })

  it('menyusun email konfirmasi pembayaran dengan plan, nominal, dan masa aktif', () => {
    const msg = paymentConfirmedEmail({
      to: 'owner@toko.id',
      name: 'Budi',
      planName: 'Bulanan',
      amountLabel: 'Rp99.000',
      activeUntil: '30 Oktober 2026',
    })
    expect(msg.subject).toContain('Bulanan')
    expect(msg.html).toContain('Budi')
    expect(msg.html).toContain('Bulanan')
    expect(msg.html).toContain('Rp99.000')
    expect(msg.html).toContain('30 Oktober 2026')
  })

  it('menyusun email pengingat langganan dengan sisa hari dan tanggal berakhir', () => {
    const msg = subscriptionExpiringEmail({
      to: 'owner@toko.id',
      name: 'Sari',
      planName: 'Tahunan',
      daysLeft: 3,
      endsAt: '9 September 2026',
    })
    expect(msg.subject).toContain('3 hari')
    expect(msg.subject).toContain('Tahunan')
    expect(msg.html).toContain('Sari')
    expect(msg.html).toContain('9 September 2026')
    expect(msg.text).toContain('9 September 2026')
  })

  it('menyusun email reset password dengan tautan', () => {
    const msg = passwordResetEmail({
      to: 'user@toko.id',
      name: 'Andi',
      resetUrl: 'https://app.pebisnice.my.id/reset-password?token=abc123',
    })
    expect(msg.subject).toMatch(/password/i)
    expect(msg.html).toContain('Andi')
    expect(msg.html).toContain('https://app.pebisnice.my.id/reset-password?token=abc123')
    expect(msg.text).toContain('token=abc123')
  })

  it('memetakan peran ke label Indonesia', () => {
    expect(roleLabel('finance')).toBe('Keuangan')
    expect(roleLabel('production')).toBe('Produksi')
    expect(roleLabel('unknown')).toBe('unknown')
  })
})

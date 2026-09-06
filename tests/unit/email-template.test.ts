import { describe, expect, it } from 'vitest'
import { teamInviteEmail, roleLabel } from '@/lib/email/templates'

describe('teamInviteEmail', () => {
  it('menyusun subject, teks, dan tombol dengan nama toko, peran, dan tautan', () => {
    const msg = teamInviteEmail({
      to: 'staf@toko.id',
      projectName: 'Toko Maju',
      role: 'cashier',
      loginUrl: 'https://app.pebisnice.my.id/login',
    })
    expect(msg.to).toBe('staf@toko.id')
    expect(msg.subject).toContain('Toko Maju')
    expect(msg.html).toContain('Toko Maju')
    expect(msg.html).toContain('Kasir')
    expect(msg.html).toContain('https://app.pebisnice.my.id/login')
    expect(msg.text).toContain('https://app.pebisnice.my.id/login')
  })

  it('meng-escape HTML pada nama toko untuk mencegah injeksi markup', () => {
    const msg = teamInviteEmail({
      to: 'x@y.id',
      projectName: '<img src=x onerror=alert(1)>',
      role: 'admin',
      loginUrl: 'https://app.pebisnice.my.id/login',
    })
    expect(msg.html).not.toContain('<img src=x')
    expect(msg.html).toContain('&lt;img')
  })

  it('memetakan peran ke label Indonesia', () => {
    expect(roleLabel('finance')).toBe('Keuangan')
    expect(roleLabel('production')).toBe('Produksi')
    expect(roleLabel('unknown')).toBe('unknown')
  })
})

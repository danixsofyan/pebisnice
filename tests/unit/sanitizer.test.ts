import { describe, expect, it } from 'vitest'
import { isValidUuid, sanitizeText, sanitizeUrl } from '@/lib/security/sanitizer'

describe('sanitizeText', () => {
  it('membuang tag HTML tetapi mempertahankan isinya', () => {
    expect(sanitizeText('<b>Toko</b> Bunga')).toBe('Toko Bunga')
  })

  it('menetralkan payload script', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('')
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('membuang spasi di tepi dan karakter kontrol', () => {
    expect(sanitizeText('  Toko Bunga  ')).toBe('Toko Bunga')
    expect(sanitizeText('Toko\u0000Bunga\u0007')).toBe('TokoBunga')
  })
})

describe('sanitizeUrl', () => {
  it('menerima http dan https', () => {
    expect(sanitizeUrl('https://pebisnice.id/a')).toBe('https://pebisnice.id/a')
  })

  it('menolak skema berbahaya', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('data:text/html,<script>')).toBeNull()
    expect(sanitizeUrl('bukan url')).toBeNull()
  })
})

describe('isValidUuid', () => {
  it('menerima UUID v4 dan menolak selainnya', () => {
    expect(isValidUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true)
    expect(isValidUuid('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(false)
    expect(isValidUuid("' OR 1=1 --")).toBe(false)
  })
})

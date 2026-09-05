import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/services/online-order.service'

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Toko Dani')).toBe('toko-dani')
  })
  it('collapses symbols and trims dashes', () => {
    expect(slugify('  Kopi & Susu!!  ')).toBe('kopi-susu')
    expect(slugify('--Warung--')).toBe('warung')
  })
  it('strips accents', () => {
    expect(slugify('Kafé Créme')).toBe('kafe-creme')
  })
  it('caps length and never ends with a dash', () => {
    const s = slugify('a'.repeat(60))
    expect(s.length).toBeLessThanOrEqual(40)
    expect(s.endsWith('-')).toBe(false)
  })
  it('empty when no alphanumerics', () => {
    expect(slugify('!!!')).toBe('')
  })
})

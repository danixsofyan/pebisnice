import { describe, expect, it } from 'vitest'
import { scorePassword } from '@/lib/auth/password-strength'

describe('scorePassword', () => {
  it('kosong = 0', () => {
    expect(scorePassword('').score).toBe(0)
  })

  it('pendek selalu lemah walau beragam', () => {
    expect(scorePassword('Ab1!').score).toBe(1)
  })

  it('pola umum dianggap lemah', () => {
    expect(scorePassword('password').score).toBe(1)
    expect(scorePassword('12345678').score).toBe(1)
    expect(scorePassword('aaaaaaaa').score).toBe(1)
  })

  it('panjang + beragam makin kuat', () => {
    expect(scorePassword('Kelinci9').score).toBeGreaterThanOrEqual(2)
    expect(scorePassword('Kelinci912345').score).toBeGreaterThanOrEqual(3)
    expect(scorePassword('Kelinci12!@#Xy').score).toBe(4)
  })

  it('kata umum tetap dianggap lemah walau ada angka', () => {
    expect(scorePassword('rahasia123').score).toBe(1)
  })

  it('selalu menghasilkan label yang sesuai', () => {
    expect(scorePassword('Kelinci12!@#Xy').label).toBe('Sangat kuat')
  })
})

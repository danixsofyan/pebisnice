import { describe, expect, it } from 'vitest'
import {
  generateTempPassword,
  hashPassword,
  passwordPolicyError,
  verifyPassword,
} from '@/lib/auth/password'

describe('password hashing', () => {
  it('hash lalu verify cocok, dan menolak yang salah', async () => {
    const hash = await hashPassword('Rahasia123')
    expect(hash).not.toContain('Rahasia123')
    expect(await verifyPassword('Rahasia123', hash)).toBe(true)
    expect(await verifyPassword('salah', hash)).toBe(false)
  })

  it('verify aman untuk hash kosong', async () => {
    expect(await verifyPassword('apa pun', '')).toBe(false)
  })
})

describe('passwordPolicyError', () => {
  it('menolak yang terlalu pendek atau kurang ragam', () => {
    expect(passwordPolicyError('short1A')).toMatch(/8 karakter/)
    expect(passwordPolicyError('semuahurufkecil1')).toMatch(/huruf besar/)
    expect(passwordPolicyError('SEMUABESAR123')).toMatch(/huruf besar/)
  })
  it('menerima password yang memenuhi syarat', () => {
    expect(passwordPolicyError('Rahasia123')).toBeNull()
  })
})

describe('generateTempPassword', () => {
  it('menghasilkan panjang cukup, tanpa karakter ambigu, dan acak', () => {
    const a = generateTempPassword()
    const b = generateTempPassword()
    expect(a).not.toBe(b)
    expect(a.replace(/-/g, '').length).toBeGreaterThanOrEqual(12)
    expect(a).not.toMatch(/[0O1lI]/)
  })
})

import { beforeAll, describe, expect, it } from 'vitest'
import { blindIndex, decryptToken, encryptToken } from '@/lib/encryption'

beforeAll(() => {
  process.env.ENCRYPTION_SECRET_KEY = 'test-secret-key-for-encryption-unit-tests'
})

describe('encryption', () => {
  it('round-trips a value through encrypt/decrypt', () => {
    const plain = '08123456789'
    const cipher = encryptToken(plain)
    expect(cipher).not.toContain(plain)
    expect(cipher.split(':')).toHaveLength(3)
    expect(decryptToken(cipher)).toBe(plain)
  })

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'))
  })

  it('blindIndex is deterministic and hides the input', () => {
    const a = blindIndex('08123456789')
    const b = blindIndex('08123456789')
    expect(a).toBe(b)
    expect(a).not.toContain('0812')
    expect(a).not.toBe(blindIndex('08129999999'))
  })
})

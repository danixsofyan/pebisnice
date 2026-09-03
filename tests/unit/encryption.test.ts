import { describe, expect, it } from 'vitest'
import { decryptToken, encryptToken } from '@/lib/encryption'

describe('encryptToken / decryptToken', () => {
  it('mengembalikan plaintext yang sama setelah round-trip', () => {
    const plain = 'shopee-access-token-abc123'
    expect(decryptToken(encryptToken(plain))).toBe(plain)
  })

  it('menghasilkan ciphertext berbeda untuk plaintext yang sama (IV acak)', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'))
  })

  it('menangani string kosong dan karakter non-ASCII', () => {
    expect(decryptToken(encryptToken(''))).toBe('')

    const nonAscii = 'token éè 中文'
    expect(decryptToken(encryptToken(nonAscii))).toBe(nonAscii)
  })

  it('menolak ciphertext dengan format salah', () => {
    expect(() => decryptToken('bukan-format-valid')).toThrow('Format ciphertext tidak valid')
  })

  it('menolak ciphertext yang auth tag-nya dirusak', () => {
    const [iv, , payload] = encryptToken('rahasia').split(':')
    const forgedTag = Buffer.alloc(16).toString('base64')
    expect(() => decryptToken(`${iv}:${forgedTag}:${payload}`)).toThrow()
  })
})

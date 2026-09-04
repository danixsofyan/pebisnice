import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT = 'marketprofit-v1'

let cachedKey: Buffer | null = null

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey
  const secret = process.env.ENCRYPTION_SECRET_KEY
  if (!secret) throw new Error('ENCRYPTION_SECRET_KEY wajib di-set')
  cachedKey = scryptSync(secret, SALT, KEY_LENGTH)
  return cachedKey
}

export function encryptToken(plainText: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])

  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decryptToken(cipherText: string): string {
  const parts = cipherText.split(':')
  if (parts.length !== 3) throw new Error('Format ciphertext tidak valid')

  const [ivB64, authTagB64, encryptedB64] = parts as [string, string, string]
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

// Deterministic keyed hash for exact-match search/dedup on an encrypted field (a blind
// index), so we never store or query the plaintext. Not reversible; a separate salt keeps
// it independent from the encryption key.
export function blindIndex(value: string): string {
  const secret = process.env.ENCRYPTION_SECRET_KEY
  if (!secret) throw new Error('ENCRYPTION_SECRET_KEY wajib di-set')
  return createHmac('sha256', `${secret}:blind-index-v1`).update(value).digest('hex')
}

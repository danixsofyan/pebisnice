import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT = 'marketprofit-v1'

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, KEY_LENGTH)
}

const ENCRYPTION_KEY = deriveKey(
  process.env.ENCRYPTION_SECRET_KEY ??
    (() => {
      throw new Error('ENCRYPTION_SECRET_KEY wajib di-set')
    })()
)

export function encryptToken(plainText: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)

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

  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

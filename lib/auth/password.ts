import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'

// Password hashing for email/password login. bcrypt with cost 12 — pure-JS (bcryptjs) so it needs
// no native build on Vercel. Node-only; never import from edge/middleware code.

const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

// Human-typable temporary password for invites: no ambiguous characters (0/O, 1/l/I), grouped for
// readability. Generated with a CSPRNG.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generateTempPassword(length = 12): string {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  // Group as XXXX-XXXX-XXXX for legibility when 12 chars.
  return out.replace(/(.{4})(?=.)/g, '$1-')
}

// Minimum policy for a user-chosen password. Kept simple and enforced server-side.
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter'
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password harus memuat huruf besar, huruf kecil, dan angka'
  }
  return null
}

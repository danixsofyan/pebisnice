export { isValidUuid } from './uuid'

/**
 * Sanitasi teks polos tanpa ketergantungan DOM.
 *
 * Sebelumnya memakai DOMPurify, yang di server menyeret `jsdom` — dan jsdom
 * berulang kali membawa sub-dependensi ESM-only yang tak bisa di-`require()`
 * oleh bundel server Next, sehingga produksi tumbang (ERR_REQUIRE_ESM). Field
 * yang kita bersihkan hanyalah teks polos (nama, catatan, SKU), jadi DOM penuh
 * berlebihan; implementasi kecil ini menghapus seluruh markup dan tak menambah
 * ketergantungan apa pun.
 *
 * Isi <script>/<style> dibuang berikut isinya; tag lain dibuang tetapi teksnya
 * dipertahankan. Diulang sampai stabil agar tag yang disusun ulang
 * (`<scr<script>ipt>`) tidak lolos.
 */
const SCRIPT_STYLE = /<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi
const TAG = /<[^>]*>/g
// Dibangun dari string agar byte kontrol tak tertulis mentah di berkas sumber.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]', 'g')

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return ''

  let clean = input
  let previous: string
  do {
    previous = clean
    clean = clean.replace(SCRIPT_STYLE, '').replace(TAG, '')
  } while (clean !== previous)

  return clean.replace(CONTROL_CHARS, '').trim()
}

/** Hanya mengizinkan URL http/https; menolak skema seperti javascript: dan data:. */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    return url.toString()
  } catch {
    return null
  }
}

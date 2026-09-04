/**
 * Validasi UUID tanpa dependensi apa pun.
 *
 * Sengaja dipisah dari `sanitizer.ts`: modul itu mengimpor DOMPurify yang di
 * server menarik seluruh implementasi DOM (jsdom). Mengambil satu regex dari
 * sana berarti setiap jalur yang menyentuhnya — termasuk lapisan database —
 * ikut memuat jsdom, dan pernah membuat runtime Vercel gagal dengan
 * ERR_REQUIRE_ESM.
 */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(value: string): boolean {
  return UUID_V4.test(value)
}

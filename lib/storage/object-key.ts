import { isValidUuid } from '@/lib/security/uuid'

/**
 * Konvensi kunci objek: `<projectId>/<resource>/<id>.<ext>`.
 *
 * Prefiks `projectId` bukan sekadar penataan folder — itu penegak batas
 * antar-tenant. Proxy hanya melayani objek yang prefiksnya cocok dengan project
 * pemohon, sehingga menebak kunci milik project lain tidak cukup untuk
 * membacanya.
 */

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i
const SAFE_EXT = /^[a-z0-9]+$/i

export interface ObjectKeyParts {
  projectId: string
  resource: string
  id: string
  ext: string
}

export function buildObjectKey(parts: ObjectKeyParts): string {
  if (!isValidUuid(parts.projectId)) {
    throw new Error('projectId bukan UUID yang sah')
  }
  if (!SAFE_SEGMENT.test(parts.resource)) {
    throw new Error('resource hanya boleh huruf kecil, angka, dan tanda hubung')
  }
  if (!SAFE_ID.test(parts.id)) {
    throw new Error('id objek mengandung karakter yang tidak diizinkan')
  }
  if (!SAFE_EXT.test(parts.ext)) {
    throw new Error('ekstensi tidak sah')
  }

  return `${parts.projectId}/${parts.resource}/${parts.id}.${parts.ext.toLowerCase()}`
}

/**
 * Menyusun kembali kunci dari potongan path proxy, dengan menolak segala yang
 * bisa keluar dari ruang milik satu project (traversal, prefiks kosong).
 * Mengembalikan `null` bila kunci tidak sah — pemanggil memperlakukannya sebagai
 * 404, bukan error.
 */
export function objectKeyFromSegments(segments: string[], projectId: string): string | null {
  if (segments.length < 2) return null
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null
  }
  if (segments.some((segment) => segment.includes('/') || segment.includes('\\'))) {
    return null
  }
  if (segments[0] !== projectId) return null

  return segments.join('/')
}

/**
 * Apakah sebuah kunci utuh berada dalam ruang milik satu project. Dipakai
 * sebelum menghapus objek atas permintaan pengguna, agar tak seorang pun bisa
 * menghapus berkas project lain dengan menebak kuncinya.
 */
export function objectKeyBelongsToProject(key: string, projectId: string): boolean {
  if (key.includes('..') || key.includes('\\')) return false
  return key.startsWith(`${projectId}/`)
}

/** URL yang dipakai klien: relatif, satu origin dengan aplikasi. */
export function fileProxyUrl(key: string): string {
  return `/api/v1/files/${key.split('/').map(encodeURIComponent).join('/')}`
}

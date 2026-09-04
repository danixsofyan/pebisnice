import type { ListedObject } from '@/lib/storage/object-store'

/**
 * Aturan memilih berkas foto produk yatim — objek yang tak lagi dirujuk baris
 * produk mana pun.
 *
 * Dipisah dari IO supaya bisa diuji tanpa menyentuh bucket atau database.
 * Dua penjaga penting:
 *
 *   - hanya menyasar kunci berpola foto produk, tak pernah objek lain,
 *   - hanya yang lebih tua dari ambang usia, supaya foto yang baru diunggah dan
 *     masih menunggu form disimpan tidak ikut terhapus.
 */

const PRODUCT_IMAGE_KEY = /^[0-9a-f-]{36}\/products\/[^/]+$/i

export function isProductImageKey(key: string): boolean {
  return PRODUCT_IMAGE_KEY.test(key)
}

export interface OrphanScanInput {
  objects: ListedObject[]
  referencedKeys: Set<string>
  now: Date
  minAgeMs: number
}

export function selectOrphans(input: OrphanScanInput): string[] {
  const threshold = input.now.getTime() - input.minAgeMs

  return (
    input.objects
      .filter((object) => isProductImageKey(object.key))
      .filter((object) => !input.referencedKeys.has(object.key))
      // Tanpa tanggal, usia tak bisa dipastikan — biarkan, jangan hapus.
      .filter((object) => object.lastModified !== null && object.lastModified.getTime() < threshold)
      .map((object) => object.key)
  )
}

/** Ambang usia bawaan: 24 jam. Cukup lama agar upload in-flight aman. */
export const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000

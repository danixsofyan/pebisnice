/**
 * Membangun URL objek publik Supabase Storage.
 *
 * Host-nya berasal dari `NEXT_PUBLIC_SUPABASE_STORAGE_HOST` — variabel yang
 * sama dengan yang dipakai `next.config.ts` dan CSP, sehingga ganti project
 * Supabase cukup mengubah satu tempat dan tidak perlu menyentuh kode.
 *
 * Mengembalikan `null` bila variabelnya belum diisi, supaya halaman bisa
 * memilih tampilan pengganti alih-alih menampilkan gambar rusak.
 */
export function publicStorageUrl(objectPath: string): string | null {
  const host = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST
  if (!host) return null

  const path = objectPath.replace(/^\/+/, '')
  return `https://${host}/storage/v1/object/public/${path}`
}

/** Latar halaman login. Path-nya konten, host-nya konfigurasi. */
export const LOGIN_BACKGROUND_PATH = 'assets/assets/2b5079f4-4ddd-433b-a936-fc8f7dea9df0_3840w.webp'

export function loginBackgroundUrl(): string | null {
  return publicStorageUrl(LOGIN_BACKGROUND_PATH)
}

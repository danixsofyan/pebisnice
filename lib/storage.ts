/**
 * Membangun URL objek publik Supabase Storage.
 *
 * Host-nya berasal dari `NEXT_PUBLIC_SUPABASE_STORAGE_HOST` — variabel yang
 * sama dengan yang dipakai `next.config.ts` dan CSP, sehingga ganti project
 * Supabase cukup mengubah satu tempat dan tidak perlu menyentuh kode.
 *
 * Mengembalikan `null` bila variabelnya belum diisi, supaya pemanggil bisa
 * memilih tampilan pengganti alih-alih menampilkan gambar rusak.
 *
 * Dipakai untuk konten yang diunggah pengguna (foto produk, lampiran). Aset
 * dekoratif aplikasi TIDAK memakai ini — lihat `LOGIN_BACKGROUND` di bawah.
 */
export function publicStorageUrl(objectPath: string): string | null {
  const host = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST
  if (!host) return null

  const path = objectPath.replace(/^\/+/, '')
  return `https://${host}/storage/v1/object/public/${path}`
}

/**
 * Latar halaman login, disimpan di dalam repo.
 *
 * Sebelumnya diambil dari Supabase Storage, yang membuatnya bergantung pada
 * project Supabase tertentu: saat database berpindah project, gambarnya ikut
 * hilang. Aset dekoratif yang tidak pernah berubah lebih tepat ikut kode —
 * tidak butuh env, tidak putus saat infrastruktur berpindah, dan dilayani CDN
 * Vercel.
 */
export const LOGIN_BACKGROUND = '/login-background.webp'

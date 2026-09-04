/**
 * Membangun URL objek publik untuk berkas yang diunggah pengguna.
 *
 * Yang disimpan di environment adalah base URL utuh, bukan sekadar nama host.
 * Sebelumnya kode menyusun sendiri `/storage/v1/object/public/...` — bentuk
 * jalur milik Supabase — sehingga pindah ke penyedia lain (Cloudflare R2,
 * MinIO, Wasabi) berarti menyunting kode, bukan mengubah konfigurasi. Dengan
 * base URL, perbedaan bentuk jalur antar penyedia hilang dari kode:
 *
 *   Supabase  https://<ref>.supabase.co/storage/v1/object/public
 *   R2        https://pub-<id>.r2.dev
 *   MinIO     https://minio.example.com/<bucket>
 *
 * Mengembalikan `null` bila variabelnya belum diisi, supaya pemanggil bisa
 * memilih tampilan pengganti alih-alih menampilkan gambar rusak.
 *
 * Aset dekoratif aplikasi TIDAK memakai ini — lihat `LOGIN_BACKGROUND`.
 */
function resolveBase(): URL | null {
  const base = process.env.NEXT_PUBLIC_STORAGE_BASE_URL
  if (!base) return null

  try {
    return new URL(base)
  } catch {
    return null
  }
}

export function publicStorageUrl(objectPath: string): string | null {
  const base = resolveBase()
  if (!base) return null

  return `${base.href.replace(/\/+$/, '')}/${objectPath.replace(/^\/+/, '')}`
}

/**
 * Nama host dari base URL storage.
 *
 * `next.config.ts` dan CSP butuh host telanjang, bukan URL. Diturunkan dari
 * variabel yang sama agar keduanya tidak bisa berbeda.
 *
 * Nilai yang tidak sah diperlakukan sebagai belum diisi: build yang gagal
 * karena satu variabel salah ketik lebih merugikan daripada gambar yang tidak
 * tampil.
 */
export function storageHostname(): string | null {
  return resolveBase()?.hostname ?? null
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

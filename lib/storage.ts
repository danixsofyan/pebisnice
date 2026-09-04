/**
 * Titik masuk lama untuk aset. Model URL publik sudah dibuang: bucket kini
 * privat dan berkas unggahan hanya bisa dibaca lewat proxy beracuan-tenant di
 * `app/api/v1/files/[...key]`. Lihat `lib/storage/object-key.ts` untuk membentuk
 * URL proxy, dan `lib/storage/object-store.ts` untuk baca/tulis objek.
 */

export { fileProxyUrl } from '@/lib/storage/object-key'

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

# Postur Keamanan

Dokumen ini menggambarkan kontrol yang sudah ada dan yang masih perlu tindakan.
Bukan sertifikasi; audit pihak ketiga tetap disarankan sebelum menyimpan data
pelanggan dalam skala besar.

## Sudah diterapkan

### Transport & header
- HTTPS dipaksa; HSTS `max-age=31536000; includeSubDomains; preload`.
- CSP ketat: `default-src 'self'`, script pakai nonce per-request + `strict-dynamic`,
  `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` menutup camera/mic/geolocation/usb/bluetooth/payment.
- `X-Powered-By` dimatikan (mengurangi info-disclosure).

### Autentikasi & sesi
- Auth.js (Google OAuth), sesi JWT bertanda tangan `AUTH_SECRET`; cookie
  `__Secure-authjs.session-token` HttpOnly + Secure + SameSite.
- Gerbang berlapis: login -> langganan -> project. Area admin memakai `notFound()`
  untuk non-admin agar keberadaannya tidak bocor.

### Otorisasi
- RBAC per peran (`ROLE_PERMISSIONS`); cek permission di setiap service.
- Isolasi tenant: setiap tabel bisnis ber-`project_id`, query dibungkus `withTenant`
  yang menyetel `app.current_project_id`; akses cabang dibatasi `requireBranchAccess`.
- Kolom biaya (HPP) tak pernah dikembalikan ke peran tanpa `cost:view`.
- Berkas unggahan hanya lewat proxy beracuan-tenant; kunci lintas-tenant -> 404.

### Integritas pembayaran
- Webhook Midtrans diverifikasi tanda tangan sha512 (perbandingan konstan-waktu).
- Jumlah dicocokkan dengan yang disimpan; transisi "lunas" atomik (idempoten).
- Endpoint cron dijaga `CRON_SECRET`.

### Input & keluaran
- Validasi zod di setiap server action; teks disanitasi sebelum disimpan.
- Rate limiting per-IP di proxy.

### Privasi (UU PDP)
- Minimalkan data: payload notifikasi Midtrans hanya disimpan sebagian
  (tanpa `signature_key`, `va_numbers`, detail bank).
- Token pihak ketiga dienkripsi AES-256-GCM (`lib/encryption.ts`).
- Log m-redaksi kredensial dan artefak sensitif (password, token, cookie,
  authorization, signature_key, va_numbers, card/cvv/pin).
- Enkripsi at-rest oleh Supabase; TLS in-transit.

### Auditabilitas
- `audit_logs` immutable (trigger DB menolak UPDATE/DELETE) merekam
  aksi/resource/aktor/IP/user-agent — untuk sengketa transaksi.
- Log JSON terstruktur (pino) dengan `requestId` berkorelasi lintas proxy->action.

## Perlu tindakan

### 1. Aktifkan RLS secara nyata — tinggal ganti DATABASE_URL
Role terbatas `pebisnice_app` (NOBYPASSRLS) sudah dibuat di produksi berikut
seluruh grant dan policy pendukung (lihat `supabase/rls-role.sql`). Sudah diuji
end-to-end sebagai role tersebut: login/penemuan tenant, tulis bisnis lewat
`withTenant`, insert audit, dan cron pembersih — semua jalan; tabel bisnis
terisolasi (tanpa konteks 0 baris, konteks salah 0 baris). Aplikasi produksi
saat ini MASIH memakai role `postgres` (bypass RLS), jadi policy belum aktif.

Untuk mengaktifkan: ganti `DATABASE_URL` di Vercel agar terhubung sebagai
`pebisnice_app` (username pooler `pebisnice_app.<ref>`), lalu redeploy. Untuk
membatalkan, kembalikan `DATABASE_URL` yang lama. Tidak ada perubahan skema, jadi
rollback instan.

### 2. Operasional
- Rotasi berkala `AUTH_SECRET`, `CRON_SECRET`, kredensial DB & storage.
- Jalankan `pnpm audit` di CI; pantau CVE dependensi.
- Pertimbangkan 2FA untuk akun admin platform.
- Uji penetrasi & pemindaian ZAP terjadwal sebelum rilis besar.

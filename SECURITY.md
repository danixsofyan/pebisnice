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

### 1. Aktifkan RLS secara nyata (prioritas tertinggi)
Kebijakan RLS sudah ada TETAPI inert: aplikasi terhubung sebagai role `postgres`
yang mem-bypass RLS. Isolasi tenant kini bertumpu pada lapisan aplikasi saja.
Untuk menjadikan RLS sebagai lapis pertahanan kedua, buat role terbatas:

```sql
CREATE ROLE pebisnice_app WITH LOGIN PASSWORD '<kuat>' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO pebisnice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pebisnice_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pebisnice_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pebisnice_app;
```
Lalu ganti `DATABASE_URL` agar terhubung sebagai role ini, dan uji seluruh alur
sebelum dipromosikan. Harus diuji hati-hati; salah privilege dapat menghentikan
aplikasi.

### 2. Operasional
- Rotasi berkala `AUTH_SECRET`, `CRON_SECRET`, kredensial DB & storage.
- Jalankan `pnpm audit` di CI; pantau CVE dependensi.
- Pertimbangkan 2FA untuk akun admin platform.
- Uji penetrasi & pemindaian ZAP terjadwal sebelum rilis besar.

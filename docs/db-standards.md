# Database Standards — Pebisnice

**Go-to-Production (GTP) · PostgreSQL 15+**
Version 1.0 · Referensi: Google, Stripe, Shopify, GitHub Engineering Standards

Standar ini mengikat seluruh perubahan skema Pebisnice. Penyimpangan yang masih ada
di skema v1.0 dan rencana perbaikannya tercatat di [PLAN.md](./PLAN.md) §3.5.

Catatan penerapan di Pebisnice:

- Primary key memakai `UUID` (lihat §4 — ID tampil di URL publik), bukan `BIGSERIAL`.
- Kolom `created_by` / `updated_by` bertipe `TEXT` mengikuti `users.id` bawaan Auth.js.

---

## Daftar Isi

1. [Naming Conventions](#1-naming-conventions)
2. [Tipe Data](#2-tipe-data)
3. [Struktur Kolom Wajib](#3-struktur-kolom-wajib)
4. [Primary Key Strategy](#4-primary-key-strategy)
5. [Foreign Key & Relasi](#5-foreign-key--relasi)
6. [Indexing Strategy](#6-indexing-strategy)
7. [Constraint & Validasi](#7-constraint--validasi)
8. [ENUM & Lookup Types](#8-enum--lookup-types)
9. [Soft Delete](#9-soft-delete)
10. [Audit Trail](#10-audit-trail)
11. [Security Standards](#11-security-standards)
12. [Performance Standards](#12-performance-standards)
13. [Migration Standards](#13-migration-standards)
14. [Monitoring & Observability](#14-monitoring--observability)
15. [Checklist GTP](#15-checklist-gtp)

---

## 1. Naming Conventions

### Aturan Dasar

| Aspek      | Standar                          | Contoh Benar              | Contoh Salah                   |
| ---------- | -------------------------------- | ------------------------- | ------------------------------ |
| Case       | `snake_case` lowercase           | `user_profiles`           | `UserProfiles`, `userProfiles` |
| Nama tabel | Plural noun                      | `users`, `payments`       | `user`, `payment`              |
| Nama kolom | Singular, deskriptif             | `first_name`, `amount`    | `nm`, `jml`, `val`             |
| Bahasa     | English konsisten                | `name`, `address`         | `nama`, `alamat`               |
| Singkatan  | Hindari kecuali standar industri | `id`, `url`, `ip_address` | `usr_id`, `amt`, `addr`        |

### Konvensi Prefix/Suffix per Tipe Kolom

| Tipe Kolom          | Konvensi                         | Contoh                                  |
| ------------------- | -------------------------------- | --------------------------------------- |
| Primary key         | `id`                             | `id`                                    |
| Foreign key         | `{entity}_id`                    | `user_id`, `company_id`                 |
| Boolean             | `is_`, `has_`, `can_`            | `is_active`, `has_paid`, `can_retry`    |
| Timestamp           | `_at` (TIMESTAMPTZ)              | `created_at`, `paid_at`, `expired_at`   |
| Tanggal saja        | `_date` (DATE)                   | `birth_date`, `start_date`              |
| Jumlah/uang         | `amount`, `total_`, `_count`     | `amount`, `total_amount`, `retry_count` |
| Status/state        | `_status`, atau ENUM langsung    | `payment_status`, `status`              |
| JSON/metadata       | `_data`, `_metadata`, `_payload` | `extra_data`, `pg_response`             |
| URL/path            | `_url`, `_path`                  | `avatar_url`, `file_path`               |
| Referensi eksternal | `_ref`, `_ref_no`, `_code`       | `internal_ref_no`, `pg_transaction_id`  |

### Penamaan Index & Constraint

```sql
-- Index biasa
idx_{table}_{column(s)}
CREATE INDEX idx_users_company_id ON users(company_id);

-- Index unik
uix_{table}_{column(s)}
CREATE UNIQUE INDEX uix_users_email ON users(email) WHERE deleted_at IS NULL;

-- Index parsial (partial index) — wajib untuk tabel besar
CREATE INDEX idx_payments_status ON payments(status) WHERE deleted_at IS NULL;

-- Foreign key constraint
fk_{table}_{referenced_table}
ALTER TABLE payments ADD CONSTRAINT fk_payments_subscriptions
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- Check constraint
chk_{table}_{rule}
ALTER TABLE payments ADD CONSTRAINT chk_payments_amount CHECK (amount > 0);

-- Unique constraint
uq_{table}_{column(s)}
ALTER TABLE contacts ADD CONSTRAINT uq_contacts_user_type_value UNIQUE (user_id, type, value);
```

---

## 2. Tipe Data

### Referensi Tipe Data Standar

| Kebutuhan                    | Tipe PostgreSQL            | Catatan                                 |
| ---------------------------- | -------------------------- | --------------------------------------- |
| ID integer sekuensial        | `BIGSERIAL`                | Untuk tabel internal volume tinggi      |
| ID terdistribusi             | `UUID` (gen_random_uuid()) | Untuk API publik, microservices         |
| Teks pendek terstruktur      | `VARCHAR(n)`               | Tentukan panjang maksimal               |
| Teks panjang bebas           | `TEXT`                     | Tidak perlu tentukan panjang            |
| Uang / finansial             | `NUMERIC(18,2)`            | **JANGAN** pakai FLOAT atau DOUBLE      |
| Boolean                      | `BOOLEAN`                  | **JANGAN** pakai INTEGER 0/1            |
| Waktu + timezone             | `TIMESTAMPTZ`              | **Selalu** pakai, bukan TIMESTAMP biasa |
| Tanggal saja                 | `DATE`                     | Untuk birth_date, expiry_date, dll      |
| IP Address                   | `INET`                     | Mendukung IPv4 & IPv6, validasi native  |
| JSON terstruktur             | `JSONB`                    | Untuk metadata, bisa di-index           |
| Kode mata uang               | `CHAR(3)`                  | ISO 4217: 'IDR', 'USD', 'SGD'           |
| Angka desimal presisi tinggi | `NUMERIC(p,s)`             | Tentukan presisi & skala                |
| Counter/bilangan bulat kecil | `INTEGER`                  | Untuk count, port, sort_order           |
| Teks terenkripsi             | `TEXT` atau `BYTEA`        | Simpan hasil enkripsi, bukan plaintext  |

### Aturan NUMERIC untuk Uang

```sql
-- Benar
amount          NUMERIC(18, 2)  -- max 9.999.999.999.999.999,99
exchange_rate   NUMERIC(10, 6)  -- untuk kurs dengan presisi tinggi

-- Salah — jangan pakai ini untuk uang
amount          FLOAT           -- floating point error!
amount          DOUBLE PRECISION -- sama saja, ada rounding error
amount          REAL            -- presisi rendah
```

---

## 3. Struktur Kolom Wajib

### Setiap tabel WAJIB memiliki kolom berikut:

```sql
-- Kolom wajib minimal
id          BIGSERIAL / UUID    PRIMARY KEY,
is_active   BOOLEAN             NOT NULL DEFAULT TRUE,
created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
deleted_at  TIMESTAMPTZ,                               -- soft delete
created_by  BIGINT              REFERENCES users(id) ON DELETE SET NULL,
updated_by  BIGINT              REFERENCES users(id) ON DELETE SET NULL
```

### Kolom opsional tapi direkomendasikan untuk tabel penting:

```sql
-- Untuk tabel yang butuh audit ketat (payments, subscriptions)
approved_at     TIMESTAMPTZ,
approved_by     BIGINT          REFERENCES users(id) ON DELETE SET NULL,
rejected_at     TIMESTAMPTZ,
rejected_by     BIGINT          REFERENCES users(id) ON DELETE SET NULL,
rejection_reason TEXT
```

### Trigger auto-update `updated_at`:

```sql
-- Buat sekali, gunakan di semua tabel
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply ke setiap tabel
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
```

---

## 4. Primary Key Strategy

### Kapan pakai BIGSERIAL vs UUID

| Kriteria                                        | BIGSERIAL | UUID |
| ----------------------------------------------- | --------- | ---- |
| Tabel internal saja (tidak expose ke API)       | ✅        |      |
| ID tampil di URL publik                         |           | ✅   |
| Arsitektur microservices / distributed          |           | ✅   |
| Volume sangat tinggi, butuh performa insert max | ✅        |      |
| Perlu merge data dari multiple database         |           | ✅   |

```sql
-- BIGSERIAL (internal)
id  BIGSERIAL   PRIMARY KEY

-- UUID (distributed / public-facing)
id  UUID        PRIMARY KEY DEFAULT gen_random_uuid()
```

### Jangan expose BIGSERIAL ke publik secara langsung

Jika pakai BIGSERIAL, gunakan `code` atau slug terpisah untuk URL publik:

```sql
-- Pattern aman: ID internal + public code
id      BIGSERIAL   PRIMARY KEY,
code    VARCHAR(50) NOT NULL UNIQUE DEFAULT ('ORD-' || LPAD(nextval('order_seq')::TEXT, 8, '0'))
-- URL: /orders/ORD-00000001 (tidak expose angka increment yang bisa diterka)
```

---

## 5. Foreign Key & Relasi

### Aturan FK

```sql
-- Selalu definisikan ON DELETE behavior secara eksplisit
-- Jangan biarkan default (RESTRICT/NO ACTION)

-- Pilih sesuai kebutuhan bisnis:
REFERENCES parent(id) ON DELETE CASCADE     -- hapus child jika parent dihapus
REFERENCES parent(id) ON DELETE SET NULL    -- set NULL jika parent dihapus (butuh kolom NULLABLE)
REFERENCES parent(id) ON DELETE RESTRICT    -- cegah hapus parent jika masih ada child (untuk data kritis)
```

### Tidak boleh ada circular FK

```sql
-- SALAH — circular dependency
products.price_id → prices.id
prices.product_id → products.id

-- BENAR — satu arah
prices.product_id → products.id
-- harga aktif difilter via: is_active=true AND NOW() BETWEEN valid_from AND valid_until
```

### Jangan duplikasi \_code sebagai FK

```sql
-- SALAH — redundan, tidak normal
user_id     BIGINT,
user_code   VARCHAR(50),    -- ini tidak perlu ada

-- BENAR — cukup ID, resolve code/name via JOIN
user_id     BIGINT  REFERENCES users(id)
```

---

## 6. Indexing Strategy

### Aturan Wajib

```sql
-- 1. Semua FK wajib diindex
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);

-- 2. Kolom yang sering di-filter wajib diindex
CREATE INDEX idx_payments_status ON payments(status) WHERE deleted_at IS NULL;

-- 3. Partial index untuk soft-delete (lebih efisien dari full index)
CREATE INDEX idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;

-- 4. Composite index untuk query yang selalu filter by 2 kolom bersamaan
CREATE INDEX idx_payments_sub_status ON payments(subscription_id, status)
    WHERE deleted_at IS NULL;

-- 5. Index pada kolom timestamp yang sering di-range query
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Kapan TIDAK perlu index

- Kolom boolean (`is_active`) — cardinality rendah, full index tidak efektif
- Tabel kecil < 1.000 baris — sequential scan lebih cepat
- Kolom yang sangat jarang di-query
- Jangan over-index — setiap index memperlambat INSERT/UPDATE

### Cek index yang tidak terpakai (monitoring rutin)

```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pk_%'
ORDER BY tablename;
```

---

## 7. Constraint & Validasi

### Validasi di DB Level (bukan hanya di aplikasi)

```sql
-- CHECK constraint untuk nilai valid
amount          NUMERIC(18,2)   CHECK (amount >= 0),
port            INTEGER         CHECK (port BETWEEN 1 AND 65535),
valid_until     TIMESTAMPTZ     CHECK (valid_until IS NULL OR valid_until > valid_from),
retry_count     INTEGER         NOT NULL DEFAULT 0 CHECK (retry_count >= 0),

-- NOT NULL untuk kolom yang memang wajib isi
first_name      VARCHAR(100)    NOT NULL,
status          payment_status  NOT NULL DEFAULT 'unpaid',

-- UNIQUE untuk natural key yang memang unik
email           VARCHAR(255)    UNIQUE,   -- atau partial unique jika soft-delete
internal_ref_no VARCHAR(100)    NOT NULL UNIQUE,
idempotency_key VARCHAR(120)    NOT NULL UNIQUE,

-- Partial UNIQUE (paling umum untuk soft-delete)
CREATE UNIQUE INDEX uix_users_email
    ON users(email) WHERE deleted_at IS NULL;
```

---

## 8. ENUM & Lookup Types

### Gunakan PostgreSQL ENUM untuk nilai terbatas & stabil

```sql
-- Buat ENUM type
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'expired', 'failed', 'refunded');

-- Gunakan di tabel
status  payment_status  NOT NULL DEFAULT 'unpaid'
```

### Keunggulan ENUM vs VARCHAR

| Aspek              | ENUM                         | VARCHAR + CHECK                                   |
| ------------------ | ---------------------------- | ------------------------------------------------- |
| Validasi native DB | ✅                           | ✅                                                |
| Storage            | Lebih kecil (4 bytes)        | Lebih besar                                       |
| Listicle di schema | Terdokumentasi               | Hanya di kode                                     |
| Tambah nilai baru  | `ALTER TYPE ... ADD VALUE`   | `ALTER TABLE ... DROP CONSTRAINT, ADD CONSTRAINT` |
| Hapus/rename nilai | Butuh migrasi lebih kompleks | Lebih mudah                                       |

### Kapan pakai lookup table (bukan ENUM)

Gunakan lookup table (tabel referensi) jika:

- Nilai bisa ditambah/dihapus oleh admin tanpa deployment ulang
- Nilai memiliki metadata tambahan (label, description, color, icon)
- Nilai dipakai lintas banyak tabel dengan makna berbeda

```sql
-- Lookup table pattern
CREATE TABLE ref_status_types (
    code        VARCHAR(50)     PRIMARY KEY,
    label       VARCHAR(100)    NOT NULL,
    description TEXT,
    sort_order  INTEGER         NOT NULL DEFAULT 0
);

INSERT INTO ref_status_types VALUES
    ('pending',  'Menunggu',       NULL, 1),
    ('active',   'Aktif',          NULL, 2),
    ('expired',  'Kadaluarsa',     NULL, 3);
```

---

## 9. Soft Delete

### Standar soft delete

```sql
-- Semua tabel bisnis pakai soft delete
deleted_at  TIMESTAMPTZ     -- NULL = aktif, berisi timestamp = terhapus

-- Query standar (always filter)
SELECT * FROM users WHERE deleted_at IS NULL;

-- Soft delete
UPDATE users SET deleted_at = NOW(), updated_by = $userId WHERE id = $id;

-- Restore
UPDATE users SET deleted_at = NULL, updated_by = $userId WHERE id = $id;
```

### Pengecualian (tidak perlu soft delete)

- Tabel history/audit yang immutable: `audit_logs`, `payment_callbacks`
- Lookup/reference tables: `ref_status_types`
- Tabel yang datanya memang boleh dihapus permanen

### Partial UNIQUE index dengan soft delete

```sql
-- Tanpa partial index: user bisa re-register email yang sudah deleted
-- Dengan partial index: email unik hanya untuk baris aktif
CREATE UNIQUE INDEX uix_users_email
    ON users(email)
    WHERE deleted_at IS NULL;
```

---

## 10. Audit Trail

### Dua level audit yang direkomendasikan

**Level 1 — Application audit log (siapa melakukan apa)**

```sql
CREATE TABLE audit_logs (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          REFERENCES users(id) ON DELETE SET NULL,
    type        log_type        NOT NULL,
    action      VARCHAR(100)    NOT NULL,    -- 'user.login', 'payment.approved'
    entity_type VARCHAR(100),               -- 'payments', 'users'
    entity_id   BIGINT,
    description TEXT,
    ip_address  INET,
    user_agent  TEXT,
    old_value   JSONB,                      -- snapshot sebelum perubahan
    new_value   JSONB,                      -- snapshot setelah perubahan
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    -- Tidak ada updated_at / deleted_at — immutable
);
```

**Level 2 — DB-level audit via trigger (opsional, untuk compliance ketat)**

```sql
-- Gunakan pgaudit extension untuk logging query-level
-- Atau buat history table dengan trigger
CREATE TABLE users_history (
    LIKE users,                         -- copy semua kolom dari users
    history_id      BIGSERIAL,
    operation       CHAR(1),            -- 'I'=Insert, 'U'=Update, 'D'=Delete
    changed_at      TIMESTAMPTZ         DEFAULT NOW()
);
```

### Aturan Immutability

```sql
-- audit_logs dan payment_callbacks TIDAK BOLEH diupdate atau didelete
-- Enforce via trigger
CREATE OR REPLACE FUNCTION fn_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Tabel % bersifat immutable, tidak dapat diubah atau dihapus', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation();

CREATE TRIGGER trg_payment_callbacks_immutable
    BEFORE UPDATE OR DELETE ON payment_callbacks
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_mutation();
```

---

## 11. Security Standards

### Credential Management

```
❌ JANGAN simpan credential (password DB, FTP, API key, secret) di tabel database
✅ Gunakan secret manager:
  - Self-hosted: HashiCorp Vault
  - AWS: AWS Secrets Manager / Parameter Store
  - GCP: Secret Manager
  - Minimal: Environment variable terenkripsi di deployment config
```

### Enkripsi Data Sensitif

```sql
-- PII (Personally Identifiable Information) sensitif wajib dienkripsi:
-- NIK, nomor rekening, nomor kartu, dsb

-- Opsi 1: pgcrypto (enkripsi di DB layer)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Simpan terenkripsi
INSERT INTO users (nik) VALUES (
    encode(encrypt(
        'your_nik_value'::bytea,
        'your_encryption_key'::bytea,
        'aes'
    ), 'base64')
);

-- Opsi 2: Enkripsi di application layer (lebih direkomendasikan)
-- Enkripsi sebelum kirim ke DB, dekripsi setelah baca dari DB
-- Key management dilakukan di aplikasi / KMS
```

### Password Storage

```sql
-- JANGAN simpan plaintext
-- JANGAN simpan MD5 atau SHA1
-- WAJIB pakai adaptive hashing:

-- Bcrypt (cost factor >= 12)
-- Argon2id (direkomendasikan untuk sistem baru)
-- scrypt

password_hash  VARCHAR(255)  NOT NULL  -- simpan hasil hash di sini
```

### Row-Level Security (untuk multi-tenant)

```sql
-- Aktifkan RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya bisa lihat data company-nya sendiri
CREATE POLICY policy_subscriptions_company
    ON subscriptions
    USING (company_id = current_setting('app.current_company_id')::BIGINT);
```

### Prinsip Least Privilege

```sql
-- Jangan gunakan superuser untuk koneksi aplikasi
-- Buat role terbatas per service

CREATE ROLE app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;

CREATE ROLE app_writer;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_writer;
-- Audit log tidak boleh di-update oleh app
REVOKE UPDATE, DELETE ON audit_logs FROM app_writer;
REVOKE UPDATE, DELETE ON payment_callbacks FROM app_writer;
```

---

## 12. Performance Standards

### Connection Pooling

```
Wajib pakai connection pooler di depan PostgreSQL:
- PgBouncer (paling umum, transaction mode)
- Pgpool-II (untuk read replica)

Target: max_connections PostgreSQL 100-200
Aplikasi connect ke pooler, bukan langsung ke PG
```

### Query Performance Targets

| Jenis Query               | Target Latency |
| ------------------------- | -------------- |
| Simple SELECT by PK/index | < 5ms          |
| Paginated list query      | < 50ms         |
| Aggregate / report query  | < 500ms        |
| Complex JOIN (3+ tabel)   | < 200ms        |
| Background job query      | < 5s           |

### EXPLAIN ANALYZE Wajib sebelum Deploy

```sql
-- Setiap query baru yang akan dipakai di production WAJIB dicek
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.id, u.first_name, p.status
FROM users u
JOIN payments p ON p.subscription_id IN (
    SELECT id FROM subscriptions WHERE user_id = u.id
)
WHERE u.deleted_at IS NULL
  AND p.status = 'unpaid';

-- Warning signs dari output EXPLAIN:
-- Seq Scan pada tabel besar — butuh index
-- Nested Loop pada tabel besar — pertimbangkan Hash Join
-- High rows estimate error — ANALYZE tabel
```

### Pagination Standard

```sql
-- JANGAN pakai OFFSET untuk tabel besar (lambat di halaman akhir)
-- GUNAKAN keyset/cursor-based pagination

-- Salah untuk tabel besar:
SELECT * FROM payments ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- Benar (cursor-based):
SELECT * FROM payments
WHERE created_at < $last_cursor_created_at   -- dari halaman sebelumnya
   OR (created_at = $last_cursor_created_at AND id < $last_cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### Partitioning untuk Tabel Besar

```sql
-- Untuk tabel yang akan melewati 10 juta rows (audit_logs, payment_callbacks)
-- Gunakan partisi by range (biasanya by month)

CREATE TABLE audit_logs (
    id          BIGSERIAL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2024_01
    PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## 13. Migration Standards

### Prinsip Zero-Downtime Migration

```
Urutan aman untuk perubahan schema pada sistem live:

FASE 1 — Backward compatible (deploy tanpa downtime):
  ✅ Tambah kolom baru NULLABLE
  ✅ Tambah tabel baru
  ✅ Tambah index (pakai CREATE INDEX CONCURRENTLY)
  ✅ Tambah FK baru ke data yang sudah ada
  ✅ Perluas constraint yang ada (misal VARCHAR(50) → VARCHAR(100))

FASE 2 — Data migration (background job):
  ✅ Backfill data ke kolom baru
  ✅ Verifikasi data konsisten

FASE 3 — Constraint (setelah data siap):
  ✅ Tambah NOT NULL setelah kolom terisi semua
  ✅ Tambah UNIQUE constraint setelah data clean

FASE 4 — Cleanup (opsional, setelah verifikasi):
  ✅ Drop kolom lama
  ✅ Drop tabel lama
```

### Aturan Migration File

```
Naming: {timestamp}_{action}_{object}.sql
Contoh:
  20240615_143000_create_users.sql
  20240616_090000_add_index_payments_status.sql
  20240617_120000_add_column_subscriptions_price_id.sql

Setiap file migration:
  1. Harus idempotent atau ada rollback script
  2. Gunakan transaction (BEGIN / COMMIT)
  3. Satu perubahan per file (bukan bundle banyak perubahan)
  4. Test di staging terlebih dahulu dengan data production-like
```

### Index tanpa lock (CONCURRENT)

```sql
-- JANGAN ini (akan lock tabel selama index build):
CREATE INDEX idx_payments_status ON payments(status);

-- HARUS ini untuk tabel live:
CREATE INDEX CONCURRENTLY idx_payments_status ON payments(status)
    WHERE deleted_at IS NULL;
```

---

## 14. Monitoring & Observability

### Metrics Wajib di-monitor

```sql
-- 1. Slow queries (pg_stat_statements)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Table bloat (dead tuples)
SELECT schemaname, tablename,
       n_dead_tup,
       n_live_tup,
       ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 3. Index yang tidak dipakai
SELECT tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename;

-- 4. Lock contention
SELECT pid, wait_event_type, wait_event, state, query
FROM pg_stat_activity
WHERE wait_event IS NOT NULL
  AND state != 'idle';
```

### VACUUM & AUTOVACUUM

```sql
-- Pastikan autovacuum aktif dan tidak tertinggal
SELECT schemaname, tablename,
       last_vacuum, last_autovacuum,
       last_analyze, last_autoanalyze,
       n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Untuk tabel payments yang sering diupdate, tune autovacuum lebih agresif:
ALTER TABLE payments SET (
    autovacuum_vacuum_scale_factor = 0.01,   -- vacuum setelah 1% rows berubah (default 20%)
    autovacuum_analyze_scale_factor = 0.005
);
```

### Backup & Recovery

```
Minimum backup strategy:
  - Full backup harian (pg_dump atau pg_basebackup)
  - WAL archiving untuk point-in-time recovery (PITR)
  - Retention: 30 hari untuk backup harian, 7 hari WAL
  - Test restore bulanan (backup tidak berguna jika tidak bisa di-restore)
  - RTO target: < 4 jam
  - RPO target: < 1 jam (data loss maksimal)
```

---

## 15. Checklist GTP

### Schema Design ✅

- [ ] Semua nama identifier `snake_case lowercase`
- [ ] Nama tabel plural
- [ ] Tidak ada singkatan ambigu
- [ ] Bahasa kolom konsisten (semua English)
- [ ] Tidak ada circular FK
- [ ] Tidak ada kolom `_code` redundan sebagai FK
- [ ] Semua FK punya `ON DELETE` behavior eksplisit
- [ ] Semua kolom boolean pakai tipe `BOOLEAN` (bukan INTEGER)
- [ ] Semua timestamp pakai `TIMESTAMPTZ` (bukan TIMESTAMP biasa)
- [ ] Uang pakai `NUMERIC(18,2)` (bukan FLOAT)
- [ ] Status field pakai PostgreSQL ENUM atau lookup table

### Kolom Standar ✅

- [ ] Setiap tabel punya `id`, `is_active`, `created_at`, `updated_at`
- [ ] Tabel bisnis punya `deleted_at` (soft delete)
- [ ] `created_by` / `updated_by` FK ke `users.id` (bukan VARCHAR nama)
- [ ] Trigger `fn_set_updated_at()` terpasang di semua tabel
- [ ] Tabel history/audit bersifat immutable (ada trigger pencegah UPDATE/DELETE)

### Security ✅

- [ ] Tidak ada credential (DB password, FTP password, API key) di tabel
- [ ] Password disimpan sebagai bcrypt/argon2id hash, bukan plaintext
- [ ] PII sensitif (NIK, nomor rekening) dienkripsi sebelum disimpan
- [ ] Koneksi aplikasi ke DB menggunakan role dengan least privilege
- [ ] Multi-tenant tabel menggunakan Row-Level Security (RLS) atau aplikasi-level filter

### Performance ✅

- [ ] Semua FK sudah diindex
- [ ] Partial index digunakan untuk tabel dengan soft delete
- [ ] Composite index tersedia untuk query filter multi-kolom yang sering dipakai
- [ ] Semua query baru sudah melalui `EXPLAIN ANALYZE` sebelum deploy
- [ ] Pagination menggunakan keyset (cursor-based), bukan OFFSET untuk tabel besar
- [ ] Tabel yang diperkirakan > 10 juta rows sudah direncanakan partisinya
- [ ] Index baru dibuat dengan `CREATE INDEX CONCURRENTLY`

### Migration ✅

- [ ] File migration mengikuti naming convention `{timestamp}_{action}_{object}.sql`
- [ ] Setiap migration file dibungkus transaction (BEGIN/COMMIT)
- [ ] Migration sudah ditest di environment staging dengan data production-like
- [ ] Perubahan schema bersifat zero-downtime (backward compatible di fase awal)
- [ ] Tidak ada `DROP COLUMN` atau `DROP TABLE` tanpa fase deprecation

### Monitoring ✅

- [ ] Extension `pg_stat_statements` aktif
- [ ] Autovacuum aktif dan dikonfigurasi untuk tabel high-write
- [ ] Alert terpasang untuk: slow query > threshold, dead tuple > 20%, disk usage > 80%
- [ ] Backup otomatis harian berjalan dan diverifikasi
- [ ] Test restore terakhir dilakukan dalam 30 hari terakhir

---

_Dokumen ini mengikuti praktik dari Google SRE, Stripe Engineering, Shopify Data Platform, dan PostgreSQL official documentation._
_Review ulang setiap 6 bulan atau saat ada perubahan arsitektur signifikan._

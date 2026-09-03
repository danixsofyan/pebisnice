# Migration

## Urutan

| File                                            | Isi                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `0000_goofy_jimmy_woo.sql`                      | Baseline seluruh tabel v1.0                                                                                          |
| `0001_ambiguous_iceman.sql`                     | Standarisasi ke `docs/db-standards.md`: TIMESTAMPTZ, NUMERIC(18,2), kolom siklus hidup, `project_id`, partial index  |
| `0002_branches_and_branch_scoped_inventory.sql` | Tabel `branches`; `inventory` & `inventory_movements` ter-scope cabang; `stores.branch_id`, `team_members.branch_id` |
| `0003_triggers_and_rls.sql`                     | Trigger `updated_at`, immutability audit & movements, policy RLS                                                     |
| `0004_extend_team_roles.sql`                    | Menambah peran `manager`, `cashier`, `production` ke enum `team_role`                                                |

Migration kustom (`0003`) terdaftar manual di `meta/_journal.json` — file SQL saja tidak cukup, `drizzle-kit migrate` hanya menjalankan yang tercatat di journal.

RLS sengaja ditempatkan **setelah** `branches` dibuat agar tabel itu ikut mendapat policy.

`0004` hanya `ALTER TYPE ... ADD VALUE`. Aman dijalankan di dalam transaksi pada PostgreSQL 12+ selama nilai barunya tidak dipakai di transaksi yang sama — dan memang tidak. Peran lama `operator` sengaja dipertahankan, bukan diganti: barisnya masih dipakai dan menghapus nilai enum Postgres berisiko.

## Database produksi belum punya riwayat migration

Skema produksi dibangun lewat `drizzle-kit push`, bukan `migrate`, sehingga tabel `__drizzle_migrations` belum ada. Menjalankan `pnpm db:migrate` apa adanya akan mencoba membuat tabel yang sudah ada dan gagal.

Sebelum migrasi pertama, `0000` harus ditandai sudah diterapkan (baseline). Dua catatan penting:

1. **Skema produksi tidak persis sama dengan `0000`.** Karena bug composite primary key, `accounts` dan `verificationTokens` di produksi belum punya primary key. Tambahkan manual sebelum baseline:

   ```sql
   -- Pastikan tidak ada duplikat lebih dulu
   SELECT provider, "providerAccountId", COUNT(*) FROM accounts
   GROUP BY 1, 2 HAVING COUNT(*) > 1;

   SELECT identifier, token, COUNT(*) FROM "verificationTokens"
   GROUP BY 1, 2 HAVING COUNT(*) > 1;

   ALTER TABLE accounts
     ADD CONSTRAINT "accounts_provider_providerAccountId_pk"
     PRIMARY KEY (provider, "providerAccountId");

   ALTER TABLE "verificationTokens"
     ADD CONSTRAINT "verificationTokens_identifier_token_pk"
     PRIMARY KEY (identifier, token);
   ```

2. **Deploy kode lebih dulu, baru migrasi.** `0002` mengaktifkan RLS. Kode yang belum memakai `withTenant()` akan melihat tabel bisnis kosong. Urutan aman: deploy aplikasi → jalankan `0001` → jalankan `0002`.

## Yang perlu diperiksa setelah `0001`

`0001` mengubah kolom waktu ke `TIMESTAMPTZ` dengan `USING kolom AT TIME ZONE 'UTC'`. Ini benar bila nilai lama ditulis oleh JavaScript `Date` lewat postgres.js — dan memang begitu. Jika ada data yang pernah dimasukkan manual dengan waktu lokal Jakarta, nilainya akan bergeser 7 jam. Periksa satu-dua baris `transactions.order_date` setelah migrasi.

`quantity_after` di `inventory_movements` direkonstruksi sebagai saldo berjalan `SUM(qty) OVER (PARTITION BY product_variant_id ORDER BY created_at, id)`. Ini mengasumsikan `qty` adalah delta bertanda. Bila tabel masih kosong, tidak ada yang perlu diperiksa.

## Yang perlu diperiksa setelah `0002`

Setiap project non-arsip otomatis mendapat cabang **Pusat** (`code = 'PUSAT'`), dan seluruh baris `inventory`, `inventory_movements`, serta `stores` yang sudah ada diarahkan ke sana. Verifikasi tidak ada yang tertinggal:

```sql
SELECT COUNT(*) FROM inventory WHERE branch_id IS NULL;
SELECT COUNT(*) FROM inventory_movements WHERE branch_id IS NULL;
```

Keduanya harus 0. Bila tidak, ada project yang sudah di-soft-delete tapi masih punya stok — putuskan cabangnya secara manual sebelum melanjutkan ke `0003`.

## RLS baru aktif dengan role terbatas

Policy di `0002` tidak berlaku untuk superuser maupun role ber-`BYPASSRLS`. Role `postgres` bawaan Supabase adalah superuser, jadi selama `DATABASE_URL` memakainya, RLS hanya dekorasi. Buat role terpisah untuk aplikasi:

```sql
CREATE ROLE pebisnice_app LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA public TO pebisnice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pebisnice_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pebisnice_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pebisnice_app;

-- Audit dan ledger tidak boleh diubah aplikasi (db-standards.md §11)
REVOKE UPDATE, DELETE ON audit_logs, inventory_movements FROM pebisnice_app;
```

Lalu arahkan `DATABASE_URL` ke role tersebut.

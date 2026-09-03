# Development Plan — Pebisnice v2.0

**Dokumen pendamping:** [PRD.md](./PRD.md) · [db-standards.md](./db-standards.md)
Menyatukan penjualan marketplace (v1.0) dengan cabang fisik, POS, produksi, dan pengeluaran.

---

## 1. Keputusan yang Sudah Dikunci

| Keputusan         | Pilihan                                          | Alasan                                                                                                      |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Autentikasi       | **Auth.js v5 + Google OAuth** (tetap)            | Sudah berjalan; `projects` + `team_members` sudah menjadi lapisan multi-tenancy, tidak perlu ganti provider |
| Primary key       | **UUID** (tetap)                                 | ID tampil di URL; `db-standards.md` §4 membolehkan UUID untuk public-facing                                 |
| Struktur folder   | Root-level `app/`, `lib/`, `components/` (tetap) | Konsisten dengan kode yang ada; tidak ada nilai dari migrasi ke `src/`                                      |
| Data-access layer | `lib/repositories/` + `lib/services/` (tetap)    | Sudah berbentuk DAL; diperkuat, bukan diganti                                                               |
| ORM & DB          | Drizzle + PostgreSQL/Supabase (tetap)            | —                                                                                                           |
| Uang              | `NUMERIC(18,2)`                                  | Naik dari `(15,2)` agar patuh standar                                                                       |
| Waktu             | `TIMESTAMPTZ`                                    | Naik dari `timestamp`; wajib untuk Asia/Jakarta                                                             |

## 2. Arsitektur

```
Browser (owner / manager / kasir / produksi)
   │  HTTPS
   ▼
proxy.ts ── rate limit · CSP nonce · session guard
   │
   ▼
Next.js App Router
   ├─ RSC pages          → baca data, ter-scope project + cabang + role
   ├─ Server Actions     → semua mutasi (POS, stok, produksi, expense)
   └─ Route Handlers     → auth callback, cron sync, export CSV/PDF
   │
   ▼
Data-Access Layer  ← SATU pintu ke database
   ├─ lib/services/      → aturan bisnis, audit, permission check
   └─ lib/repositories/  → query Drizzle, enforce project_id + branch_id
   │                      dan strip kolom biaya untuk role tanpa cost:view
   ▼
Drizzle ORM ──► PostgreSQL (RLS FORCE sebagai jaring pengaman)
```

### Keputusan arsitektur

1. **Database hanya diakses dari server.** Enforcement tenant, cabang, dan HPP terjadi di data-access layer — satu choke point yang bisa dites.
2. **HPP disembunyikan di level kolom, bukan baris.** RLS Postgres bersifat row-level dan tidak bisa menyembunyikan kolom. Karena itu repository menyediakan dua bentuk select: `withCost` dan `withoutCost`; pemilihannya ditentukan permission `cost:view`, bukan oleh pemanggil.
3. **RLS aktif sejak migrasi pertama v2.0.** Tabel bisnis memakai `ENABLE` + `FORCE ROW LEVEL SECURITY` dengan policy `project_id = current_setting('app.current_project_id', true)::uuid`. DAL membungkus akses dalam transaksi yang menjalankan `set_config(..., true)` lewat helper `withTenant()` di `lib/db/tenant.ts`. Bila tenant belum di-set, `current_setting` bernilai NULL sehingga seluruh baris tersaring — gagal tertutup.

   Empat tabel sengaja dikecualikan: `users`, `accounts`, `sessions`, `verificationTokens` milik Auth.js bersifat lintas tenant; `projects` harus terbaca sebelum tenant dipilih; `audit_logs` punya `project_id` nullable karena event login tidak terikat project, sehingga aksesnya dibatasi di DAL saja.

   **RLS tidak berlaku untuk role superuser maupun role ber-`BYPASSRLS`.** Connection string Supabase bawaan memakai role `postgres` yang superuser, artinya policy ini tidak akan aktif. Agar benar-benar berfungsi, aplikasi harus terhubung memakai role terbatas sesuai `db-standards.md` §11.

4. **Stok event-sourced ringan.** Saldo cepat di `inventory` (per cabang per varian), kebenaran di `inventory_movements` (append-only, immutable). Seluruh mutasi lewat `applyStockMovement()` dalam transaksi DB dengan `SELECT … FOR UPDATE`.
5. **COGS via snapshot.** `transaction_items.hpp_at_time` (sudah ada) dan `production_materials.cost_amount` (baru) menyimpan HPP saat kejadian — P&L historis tidak berubah saat HPP diperbarui.
6. **Konteks sesi di-inject, bukan diimpor global.** Service menerima `{ userId, projectId, role, branchId, canViewCost }` sebagai parameter agar unit test tidak menyentuh database maupun Auth.js.

## 3. Perubahan Skema

### 3.1 Menyatukan dua channel penjualan

Masalah: `transactions.store_id` saat ini `NOT NULL` dan `stores` berarti akun marketplace. Transaksi POS tidak punya akun marketplace.

Solusi:

- Tambah enum `sales_channel` = `marketplace | pos`.
- `transactions`: tambah `project_id` (denormalisasi, wajib untuk RLS dan agregasi lintas channel), `channel`, `branch_id`, `cash_session_id`; `store_id` menjadi nullable.
- CHECK constraint: `channel = 'marketplace'` → `store_id` wajib; `channel = 'pos'` → `branch_id` dan `cash_session_id` wajib.
- `stores.branch_id` → cabang pemenuhan; penjualan marketplace mengurangi stok cabang tersebut.

### 3.2 Inventory menjadi per cabang

`inventory` sekarang unik per `product_variant_id`. Diubah menjadi unik per `(branch_id, product_variant_id)`. `inventory_movements` mendapat `project_id`, `branch_id`, dan `quantity_after`.

### 3.3 ENUM baru

```
sales_channel     : marketplace | pos
product_type      : finished | material
payment_method    : cash | transfer | qris | card | other
pos_status        : completed | voided
expense_category  : rent | salary | utility | marketing | shipping | supply | other
```

`team_role` diperluas: `owner | admin | manager | finance | cashier | production` (peran `operator` lama dipetakan ke `cashier`).
`movement_type` diperluas dengan `production_in` dan `production_out`.

### 3.4 Struktur kode

Skema dipecah per domain di `lib/db/schema/` — tidak ada file monolitik:

```
lib/db/schema/
  primitives.ts   money(), tz(), lifecycleColumns
  columns.ts      actorColumns, tenantColumn
  enums.ts        seluruh pgEnum
  auth.ts         users, accounts, sessions, verificationTokens
  projects.ts     projects
  branches.ts     branches
  team.ts         team_members
  channels.ts     stores
  catalog.ts      products, product_variants
  sales.ts        transactions, transaction_fees, transaction_items
  inventory.ts    inventory, inventory_movements
  files.ts        file_uploads
  audit.ts        audit_logs
  index.ts        re-export
```

Logika bisnis mengikuti pemisahan yang sama: aturan murni di `lib/domain/`, akses data di `lib/repositories/`, orkestrasi di `lib/services/`. Domain tidak pernah mengimpor database, sehingga bisa dites tanpa Postgres.

### 3.5 Tabel baru (5)

| Tabel                  | Kolom kunci                                                                                                             | Catatan                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `branches`             | `project_id`, `name`, `code`, `address`, `phone`                                                                        | uq(project, code) partial |
| `cash_sessions`        | `branch_id`, `opened_by`, `opening_balance`, `closed_at`, `closing_balance`, `expected_balance`, `difference`           | Shift kasir               |
| `production_logs`      | `project_id`, `branch_id`, `product_variant_id`, `quantity`, `production_date DATE`, `total_material_cost`, `unit_cost` | Produk jadi               |
| `production_materials` | `production_log_id`, `product_variant_id`, `quantity`, `cost_amount`                                                    | Snapshot HPP bahan        |
| `expenses`             | `project_id`, `branch_id`, `category`, `amount`, `expense_date DATE`, `note`                                            | OpEx untuk P&L            |

### 3.6 Penyesuaian standar (`db-standards.md`)

Berlaku untuk seluruh tabel bisnis, lama maupun baru:

- `timestamp` → `TIMESTAMPTZ`.
- `NUMERIC(15,2)` → `NUMERIC(18,2)`.
- Tambah kolom wajib: `is_active`, `deleted_at`, `created_by`, `updated_by`.
- Trigger `fn_set_updated_at()` di semua tabel (saat ini `updatedAt` di-set manual dari JavaScript).
- Trigger `fn_prevent_mutation()` pada `audit_logs` dan `inventory_movements`.
- Partial unique index `WHERE deleted_at IS NULL` menggantikan unique biasa.
- Semua FK diindex; `ON DELETE` eksplisit di setiap FK.
- Pagination keyset menggantikan OFFSET pada daftar transaksi dan audit log (belum dikerjakan; masih OFFSET).
- Setiap tabel bisnis ter-scope tenant mendapat `project_id` langsung — termasuk `product_variants`, `transactions`, `transaction_fees`, `transaction_items`, `inventory`, `inventory_movements`, dan `file_uploads` yang sebelumnya hanya menjangkau project lewat join berantai. Ini prasyarat RLS.
- `inventory_movements` mendapat `quantity_after` sebagai saldo hasil mutasi, dipakai untuk rekonsiliasi terhadap `inventory.stock_qty`.

Direktori migration saat ini belum ada. Dibuat di `supabase/migrations/` sesuai `drizzle.config.ts`, dengan SQL kustom untuk trigger, partial index, dan policy RLS.

## 4. RBAC

Tujuh peran, masing-masing dengan daftar permission eksplisit di `lib/authz/permissions.ts`:

| Peran        | Lihat HPP | Ringkas                                               |
| ------------ | --------- | ----------------------------------------------------- |
| `owner`      | Ya        | Seluruh permission                                    |
| `admin`      | Ya        | Semua kecuali `project:delete`                        |
| `manager`    | Ya        | Operasional satu cabang: stok, produksi, POS, laporan |
| `finance`    | Ya        | Laporan, P&L, pengeluaran; tidak mengubah stok        |
| `cashier`    | **Tidak** | POS dan sesi kas saja                                 |
| `production` | **Tidak** | Log produksi saja                                     |
| `operator`   | **Tidak** | Peran warisan v1.0: unggah data marketplace           |

`operator` sengaja **tidak** dipetakan ke `cashier` — pemetaan itu akan mencabut `data:upload` yang sudah dipakai pengguna v1.0.

### Gating HPP

`cost:view` adalah gerbang tunggalnya. Penegakannya berlapis:

1. **Repository** menyediakan dua bentuk select. Bentuk tanpa biaya tidak menyertakan kolom `hpp` sama sekali — nilainya tidak pernah dibaca dari database.
2. **Service** yang memutuskan bentuk mana yang dipakai, dari hasil `checkPermission()`. Bukan parameter yang bisa diatur pemanggil, sehingga halaman atau action yang lupa memfilter tidak bisa membocorkannya.
3. **`stripCostFields()`** sebagai jaring pengaman terakhir bila ada jalur yang terlewat.

Test mengunci daftar peran yang boleh melihat HPP, dan memverifikasi setiap kolom ber-HPP di skema tercakup `COST_FIELDS` — jadi kolom biaya baru tidak bisa lolos diam-diam.

### Cakupan cabang

`requireBranchAccess()` memastikan anggota dengan `team_members.branch_id` terisi hanya menyentuh cabangnya. `branch_id` NULL berarti seluruh cabang.

## 5. Aturan Kode

- Komponen baru wajib cek `components/` dulu — bila mirip yang ada, perluas, jangan duplikasi.
- Semua input divalidasi Zod di server action, bukan hanya di client.
- Uang selalu `NUMERIC` di DB; konversi string↔number hanya lewat helper di `lib/formatters.ts`; tanpa aritmetika float untuk Rupiah.
- File dan folder kebab-case; komponen PascalCase; fungsi camelCase.
- Query baru dicek `EXPLAIN ANALYZE` sebelum dipakai di halaman produksi.

## 6. Quality Gates

| Gate             | Tool                                                           | Kapan           |
| ---------------- | -------------------------------------------------------------- | --------------- |
| Format           | Prettier                                                       | pre-commit      |
| Lint             | ESLint 9 flat config                                           | pre-commit + CI |
| Typecheck        | `tsc --noEmit`                                                 | pre-push + CI   |
| Commit message   | commitlint (Conventional Commits)                              | commit-msg hook |
| Unit test        | Vitest — HPP, stok, COGS, P&L, selisih kas                     | pre-push + CI   |
| Integration test | Vitest + PGlite — isolasi tenant, gating HPP, konsistensi stok | CI              |
| E2E              | Playwright — login, POS, produksi, isolasi HPP                 | CI              |
| Build            | `next build`                                                   | CI              |

Vitest sudah berjalan sejak Tahap 1 (`tests/unit/`). Integration test dengan PGlite dan E2E Playwright belum dibuat.

## 7. Tahapan Pengerjaan

| Tahap                          | Isi                                                                                                                                         | Definition of Done                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **1. Fondasi**                 | Perbaiki 12 temuan audit v1.0; buat direktori migration; script `typecheck`/`test`/`db:*`; harness Vitest + PGlite; test pertama untuk RBAC | `pnpm typecheck` dan `pnpm test` hijau; migration awal ter-generate                           |
| **2. Standarisasi skema**      | TIMESTAMPTZ, NUMERIC(18,2), kolom wajib, trigger `updated_at`, audit & movements immutable, partial index, RLS                              | Migration jalan di Supabase; test isolasi tenant lulus di dua lapis                           |
| **2b. Role database terbatas** | Buat role non-superuser untuk aplikasi, pindahkan `DATABASE_URL` ke role tersebut                                                           | RLS terbukti aktif lewat test lintas tenant                                                   |
| **3. Cabang & stok**           | Tabel `branches`; inventory per cabang; `applyStockMovement()`; halaman stok + penyesuaian + alasan                                         | Test `saldo = Σ movement` lulus; project lama punya cabang "Pusat"                            |
| **4. RBAC & gating HPP**       | Peran baru, cakupan cabang, permission `cost:view`, select dengan/tanpa kolom biaya                                                         | ✅ Selesai — 13 test gating; kolom biaya tidak pernah di-select untuk peran tanpa `cost:view` |
| **5. POS**                     | `cash_sessions`; `createSale()` atomik; void dengan alasan; aritmetika uang bigint                                                          | ✅ Domain & service selesai — 37 test POS; layar kasir dan struk PDF menyusul di 5b           |
| **6. Produksi**                | `production_logs` + `production_materials`; form; kalkulasi `unit_cost` server-side                                                         | Bahan berkurang, produk jadi bertambah, unit cost benar                                       |
| **7. Keuangan & laporan**      | `expenses`; penjualan harian; P&L gabungan; nilai stok; export CSV + PDF                                                                    | P&L bulan berjalan bisa dicetak dan angkanya dapat dipertanggungjawabkan                      |
| **8. Dashboard & pengerasan**  | Ganti seluruh data mock dengan query nyata; Recharts; E2E Playwright; audit viewer                                                          | Tidak ada angka hardcoded tersisa di `app/(main)/`                                            |

## 8. Risiko

| Risiko                                       | Mitigasi                                                                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrasi TIMESTAMPTZ pada data yang sudah ada | `USING kolom AT TIME ZONE 'UTC'` — nilai lama ditulis JS `Date` lewat postgres.js, jadi sudah UTC; menafsirkannya sebagai Asia/Jakarta akan menggeser data 7 jam |
| Stok minus karena race condition             | Mutasi dalam transaksi DB + `SELECT … FOR UPDATE` di `applyStockMovement()`                                                                                      |
| Kebocoran HPP lewat jalur yang terlewat      | Gating di repository, bukan di komponen; ditutup test otomatis per role                                                                                          |
| Batas koneksi Postgres di serverless         | Supabase pooler mode transaction sejak awal                                                                                                                      |
| Rate limiter in-memory tidak lintas instance | Pindah ke Redis/Upstash sebelum go-live komersial                                                                                                                |

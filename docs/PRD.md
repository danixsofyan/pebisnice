# PRD — Pebisnice

**Product Requirements Document · v2.0**
Platform manajemen profit all-in-one untuk pebisnis: penjualan marketplace **dan** penjualan offline (POS) dalam satu laporan laba-rugi.

---

## 1. Ringkasan Produk

Pebisnice adalah aplikasi web multi-tenant yang menyatukan dua sumber pendapatan yang selama ini dicatat terpisah:

- **Channel marketplace** — Shopee, TikTok Shop, Tokopedia, Lazada (sinkronisasi API atau import file).
- **Channel offline** — penjualan langsung di cabang lewat POS/kasir.

Keduanya bermuara pada satu kebenaran: **berapa laba bersih bisnis ini, per cabang, per channel, per periode.**

Versi 1.0 hanya menangani marketplace. Versi 2.0 menambahkan cabang fisik, POS, produksi, dan pengeluaran operasional sehingga P&L menjadi utuh.

## 2. Masalah yang Dipecahkan

| #   | Masalah                                                     | Dampak                                            |
| --- | ----------------------------------------------------------- | ------------------------------------------------- |
| P1  | HPP terlihat oleh semua staff yang punya akses aplikasi     | Margin bocor; owner enggan memberi akses ke tim   |
| P2  | Penjualan offline dan marketplace dicatat di tempat berbeda | Tidak ada satupun angka laba yang bisa dipercaya  |
| P3  | Stok tidak sinkron antar cabang dan antar channel           | Overselling, opname selalu selisih                |
| P4  | Pemakaian bahan produksi tidak tercatat                     | HPP produk rakitan hanya tebakan                  |
| P5  | Pengeluaran operasional tidak masuk sistem                  | Laporan berhenti di laba kotor, bukan laba bersih |
| P6  | Multi-cabang tanpa isolasi data                             | Stok dan omzet antar cabang tercampur             |

## 3. Metrik Sukses

| Metrik                                                                 | Target                                  |
| ---------------------------------------------------------------------- | --------------------------------------- |
| Seluruh transaksi harian (offline + marketplace) tercatat di Pebisnice | 100%                                    |
| HPP tidak pernah terkirim ke role Kasir/Produksi                       | 0 kebocoran, diverifikasi test otomatis |
| Akurasi P&L bulanan (Revenue − COGS − OpEx) vs pencatatan manual       | Selisih < 1%                            |
| Selisih stok sistem vs fisik saat opname                               | < 5%                                    |
| Waktu input 1 transaksi kasir                                          | < 30 detik                              |
| Saldo stok = Σ inventory_movements                                     | Selalu, diverifikasi test               |

## 4. Peran & Akses

`team_members.branch_id` bernilai NULL berarti akses seluruh cabang.

| Peran          | Cakupan cabang | Lihat HPP | Kemampuan utama                                        |
| -------------- | -------------- | --------- | ------------------------------------------------------ |
| **owner**      | Semua          | Ya        | Semua fitur, kelola tim, hapus/arsip project           |
| **admin**      | Semua          | Ya        | Semua kecuali hapus project                            |
| **manager**    | Satu cabang    | Ya        | Laporan cabang, kelola stok & produksi, void transaksi |
| **finance**    | Semua          | Ya        | Laporan, P&L, pengeluaran; tidak mengubah stok         |
| **cashier**    | Satu cabang    | **Tidak** | POS, riwayat transaksi sendiri                         |
| **production** | Satu cabang    | **Tidak** | Input log produksi & pemakaian bahan                   |

Peran `operator` dari v1.0 dipetakan ke `cashier` saat migrasi.

## 5. Scope

### 5.1 Cabang (baru)

- CRUD cabang dalam satu project: nama, kode, alamat, telepon.
- Setiap project wajib punya minimal satu cabang; project lama otomatis mendapat cabang default "Pusat" saat migrasi.
- Setiap marketplace store ditautkan ke satu cabang sebagai lokasi pemenuhan (fulfillment) — penjualan marketplace mengurangi stok cabang tersebut.
- Branch switcher di header untuk role bercakupan semua cabang.
- **Acceptance:** kasir cabang A tidak dapat membaca satupun baris data cabang B, dari UI maupun server action.

### 5.2 Produk & HPP (perluasan)

- Produk mendapat tipe: **`finished`** (siap jual) dan **`material`** (bahan baku untuk produksi).
- HPP tetap pada level varian (`product_variants.hpp`), konsisten dengan v1.0.
- HPP hanya dibaca/ditulis oleh role dengan permission `cost:view`. Query untuk role lain memakai kolom-select tanpa field biaya — field tersebut tidak pernah ikut terserialisasi ke client.
- HPP dapat diisi manual atau diperbarui otomatis dari `unit_cost` produksi terakhir (opsional per produk).
- **Acceptance:** response server action untuk cashier/production tidak mengandung field biaya dalam bentuk apapun, diverifikasi test otomatis.

### 5.3 POS / Kasir (baru)

- Sesi kasir: buka shift (modal awal) → transaksi → tutup shift (setoran, saldo diharapkan, selisih).
- Cari produk (nama/SKU), keranjang, diskon per transaksi (nominal atau persen).
- Metode bayar: cash, transfer, QRIS, kartu, lainnya.
- Simpan transaksi → stok cabang berkurang → struk PDF siap cetak thermal 58mm.
- Riwayat transaksi (filter tanggal/cabang/kasir), cetak ulang struk, void oleh manager/admin/owner dengan alasan wajib (stok dikembalikan).
- **Acceptance:** transaksi tersimpan atomik dalam satu transaksi DB — bila pengurangan stok gagal, penjualan batal seluruhnya.

### 5.4 Inventory (perluasan ke cabang)

- Stok per varian **per cabang**, real-time.
- Seluruh mutasi stok melewati satu fungsi `applyStockMovement()` di dalam transaksi DB dengan penguncian baris.
- Penyesuaian manual wajib disertai alasan.
- `inventory_movements` append-only dan immutable (ditegakkan trigger DB), menyimpan `quantity_after` untuk rekonsiliasi.
- Low-stock alert per varian per cabang, badge di dashboard.
- Laporan nilai stok (qty × HPP) — hanya untuk role dengan `cost:view`.
- Export CSV.
- **Acceptance:** saldo `inventory.stock_qty` selalu sama dengan penjumlahan `quantity_delta` movement-nya.

### 5.5 Produksi (baru)

- Form log produksi: tanggal, cabang, produk jadi + qty, daftar bahan + qty terpakai.
- Simpan → stok bahan berkurang, stok produk jadi bertambah, biaya dihitung server-side dari HPP bahan (snapshot ke `production_materials.cost_amount`).
- `unit_cost` = total biaya bahan ÷ qty produk jadi.
- Riwayat produksi per cabang per periode.
- **Acceptance:** role production tidak melihat nilai rupiah bahan sama sekali; seluruh kalkulasi biaya terjadi di server.

### 5.6 Pengeluaran & Laporan (baru)

- CRUD pengeluaran operasional: kategori, nominal, tanggal, cabang, catatan.
- Laporan penjualan harian per cabang per metode bayar.
- **Laporan P&L bulanan gabungan**: Revenue (marketplace + offline) − COGS (dari snapshot HPP) − Biaya Platform (fee marketplace) − OpEx.
- Laporan stok & nilai stok.
- Semua laporan: filter rentang tanggal, cabang, dan channel; export CSV. P&L juga export PDF.
- **Acceptance:** COGS memakai HPP snapshot saat transaksi terjadi, bukan HPP saat ini.

### 5.7 Dashboard (mengganti data mock)

- KPI: omzet, laba kotor, laba bersih, ROAS, biaya platform, pesanan selesai, retur, item low-stock.
- Filter channel (semua / marketplace / offline) dan cabang.
- Grafik tren omzet 30 hari dan top 5 produk terlaris — memakai Recharts, bukan div statis.
- Scope data mengikuti role.

### 5.8 Audit Log (pengerasan)

- Semua aksi tulis tercatat: siapa, kapan, IP, nilai lama → nilai baru.
- Immutable, ditegakkan trigger DB (saat ini belum ada).
- Hanya role dengan `audit:view` yang dapat membacanya.

## 6. Di Luar Scope

WhatsApp bot · approval workflow · supplier & purchase order · database pelanggan/loyalty · multi-currency (IDR saja) · mobile app · offline mode · billing langganan otomatis · custom domain per tenant.

## 7. Non-Functional Requirements

| Aspek           | Requirement                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------- |
| Performa        | TTFB < 500ms; query list terpaginasi < 50ms; submit POS < 1s; query laporan < 500ms           |
| Keamanan        | OWASP Top 10 dimitigasi; RBAC di server; RLS di DB; security headers; rate limiting           |
| Data            | PostgreSQL sesuai `docs/db-standards.md`; soft delete; audit trail; backup harian             |
| Bahasa & format | UI Bahasa Indonesia; Rupiah `Rp 1.234.567`; timezone Asia/Jakarta; disimpan UTC (TIMESTAMPTZ) |
| Perangkat       | Responsive: desktop untuk laporan, tablet/mobile untuk POS dan produksi                       |
| Aksesibilitas   | Navigasi keyboard penuh di POS, kontras WCAG AA, label form semantik                          |

## 8. Multi-tenancy

- Satu project = satu tenant. Seluruh tabel bisnis ter-scope `project_id`.
- Isolasi ditegakkan dua lapis: data-access layer (wajib) dan Row-Level Security di Postgres (jaring pengaman).
- Autentikasi tetap **Auth.js v5 + Google OAuth** — tidak berpindah provider.

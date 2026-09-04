import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Menggabungkan seluruh migration menjadi satu berkas siap tempel ke SQL
 * editor Supabase, lengkap dengan langkah baseline.
 *
 * Dibuat karena database produksi dibangun lewat `drizzle-kit push` sehingga
 * belum punya tabel `__drizzle_migrations` — `pnpm db:migrate` tidak bisa
 * dipakai apa adanya.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const OUTPUT = join(process.cwd(), 'supabase', 'deploy.sql')

interface JournalEntry {
  idx: number
  tag: string
  when: number
}

const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')) as {
  entries: JournalEntry[]
}

const PREAMBLE = `-- =============================================================
-- Pebisnice v2.0 — skrip penerapan skema
--
-- DIBUAT OTOMATIS oleh scripts/build-deploy-sql.ts. Jangan diedit manual;
-- ubah migration-nya lalu jalankan \`pnpm db:build-deploy\`.
--
-- CARA PAKAI
--   1. Backup database lebih dulu.
--   2. Deploy kode aplikasi TERLEBIH DAHULU. Migration ini mengaktifkan RLS;
--      kode lama yang belum memakai withTenant() akan melihat tabel kosong.
--   3. Jalankan periksa-dulu di bawah. Bila ada duplikat, bersihkan sebelum
--      melanjutkan.
--   4. Tempel seluruh berkas ini ke SQL editor Supabase dan jalankan.
--   5. Jalankan verifikasi di bagian akhir.
--
-- Skrip ini idempoten untuk migration 0000 (dilewati sebagai baseline) dan
-- mencatat seluruh migration ke tabel pelacak drizzle, sehingga
-- \`pnpm db:migrate\` berikutnya hanya menjalankan yang benar-benar baru.
-- =============================================================

-- -------------------------------------------------------------
-- PERIKSA DULU — jalankan terpisah, pastikan keduanya 0 baris
-- -------------------------------------------------------------
-- SELECT provider, "providerAccountId", COUNT(*) FROM accounts
--   GROUP BY 1,2 HAVING COUNT(*) > 1;
-- SELECT identifier, token, COUNT(*) FROM "verificationTokens"
--   GROUP BY 1,2 HAVING COUNT(*) > 1;

BEGIN;

-- -------------------------------------------------------------
-- BASELINE: composite primary key yang hilang karena bug v1.0
-- -------------------------------------------------------------
DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_provider_providerAccountId_pk'
  ) THEN
    ALTER TABLE accounts
      ADD CONSTRAINT "accounts_provider_providerAccountId_pk"
      PRIMARY KEY (provider, "providerAccountId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verificationTokens_identifier_token_pk'
  ) THEN
    ALTER TABLE "verificationTokens"
      ADD CONSTRAINT "verificationTokens_identifier_token_pk"
      PRIMARY KEY (identifier, token);
  END IF;
END;
$baseline$;
`

/**
 * Mencatat migration ke tabel pelacak drizzle.
 *
 * Tanpa ini, `pnpm db:migrate` berikutnya akan mengira belum ada migration
 * yang diterapkan dan mencoba menjalankan ulang semuanya. Bentuk tabel dan
 * cara hash-nya mengikuti `drizzle-orm/pg-core/dialect`: sha256 dari isi
 * berkas apa adanya, dan `created_at` dari kolom `when` di journal.
 */
function buildMigrationLedger(entries: JournalEntry[]): string {
  const rows = entries
    .map((entry) => {
      const raw = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8')
      const hash = createHash('sha256').update(raw).digest('hex')
      return `  ('${hash}', ${entry.when})`
    })
    .join(',\n')

  return `
-- -------------------------------------------------------------
-- Catat seluruh migration sebagai sudah diterapkan, supaya
-- \`pnpm db:migrate\` berikutnya hanya menjalankan yang baru.
-- -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT v.hash, v.created_at
FROM (VALUES
${rows}
) AS v(hash, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" m WHERE m.hash = v.hash
);
`
}

const VERIFICATION = `
COMMIT;

-- =============================================================
-- VERIFIKASI — jalankan setelah COMMIT, semua harus sesuai harapan
-- =============================================================
-- Tidak boleh ada baris tanpa cabang:
--   SELECT COUNT(*) FROM inventory WHERE branch_id IS NULL;            -- harus 0
--   SELECT COUNT(*) FROM inventory_movements WHERE branch_id IS NULL;  -- harus 0
--
-- Setiap project punya cabang Pusat:
--   SELECT p.name FROM projects p
--   WHERE p.deleted_at IS NULL AND NOT EXISTS (
--     SELECT 1 FROM branches b WHERE b.project_id = p.id AND b.deleted_at IS NULL
--   );                                                                 -- harus kosong
--
-- Waktu tidak bergeser (bandingkan dengan catatan Anda):
--   SELECT order_id, order_date FROM transactions ORDER BY order_date DESC LIMIT 5;
--
-- RLS aktif di tabel bisnis:
--   SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
--   WHERE relname IN ('transactions','inventory','expenses','cash_sessions')
--   ORDER BY relname;                                                  -- semua true
--
-- PENTING: RLS tidak berlaku untuk superuser. Selama DATABASE_URL memakai
-- role \`postgres\` bawaan Supabase, policy di atas belum efektif. Lihat
-- supabase/migrations/README.md untuk membuat role terbatas.
`

const parts: string[] = [PREAMBLE]

for (const entry of journal.entries) {
  if (entry.idx === 0) {
    parts.push(`
-- -------------------------------------------------------------
-- ${entry.tag} — DILEWATI (baseline: tabel sudah ada di produksi)
-- -------------------------------------------------------------`)
    continue
  }

  const sql = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8')

  parts.push(`
-- -------------------------------------------------------------
-- ${entry.tag}
-- -------------------------------------------------------------
${sql.split('--> statement-breakpoint').join('').trim()}`)
}

parts.push(buildMigrationLedger(journal.entries))
parts.push(VERIFICATION)

writeFileSync(OUTPUT, parts.join('\n') + '\n')

const migrationCount = journal.entries.length - 1
console.log(`supabase/deploy.sql dibuat dari ${migrationCount} migration (0000 dilewati)`)

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'

// Tracked, idempotent migration runner. Replaces ad-hoc "apply this .sql by hand" with one command
// that records every migration in drizzle.__drizzle_migrations (sha256 of the file, same as
// drizzle-orm), so re-running only applies what is genuinely new.
//
// It connects with MIGRATION_DATABASE_URL (a privileged role) because migrations do GRANT / ALTER
// TYPE / FORCE ROW LEVEL SECURITY, which the app's RLS-bound DATABASE_URL role cannot. Falls back to
// DATABASE_URL for local dev.
//
//   pnpm db:deploy              apply every pending migration and record it
//   pnpm db:deploy -- --mark-only   record pending migrations as applied WITHOUT running them
//                                    (reconcile a database whose schema is already up to date)

loadEnv({ path: ['.env.local', '.env'] })

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')
const markOnly = process.argv.includes('--mark-only')

interface JournalEntry {
  idx: number
  tag: string
  when: number
}

function loadJournal(): JournalEntry[] {
  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')
  ) as { entries: JournalEntry[] }
  return [...journal.entries].sort((a, b) => a.idx - b.idx)
}

function hashOf(tag: string): { sql: string; hash: string } {
  const sql = readFileSync(join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8')
  return { sql, hash: createHash('sha256').update(sql).digest('hex') }
}

async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) {
    console.error('MIGRATION_DATABASE_URL (atau DATABASE_URL) belum di-set')
    process.exit(1)
  }

  const client = postgres(url, {
    max: 1,
    prepare: false,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
    onnotice: () => {},
  })

  try {
    await client.unsafe('CREATE SCHEMA IF NOT EXISTS "drizzle"')
    await client.unsafe(
      'CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)'
    )

    const recorded = new Set(
      (await client`select hash from drizzle.__drizzle_migrations`).map((r) => r.hash as string)
    )

    const entries = loadJournal()
    let applied = 0
    let marked = 0

    for (const entry of entries) {
      const { sql, hash } = hashOf(entry.tag)
      if (recorded.has(hash)) continue

      if (markOnly) {
        await client`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${entry.when})`
        console.log(`  marked  ${entry.tag}`)
        marked++
        continue
      }

      // Run the whole file as one multi-statement query (breakpoints stripped). This matches how
      // these migrations were validated and lets statements like ALTER TYPE ... ADD VALUE run
      // outside an explicit transaction. The hash is recorded only after the SQL succeeds.
      const body = sql.split('--> statement-breakpoint').join('\n')
      console.log(`  applying ${entry.tag} ...`)
      await client.unsafe(body)
      await client`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${entry.when})`
      console.log(`  applied  ${entry.tag}`)
      applied++
    }

    if (markOnly) {
      console.log(`Selesai: ${marked} migrasi ditandai sudah diterapkan (tanpa dijalankan).`)
    } else {
      console.log(
        applied === 0 ? 'Tidak ada migrasi baru; database sudah mutakhir.' : `Selesai: ${applied} migrasi diterapkan.`
      )
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Migrasi gagal:', error instanceof Error ? error.message : error)
  process.exit(1)
})

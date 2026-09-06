import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Guards the migration journal against the drift that manual editing caused before: a journal entry
// whose .sql file was renamed/removed, or a migration file with no journal entry. Either breaks the
// tracked runner (pnpm db:deploy), so it must fail in CI, not in production.

const DIR = join(process.cwd(), 'supabase', 'migrations')

interface JournalEntry {
  idx: number
  tag: string
}

const journal = JSON.parse(readFileSync(join(DIR, 'meta', '_journal.json'), 'utf8')) as {
  entries: JournalEntry[]
}

describe('konsistensi journal migrasi', () => {
  it('setiap entri journal punya berkas .sql', () => {
    const missing = journal.entries
      .filter((e) => !existsSync(join(DIR, `${e.tag}.sql`)))
      .map((e) => e.tag)
    expect(missing, `entri tanpa berkas: ${missing.join(', ')}`).toEqual([])
  })

  it('setiap berkas .sql punya entri journal', () => {
    const tags = new Set(journal.entries.map((e) => e.tag))
    const orphanFiles = readdirSync(DIR)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => f.replace(/\.sql$/, ''))
      .filter((name) => !tags.has(name))
    expect(orphanFiles, `berkas tanpa entri: ${orphanFiles.join(', ')}`).toEqual([])
  })

  it('idx journal unik dan naik', () => {
    const idxs = journal.entries.map((e) => e.idx)
    expect(new Set(idxs).size).toBe(idxs.length)
    expect([...idxs]).toEqual([...idxs].sort((a, b) => a - b))
  })
})

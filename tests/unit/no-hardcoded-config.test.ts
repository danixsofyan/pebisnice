import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Menjaga agar nilai yang seharusnya berasal dari environment atau database
 * tidak kembali ditulis mati di kode.
 *
 * Pernah terjadi: host project Supabase tertulis di dua komponen dan di CSP,
 * sehingga berpindah project berarti menyunting kode. Test ini membuat
 * kejadian itu gagal di CI, bukan ditemukan saat produksi bermasalah.
 */

const ROOT = process.cwd()
const SCANNED_DIRS = ['app', 'components', 'lib', 'hooks']
const SKIPPED_DIRS = new Set(['node_modules', '.next', 'ui'])

function collectSourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue

    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      collectSourceFiles(fullPath, found)
      continue
    }
    if (/\.tsx?$/.test(entry)) found.push(fullPath)
  }
  return found
}

const SOURCE_FILES = SCANNED_DIRS.flatMap((dir) => collectSourceFiles(join(ROOT, dir)))

function relative(path: string): string {
  return path.slice(ROOT.length + 1)
}

function findOffenders(pattern: RegExp): string[] {
  return SOURCE_FILES.filter((file) => pattern.test(readFileSync(file, 'utf8'))).map(relative)
}

/** Membuang komentar, supaya contoh di dokumentasi tidak terbaca sebagai kode. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function findOffendersInCode(pattern: RegExp): string[] {
  return SOURCE_FILES.filter((file) => pattern.test(stripComments(readFileSync(file, 'utf8')))).map(
    relative
  )
}

describe('tidak ada konfigurasi yang ditulis mati', () => {
  it('menemukan berkas sumber untuk dipindai', () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(40)
  })

  it('tidak menyebut host project Supabase secara literal', () => {
    // Cocokkan `<ref>.supabase.co`, tetapi bukan placeholder di dokumentasi.
    expect(findOffenders(/[a-z0-9]{12,}\.supabase\.co/)).toEqual([])
  })

  it('tidak menyebut domain aplikasi secara literal', () => {
    expect(findOffenders(/pebisnice\.(my\.)?id/)).toEqual([])
  })

  it('tidak menyisipkan connection string ke kode', () => {
    expect(findOffenders(/postgres(ql)?:\/\/[^\s'"`]+/)).toEqual([])
  })

  it('tidak menulis zona waktu tenant di query laporan', () => {
    const reportRepository = readFileSync(
      join(ROOT, 'lib/repositories/report.repository.ts'),
      'utf8'
    )

    expect(reportRepository).not.toContain("'Asia/Jakarta'")
    expect(reportRepository).toContain('filter.timezone')
  })

  it('menyajikan berkas unggahan lewat proxy satu-origin, bukan URL publik', () => {
    const key = readFileSync(join(ROOT, 'lib/storage/object-key.ts'), 'utf8')

    // URL yang dilihat klien harus relatif ke aplikasi; host penyedia storage
    // tidak boleh muncul di sisi klien sama sekali.
    expect(key).toContain('/api/v1/files/')
  })

  it('tidak mengunci bentuk jalur milik satu penyedia storage', () => {
    // `/storage/v1/object/public` adalah bentuk milik Supabase. Menyusunnya di
    // kode berarti pindah penyedia harus menyunting kode, bukan konfigurasi.
    expect(findOffendersInCode(/storage\/v1\/object/)).toEqual([])
  })

  it('mendokumentasikan setiap process.env yang dipakai di .env.example', () => {
    const declared = new Set(
      readFileSync(join(ROOT, '.env.example'), 'utf8')
        .split('\n')
        .map((line) => line.match(/^([A-Z_0-9]+)=/)?.[1])
        .filter((name): name is string => Boolean(name))
    )

    // Disediakan runtime, bukan oleh kita.
    const PROVIDED_BY_RUNTIME = new Set(['NODE_ENV', 'VERCEL_ENV'])

    const used = new Set<string>()
    for (const file of SOURCE_FILES) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/process\.env\.([A-Z_0-9]+)/g)) {
        used.add(match[1]!)
      }
    }

    const undocumented = [...used].filter(
      (name) => !declared.has(name) && !PROVIDED_BY_RUNTIME.has(name)
    )

    expect(undocumented, 'variabel dipakai tapi tidak ada di .env.example').toEqual([])
  })
})

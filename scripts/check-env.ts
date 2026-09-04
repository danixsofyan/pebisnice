import { config as loadEnv } from 'dotenv'

/**
 * Memeriksa kelengkapan dan kewajaran variabel lingkungan.
 *
 * Dibuat setelah menemukan `AUTH_SECRET` di produksi masih berisi teks
 * placeholder — nilai yang bisa ditebak berarti cookie sesi bisa dipalsukan,
 * dan tidak ada satupun yang memberi tahu. Pemeriksaan ini membuat kondisi
 * seperti itu terlihat, bukan diam.
 *
 * Jalankan: pnpm env:check
 */

loadEnv({ path: ['.env.local', '.env'] })

type Severity = 'error' | 'warn' | 'ok'

interface Check {
  name: string
  required: boolean
  note: string
  validate?: (value: string) => string | null
}

/** Pola yang menandakan nilai belum benar-benar diisi. */
const PLACEHOLDER_PATTERNS = [
  /ganti/i,
  /your[_-]/i,
  /disini/i,
  /placeholder/i,
  /change[_-]?me/i,
  /^\[.*\]$/,
  /xxx+/i,
]

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))
}

function requireEntropy(minLength: number) {
  return (value: string): string | null => {
    if (value.length < minLength) {
      return `terlalu pendek (${value.length} karakter, minimal ${minLength})`
    }
    if (looksLikePlaceholder(value)) {
      return 'masih berisi teks placeholder, bukan nilai acak'
    }
    return null
  }
}

const CHECKS: Check[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    note: 'gunakan transaction pooler port 6543 di produksi',
    validate: (value) => {
      if (!/^postgres(ql)?:\/\//.test(value)) return 'bukan connection string PostgreSQL'
      if (looksLikePlaceholder(value)) return 'masih berisi teks placeholder'
      if (/:5432\//.test(value) && /\.pooler\./.test(value)) {
        return null
      }
      if (/db\.[a-z0-9]+\.supabase\.co:5432/.test(value)) {
        return 'memakai koneksi langsung; serverless sebaiknya lewat pooler port 6543'
      }
      return null
    },
  },
  {
    name: 'AUTH_SECRET',
    required: true,
    note: 'openssl rand -base64 32',
    validate: requireEntropy(32),
  },
  {
    name: 'AUTH_GOOGLE_ID',
    required: true,
    note: 'dari Google Cloud Console',
    validate: (value) =>
      value.endsWith('.apps.googleusercontent.com') ? null : 'format client id tidak lazim',
  },
  {
    name: 'AUTH_GOOGLE_SECRET',
    required: true,
    note: 'dari Google Cloud Console',
    validate: requireEntropy(20),
  },
  {
    name: 'ENCRYPTION_SECRET_KEY',
    required: true,
    note: 'openssl rand -base64 32; jangan diubah setelah ada token tersimpan',
    validate: requireEntropy(32),
  },
  {
    name: 'CRON_SECRET',
    required: true,
    note: 'openssl rand -hex 32; tanpa ini endpoint cron menolak semua request',
    validate: requireEntropy(32),
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_STORAGE_HOST',
    required: false,
    note: 'hanya perlu bila ada fitur unggah gambar',
    validate: (value) =>
      /^[a-z0-9-]+\.supabase\.co$/.test(value) ? null : 'format harus <ref>.supabase.co',
  },
  { name: 'LOG_LEVEL', required: false, note: 'bawaan: info' },
]

const results = CHECKS.map((check) => {
  const value = process.env[check.name]?.trim() ?? ''

  if (!value) {
    return {
      name: check.name,
      severity: (check.required ? 'error' : 'warn') as Severity,
      message: check.required ? 'BELUM DIISI' : `kosong (opsional — ${check.note})`,
    }
  }

  const problem = check.validate?.(value) ?? null
  if (problem) {
    return {
      name: check.name,
      severity: (check.required ? 'error' : 'warn') as Severity,
      message: problem,
    }
  }

  return { name: check.name, severity: 'ok' as Severity, message: 'ok' }
})

const ICON: Record<Severity, string> = { error: 'GAGAL ', warn: 'PERIKSA', ok: 'OK    ' }

console.log('Pemeriksaan variabel lingkungan\n')
for (const result of results) {
  console.log(`  ${ICON[result.severity]}  ${result.name.padEnd(36)} ${result.message}`)
}

const errors = results.filter((r) => r.severity === 'error')
const warns = results.filter((r) => r.severity === 'warn')

console.log(
  `\n${results.length} diperiksa · ${errors.length} gagal · ${warns.length} perlu dilihat`
)

if (errors.length > 0) {
  console.log('\nPerbaiki yang GAGAL sebelum deploy. Lihat .env.example untuk penjelasannya.')
  process.exitCode = 1
}

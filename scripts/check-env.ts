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
  {
    name: 'SUPABASE_S3_ENDPOINT',
    required: false,
    note: 'https://<ref>.storage.supabase.co/storage/v1/s3',
    validate: (value) =>
      /^https:\/\/[a-z0-9-]+\.storage\.supabase\.co\/storage\/v1\/s3$/.test(value)
        ? null
        : 'format harus https://<ref>.storage.supabase.co/storage/v1/s3',
  },
  {
    name: 'SUPABASE_S3_REGION',
    required: false,
    note: 'mis. ap-southeast-1',
    validate: (value) =>
      /^[a-z]{2}-[a-z]+-\d$/.test(value) ? null : 'format region AWS tidak lazim',
  },
  {
    name: 'SUPABASE_S3_ACCESS_KEY_ID',
    required: false,
    note: 'dari Supabase Settings -> Storage -> S3 Connection',
    validate: requireEntropy(20),
  },
  {
    name: 'SUPABASE_S3_SECRET_ACCESS_KEY',
    required: false,
    note: 'SERVER-ONLY, jangan diberi awalan NEXT_PUBLIC_',
    validate: requireEntropy(40),
  },
  {
    name: 'SUPABASE_STORAGE_BUCKET',
    required: false,
    note: 'buat dulu bucket-nya di Supabase Storage',
  },
]

/** Variabel yang harus terisi bersama-sama, atau kosong semuanya. */
const GROUPS: Array<{ label: string; members: string[] }> = [
  {
    label: 'Supabase S3',
    members: [
      'SUPABASE_S3_ENDPOINT',
      'SUPABASE_S3_REGION',
      'SUPABASE_S3_ACCESS_KEY_ID',
      'SUPABASE_S3_SECRET_ACCESS_KEY',
      'SUPABASE_STORAGE_BUCKET',
    ],
  },
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

/**
 * Konfigurasi yang terisi separuh lebih berbahaya daripada yang kosong: fitur
 * tampak aktif tapi gagal saat dipakai.
 */
const groupProblems = GROUPS.flatMap((group) => {
  const filled = group.members.filter((name) => (process.env[name] ?? '').trim().length > 0)
  if (filled.length === 0 || filled.length === group.members.length) return []

  const missing = group.members.filter((name) => !filled.includes(name))
  return [`${group.label}: terisi separuh — masih kosong: ${missing.join(', ')}`]
})

const ICON: Record<Severity, string> = { error: 'GAGAL ', warn: 'PERIKSA', ok: 'OK    ' }

console.log('Pemeriksaan variabel lingkungan\n')
for (const result of results) {
  console.log(`  ${ICON[result.severity]}  ${result.name.padEnd(36)} ${result.message}`)
}

for (const problem of groupProblems) {
  console.log(`  ${ICON.error}  ${problem}`)
}

const errors = results.filter((r) => r.severity === 'error')
const warns = results.filter((r) => r.severity === 'warn')

const failures = errors.length + groupProblems.length
console.log(`\n${results.length} diperiksa · ${failures} gagal · ${warns.length} perlu dilihat`)

if (errors.length > 0 || groupProblems.length > 0) {
  console.log('\nPerbaiki yang GAGAL sebelum deploy. Lihat .env.example untuk penjelasannya.')
  process.exitCode = 1
}

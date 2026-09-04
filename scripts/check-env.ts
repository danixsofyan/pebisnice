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
  { name: 'LOG_LEVEL', required: false, note: 'bawaan: info' },
  {
    name: 'STORAGE_ENDPOINT',
    required: false,
    note: 'URL endpoint S3-compatible milik penyedia mana pun',
    validate: (value) => {
      if (!/^https:\/\//.test(value)) return 'harus URL https://'
      if (looksLikePlaceholder(value)) return 'masih berisi teks placeholder'
      return null
    },
  },
  {
    name: 'STORAGE_REGION',
    required: false,
    // Cloudflare R2 memakai nilai literal `auto`, jadi bentuk region AWS tidak
    // boleh dipaksakan di sini.
    note: 'mis. ap-southeast-1, atau auto untuk Cloudflare R2',
    validate: (value) =>
      /^[a-z0-9-]+$/.test(value) ? null : 'hanya huruf kecil, angka, dan tanda hubung',
  },
  {
    name: 'STORAGE_ACCESS_KEY_ID',
    required: false,
    note: 'dari panel penyedia storage, bagian S3 credentials',
    validate: requireEntropy(20),
  },
  {
    name: 'STORAGE_SECRET_ACCESS_KEY',
    required: false,
    note: 'SERVER-ONLY, jangan diberi awalan NEXT_PUBLIC_',
    validate: requireEntropy(40),
  },
  {
    name: 'STORAGE_BUCKET',
    required: false,
    note: 'buat dulu bucket-nya di penyedia storage',
  },
  {
    name: 'MIDTRANS_SERVER_KEY',
    required: false,
    note: 'SB-Mid-server-... (sandbox) atau Mid-server-... (produksi)',
    validate: (value) =>
      /^(SB-)?Mid-server-/.test(value) ? null : 'bukan format server key Midtrans',
  },
  {
    name: 'MIDTRANS_CLIENT_KEY',
    required: false,
    note: 'SB-Mid-client-... (sandbox) atau Mid-client-... (produksi)',
    validate: (value) =>
      /^(SB-)?Mid-client-/.test(value) ? null : 'bukan format client key Midtrans',
  },
  { name: 'MIDTRANS_MERCHANT_ID', required: false, note: 'dari dashboard Midtrans' },
  {
    name: 'MIDTRANS_IS_PRODUCTION',
    required: false,
    note: 'true hanya untuk Midtrans live; bawaan sandbox',
    validate: (value) => (value === 'true' || value === 'false' ? null : 'isi true atau false'),
  },
]

/** Variabel yang harus terisi bersama-sama, atau kosong semuanya. */
const GROUPS: Array<{ label: string; members: string[] }> = [
  {
    label: 'Storage',
    members: [
      'STORAGE_ENDPOINT',
      'STORAGE_REGION',
      'STORAGE_ACCESS_KEY_ID',
      'STORAGE_SECRET_ACCESS_KEY',
      'STORAGE_BUCKET',
    ],
  },
  {
    label: 'Midtrans',
    members: ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY'],
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

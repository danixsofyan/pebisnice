process.env.ENCRYPTION_SECRET_KEY ??= 'test-encryption-key-32-characters'
process.env.LOG_LEVEL ??= 'silent'

// postgres.js membuka koneksi secara lazy, jadi URL palsu ini cukup untuk
// mengimpor modul yang menyentuh lib/db tanpa pernah menghubungi database.
process.env.DATABASE_URL ??= 'postgresql://test:test@127.0.0.1:5432/test'

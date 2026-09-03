import { config as loadEnv } from 'dotenv'
import type { Config } from 'drizzle-kit'

loadEnv({ path: ['.env.local', '.env'] })

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

export default {
  schema: './lib/db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
} satisfies Config

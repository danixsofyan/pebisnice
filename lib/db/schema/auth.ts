import { boolean, index, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
import { tz } from './primitives'

/**
 * Tabel milik Auth.js. Bentuknya ditentukan DrizzleAdapter, jadi tidak
 * mengikuti kolom siklus hidup standar dan tidak dilindungi RLS.
 */
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: tz('emailVerified'),
  image: text('image'),
  plan: text('plan').default('free').notNull(),
  timezone: text('timezone').default('Asia/Jakarta').notNull(),
  /** Admin platform (pengelola langganan), bukan pengguna bisnis biasa. */
  isPlatformAdmin: boolean('is_platform_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index('accounts_user_id_idx').on(account.userId),
  ]
)

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: tz('expires').notNull(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)]
)

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: tz('expires').notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

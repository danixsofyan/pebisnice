import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { tz } from './primitives'

// Auth.js tables; shape is set by the DrizzleAdapter, so no standard lifecycle columns and no RLS.
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: tz('emailVerified'),
  image: text('image'),
  // Email/password login. Null for accounts that only use Google. must_change_password forces a
  // reset on first login after an invite with a temporary password.
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').default(false).notNull(),
  plan: text('plan').default('free').notNull(),
  timezone: text('timezone').default('Asia/Jakarta').notNull(),
  /** Platform admin (manages subscriptions), not a regular business user. */
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

// Password reset. Only the SHA-256 of the token is stored; the raw token lives only in the emailed
// link. Single-use (used_at) and short-lived (expires_at).
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: tz('expires_at').notNull(),
    usedAt: tz('used_at'),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('password_reset_token_hash_idx').on(t.tokenHash),
    index('password_reset_user_idx').on(t.userId),
  ]
)

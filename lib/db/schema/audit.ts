import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { auditActionEnum } from './enums'
import { projects } from './projects'
import { tz } from './primitives'

/**
 * Immutable. Trigger `fn_prevent_mutation()` menolak UPDATE dan DELETE.
 *
 * `project_id` nullable karena event login/logout tidak terikat project, jadi
 * tabel ini dikecualikan dari policy RLS dan dibatasi di data-access layer.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    action: auditActionEnum('action').notNull(),
    resource: text('resource').notNull(),
    resourceId: text('resource_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('audit_user_id_idx').on(t.userId),
    index('audit_project_id_idx').on(t.projectId),
    index('audit_created_at_idx').on(t.createdAt.desc()),
  ]
)

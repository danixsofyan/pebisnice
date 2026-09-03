import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { branches } from './branches'
import { actorColumns, tenantColumn } from './columns'
import { teamRoleEnum, teamStatusEnum } from './enums'
import { lifecycleColumns, tz } from './primitives'

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: teamRoleEnum('role').default('operator').notNull(),
    status: teamStatusEnum('status').default('invited').notNull(),
    inviteToken: text('invite_token'),
    invitedAt: tz('invited_at').defaultNow().notNull(),
    acceptedAt: tz('accepted_at'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('team_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('team_user_id_idx')
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    index('team_branch_id_idx')
      .on(t.branchId)
      .where(sql`${t.deletedAt} is null`),
    index('team_created_by_idx').on(t.createdBy),
    index('team_updated_by_idx').on(t.updatedBy),
    uniqueIndex('team_project_email_unique')
      .on(t.projectId, t.email)
      .where(sql`${t.deletedAt} is null`),
  ]
)

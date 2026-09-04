import { text, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { projects } from './projects'

/** Change-actor trail (docs/db-standards.md section 3). */
export const actorColumns = {
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
}

// Tenant key. Required on every business table so the RLS policy project_id = current_setting('app.current_project_id') works.
export const tenantColumn = {
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
}

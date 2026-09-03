import { text, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { projects } from './projects'

/** Jejak pelaku perubahan (docs/db-standards.md §3). */
export const actorColumns = {
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
}

/**
 * Kunci tenant. Wajib ada di setiap tabel bisnis agar policy RLS
 * `project_id = current_setting('app.current_project_id')` dapat bekerja.
 */
export const tenantColumn = {
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
}

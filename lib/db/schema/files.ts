import { index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { stores } from './channels'
import { actorColumns, tenantColumn } from './columns'
import { lifecycleColumns, tz } from './primitives'

export const fileUploads = pgTable(
  'file_uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    mimeType: text('mime_type').notNull(),
    fileType: text('file_type').notNull(),
    uploadedAt: tz('uploaded_at').defaultNow().notNull(),
    processedAt: tz('processed_at'),
    status: text('status').default('pending').notNull(),
    rowsTotal: integer('rows_total'),
    rowsProcessed: integer('rows_processed'),
    rowsFailed: integer('rows_failed'),
    errorDetails: jsonb('error_details'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('uploads_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('uploads_store_id_idx')
      .on(t.storeId)
      .where(sql`${t.deletedAt} is null`),
    index('uploads_user_id_idx').on(t.userId),
    index('uploads_created_by_idx').on(t.createdBy),
    index('uploads_updated_by_idx').on(t.updatedBy),
  ]
)

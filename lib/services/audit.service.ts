import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { requirePermission } from '@/lib/rbac'

export interface AuditFilter {
  action?: string
  resource?: string
  limit?: number
  offset?: number
}

export interface AuditRow {
  id: string
  action: string
  resource: string
  resourceId: string | null
  actorEmail: string | null
  ipAddress: string | null
  metadata: unknown
  createdAt: Date
}

export class AuditService {
  // Read the immutable audit trail for a project, newest first. Gated to
  // project:edit (owner/admin) and always scoped by project id.
  async list(projectId: string, userId: string, filter: AuditFilter = {}): Promise<AuditRow[]> {
    await requirePermission(projectId, userId, 'project:edit')

    const conditions = [eq(auditLogs.projectId, projectId)]
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action as 'create'))
    if (filter.resource) conditions.push(eq(auditLogs.resource, filter.resource))

    return db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        actorEmail: users.email,
        ipAddress: auditLogs.ipAddress,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(filter.limit ?? 100, 200))
      .offset(filter.offset ?? 0)
  }
}

export const auditService = new AuditService()

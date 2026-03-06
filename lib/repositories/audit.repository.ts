import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { logger } from '@/lib/logging/logger'

export type NewAuditLog = {
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'sync' | 'invite'
  resource: string
  resourceId?: string | null
  userId?: string | null
  projectId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: unknown
}

export class AuditRepository {
  async log(data: NewAuditLog): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        userId: data.userId,
        projectId: data.projectId,
        ipAddress: data.ipAddress,

        userAgent: data.userAgent?.slice(0, 500),

        metadata: data.metadata,
      })
    } catch (error) {
      logger.error({ error }, '[Audit Log Failed]')
    }
  }
}

export const auditRepository = new AuditRepository()

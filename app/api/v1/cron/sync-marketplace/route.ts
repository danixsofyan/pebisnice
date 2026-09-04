import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, stores } from '@/lib/db/schema'
import { eq, and, lt, or, isNull, isNotNull } from 'drizzle-orm'
import { transactionService } from '@/lib/services/transaction.service'
import { withTenant } from '@/lib/db/tenant'
import type { NewTransaction } from '@/lib/repositories/transaction.repository'
import { logger } from '@/lib/logging/logger'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'

const SYNC_INTERVAL_MS = 5 * 60 * 60 * 1000

type Store = typeof stores.$inferSelect

// Belum ada connector marketplace yang terpasang. Store dengan platform yang
// tidak terdaftar di sini dilewati dan dilaporkan sebagai `unsupported`, bukan
// dihitung sebagai sync yang berhasil.
const MARKETPLACE_CONNECTORS = new Map<
  Store['platform'],
  (store: Store) => Promise<NewTransaction[]>
>()

// `stores` dilindungi RLS, jadi tidak bisa dipindai lintas project dalam satu
// query. Cron menelusuri project satu per satu dengan tenant ter-set.
async function findStoresDueForSync(): Promise<Store[]> {
  const activeProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.isArchived, false), isNull(projects.deletedAt)))

  const dueThreshold = new Date(Date.now() - SYNC_INTERVAL_MS)

  const perProject = await Promise.all(
    activeProjects.map((project) =>
      withTenant(project.id, (tx) =>
        tx
          .select()
          .from(stores)
          .where(
            and(
              eq(stores.syncStatus, 'connected'),
              isNull(stores.deletedAt),
              isNotNull(stores.encryptedAccessToken),
              or(isNull(stores.lastSyncedAt), lt(stores.lastSyncedAt, dueThreshold))
            )
          )
      )
    )
  )

  return perProject.flat()
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    logger.warn('Unauthorized cron access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const storesToSync = await findStoresDueForSync()

  const due = storesToSync.filter((store) => MARKETPLACE_CONNECTORS.has(store.platform))
  const unsupported = storesToSync.length - due.length

  logger.info({ due: due.length, unsupported }, 'Starting scheduled sync')

  const results = await Promise.allSettled(
    due.map(async (store) => {
      const fetchTransactions = MARKETPLACE_CONNECTORS.get(store.platform)!
      return transactionService.syncTransactionsForStore(
        store.projectId,
        store.id,
        await fetchTransactions(store)
      )
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  for (const result of results) {
    if (result.status === 'rejected') logger.error({ error: result.reason }, 'Store sync failed')
  }

  if (unsupported > 0) {
    logger.warn({ unsupported }, 'Stores skipped: no connector implemented for platform')
  }

  logger.info({ succeeded, failed }, 'Scheduled sync complete')
  return NextResponse.json({ total: storesToSync.length, succeeded, failed, unsupported })
}

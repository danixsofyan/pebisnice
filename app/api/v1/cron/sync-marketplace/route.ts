import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq, and, lt, isNotNull } from 'drizzle-orm'
import { transactionService } from '@/lib/services/transaction.service'
import { logger } from '@/lib/logging/logger'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!authHeader || !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
    logger.warn('Unauthorized cron access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const storesToSync = await db
    .select()
    .from(stores)
    .where(
      and(
        eq(stores.syncStatus, 'connected'),
        isNotNull(stores.encryptedAccessToken),
        lt(stores.lastSyncedAt, new Date(Date.now() - 5 * 60 * 60 * 1000))
      )
    )

  logger.info({ count: storesToSync.length }, 'Starting scheduled sync')

  const results = await Promise.allSettled(
    storesToSync.map((store) => transactionService.syncTransactionsForStore(store.id, []))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  logger.info({ succeeded, failed }, 'Scheduled sync complete')
  return NextResponse.json({ total: storesToSync.length, succeeded, failed })
}

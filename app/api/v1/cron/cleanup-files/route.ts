import { NextResponse, type NextRequest } from 'next/server'
import { fileCleanupService } from '@/lib/services/file-cleanup.service'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { logger } from '@/lib/logging/logger'

// Sweep orphaned product photos, a backstop for cases the client can't handle (e.g. a tab closed after upload but before save). Guarded by CRON_SECRET like the other cron endpoints.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return new NextResponse(null, { status: 401 })
  }

  try {
    const result = await fileCleanupService.cleanupOrphanProductImages()
    return NextResponse.json(result)
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'file cleanup cron failed'
    )
    return new NextResponse(null, { status: 500 })
  }
}

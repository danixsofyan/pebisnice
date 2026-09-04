import { NextResponse, type NextRequest } from 'next/server'
import { fileCleanupService } from '@/lib/services/file-cleanup.service'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { logger } from '@/lib/logging/logger'

/**
 * Membersihkan foto produk yatim, jaring pengaman untuk kasus yang tak bisa
 * ditangani sisi klien (mis. tab ditutup setelah unggah tetapi sebelum simpan).
 * Dijaga `CRON_SECRET`, sama seperti endpoint cron lainnya.
 */
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

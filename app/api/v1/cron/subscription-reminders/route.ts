import { NextResponse, type NextRequest } from 'next/server'
import { subscriptionService } from '@/lib/services/subscription.service'
import { isAuthorizedCronRequest } from '@/lib/security/cron-auth'
import { logger } from '@/lib/logging/logger'

// Email owners whose subscription ends soon. Guarded by CRON_SECRET like the other cron endpoints.
// Idempotent: the service stamps renewal_reminder_sent_at, so re-runs the same day don't re-email.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return new NextResponse(null, { status: 401 })
  }

  try {
    const result = await subscriptionService.sendRenewalReminders()
    return NextResponse.json(result)
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'subscription reminder cron failed'
    )
    return new NextResponse(null, { status: 500 })
  }
}

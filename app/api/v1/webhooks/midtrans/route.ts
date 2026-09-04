import { NextResponse, type NextRequest } from 'next/server'
import { subscriptionPaymentService } from '@/lib/services/subscription-payment.service'
import { logger } from '@/lib/logging/logger'

// Midtrans payment notification, the source of truth for status. No auth header here; authenticity is proven by signature_key inside the payload, verified by the service. HTTP replies are chosen so Midtrans stops retrying handled events and retries only when it should.
export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const result = await subscriptionPaymentService.handleNotification(payload)

    if (result.ok) return NextResponse.json({ received: true })

    // Bad signature -> 403; unknown order -> 404; amount mismatch -> 422.
    const code = result.reason === 'signature' ? 403 : result.reason === 'unknown_order' ? 404 : 422
    return new NextResponse(null, { status: code })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'midtrans webhook failed'
    )
    // 500 so Midtrans retries; a transient failure doesn't lose the event.
    return new NextResponse(null, { status: 500 })
  }
}

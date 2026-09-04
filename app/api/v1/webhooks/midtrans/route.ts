import { NextResponse, type NextRequest } from 'next/server'
import { subscriptionPaymentService } from '@/lib/services/subscription-payment.service'
import { logger } from '@/lib/logging/logger'

/**
 * Notifikasi pembayaran Midtrans — sumber kebenaran status.
 *
 * Tidak ada auth header di sini; keaslian dibuktikan oleh signature_key di
 * dalam payload, yang diverifikasi service. Balasan HTTP dipilih agar Midtrans
 * berhenti mengulang untuk kejadian yang sudah tertangani, dan mengulang hanya
 * saat memang perlu.
 */
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

    // Tanda tangan salah → 403; order tak dikenal → 404; jumlah tak cocok → 422.
    const code = result.reason === 'signature' ? 403 : result.reason === 'unknown_order' ? 404 : 422
    return new NextResponse(null, { status: code })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      'midtrans webhook failed'
    )
    // 500 agar Midtrans mengulang; kegagalan sementara tidak menghilangkan event.
    return new NextResponse(null, { status: 500 })
  }
}

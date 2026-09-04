import { NextResponse } from 'next/server'
import { getAccessibleBranches, resolveSessionState } from '@/lib/auth/session-context'
import { posService } from '@/lib/services/pos.service'
import { toCsv, exportFileName } from '@/lib/export/csv'

const PAYMENT: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  card: 'Kartu',
  other: 'Lainnya',
}
const STATUS: Record<string, string> = {
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  returned: 'Retur',
  processing: 'Diproses',
  shipped: 'Dikirim',
}

export async function GET() {
  const state = await resolveSessionState()
  if (state.status !== 'ready') return new NextResponse(null, { status: 401 })

  const [sales, branches] = await Promise.all([
    posService.listSales(state.context.projectId, state.context.userId, {
      branchId: state.context.branchId,
      limit: 200,
    }),
    getAccessibleBranches(state.context),
  ])
  const branchName = new Map(branches.map((b) => [b.id, b.name]))

  const csv = toCsv(
    ['Order', 'Waktu', 'Cabang', 'Metode', 'Status', 'Total'],
    sales.map((s) => [
      s.orderId,
      s.orderDate.toISOString(),
      s.branchId ? (branchName.get(s.branchId) ?? '') : '',
      PAYMENT[s.paymentMethod ?? ''] ?? s.paymentMethod ?? '',
      STATUS[s.status] ?? s.status,
      s.netAmount,
    ])
  )

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName('transaksi-kasir', today, today)}"`,
    },
  })
}

import { NextResponse, type NextRequest } from 'next/server'
import { resolveSessionState } from '@/lib/auth/session-context'
import { expenseService } from '@/lib/services/expense.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { toCsv, exportFileName } from '@/lib/export/csv'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const CATEGORY: Record<string, string> = {
  rent: 'Sewa',
  salary: 'Gaji',
  utility: 'Utilitas',
  marketing: 'Pemasaran',
  shipping: 'Pengiriman',
  supply: 'Perlengkapan',
  tax: 'Pajak',
  other: 'Lainnya',
}

function monthRange(now: Date) {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))) }
}

export async function GET(request: NextRequest) {
  const state = await resolveSessionState()
  if (state.status !== 'ready') return new NextResponse(null, { status: 401 })
  if (!hasRolePermission(state.context.role, 'report:view')) {
    return new NextResponse(null, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const fallback = monthRange(new Date())
  const start = DATE.test(params.get('start') ?? '') ? params.get('start')! : fallback.start
  const end = DATE.test(params.get('end') ?? '') ? params.get('end')! : fallback.end

  const items = await expenseService.list(state.context.projectId, start, end, state.context.userId)
  const csv = toCsv(
    ['Tanggal', 'Kategori', 'Catatan', 'Nominal'],
    items.map((e) => [e.expenseDate, CATEGORY[e.category] ?? e.category, e.note, e.amount])
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName('pengeluaran', start, end)}"`,
    },
  })
}

import { NextResponse, type NextRequest } from 'next/server'
import { getAccessibleBranches, resolveSessionState } from '@/lib/auth/session-context'
import { reportService } from '@/lib/services/report.service'
import { readRequestMeta } from '@/lib/observability/server-context'
import { hasRolePermission } from '@/lib/authz/permissions'
import { toCsv, exportFileName } from '@/lib/export/csv'

const DATE = /^\d{4}-\d{2}-\d{2}$/

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

  const branches = await getAccessibleBranches(state.context)
  const requested = params.get('branch')
  const branchId = requested && branches.some((b) => b.id === requested) ? requested : null

  const meta = await readRequestMeta()
  const rows = await reportService.salesByProduct(
    { projectId: state.context.projectId, startDate: start, endDate: end, branchId },
    { userId: state.context.userId, ip: meta.ip, userAgent: meta.userAgent }
  )

  const csv = toCsv(
    ['Produk', 'Qty', 'Transaksi', 'Omzet'],
    rows.map((r) => [r.name, r.qty, r.orders, r.revenue])
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName('produk-terlaris', start, end)}"`,
    },
  })
}

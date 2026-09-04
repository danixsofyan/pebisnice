import { NextResponse, type NextRequest } from 'next/server'
import { resolveSessionState } from '@/lib/auth/session-context'
import { reportService } from '@/lib/services/report.service'
import { projectService } from '@/lib/services/project.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { readRequestMeta } from '@/lib/observability/server-context'
import { buildProfitLossPdf } from '@/lib/export/report-pdf'
import { exportFileName } from '@/lib/export/csv'

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
  if (!hasRolePermission(state.context.role, 'cost:view')) {
    return new NextResponse(null, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const fallback = monthRange(new Date())
  const start = DATE.test(params.get('start') ?? '') ? params.get('start')! : fallback.start
  const end = DATE.test(params.get('end') ?? '') ? params.get('end')! : fallback.end

  const meta = await readRequestMeta()
  const ctx = { userId: state.context.userId, ip: meta.ip, userAgent: meta.userAgent }
  const req = {
    projectId: state.context.projectId,
    startDate: start,
    endDate: end,
    branchId: state.context.branchId,
  }

  const [settings, pl, byCategory] = await Promise.all([
    projectService.getSettings(state.context.projectId, state.context.userId),
    reportService.profitLoss(req, ctx),
    reportService.expenseBreakdown(req, ctx),
  ])

  const pdf = await buildProfitLossPdf({
    businessName: settings.name,
    period: { start, end },
    pl,
    expensesByCategory: byCategory,
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${exportFileName('laba-rugi', start, end).replace('.csv', '.pdf')}"`,
    },
  })
}

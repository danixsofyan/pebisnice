import { NextResponse, type NextRequest } from 'next/server'
import { getAccessibleBranches, resolveSessionState } from '@/lib/auth/session-context'
import { cashSessionService } from '@/lib/services/cash-session.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { toCsv, exportFileName } from '@/lib/export/csv'

export async function GET(request: NextRequest) {
  const state = await resolveSessionState()
  if (state.status !== 'ready') return new NextResponse(null, { status: 401 })
  if (!hasRolePermission(state.context.role, 'cash_session:manage')) {
    return new NextResponse(null, { status: 403 })
  }

  const branches = await getAccessibleBranches(state.context)
  const requested = request.nextUrl.searchParams.get('branch')
  const branchId = requested && branches.some((b) => b.id === requested) ? requested : undefined

  const sessions = await cashSessionService.history(
    state.context.projectId,
    state.context.userId,
    branchId ? { branchId } : {}
  )

  const csv = toCsv(
    [
      'Buka',
      'Tutup',
      'Cabang',
      'Kasir buka',
      'Kasir tutup',
      'Status',
      'Modal awal',
      'Seharusnya',
      'Dihitung',
      'Selisih',
      'Catatan',
    ],
    sessions.map((s) => [
      s.openedAt.toISOString(),
      s.closedAt ? s.closedAt.toISOString() : '',
      s.branchName ?? '',
      s.openedByEmail ?? '',
      s.closedByEmail ?? '',
      s.status === 'open' ? 'Terbuka' : 'Ditutup',
      s.openingBalance,
      s.expectedBalance ?? '',
      s.countedBalance ?? '',
      s.difference ?? '',
      s.note ?? '',
    ])
  )

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName('shift-kasir', today, today)}"`,
    },
  })
}

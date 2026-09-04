import { Wallet, CalendarDays, Coins, Scale } from 'lucide-react'
import { getSessionContext } from '@/lib/auth/session-context'
import { reportService } from '@/lib/services/report.service'
import { expenseService } from '@/lib/services/expense.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { readRequestMeta } from '@/lib/observability/server-context'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { formatRupiahFromDecimal } from '@/lib/formatters'

function monthRange(now: Date) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return {
    start: iso(new Date(Date.UTC(y, m, 1))),
    end: iso(new Date(Date.UTC(y, m + 1, 0))),
    today: iso(now),
  }
}

export default async function DashboardPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'report:view')) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Selamat datang di {context.projectName}</h1>
        <p className="text-muted-foreground text-sm">
          Peran Anda difokuskan pada operasional. Buka <strong>Kasir</strong> untuk mulai mencatat
          penjualan.
        </p>
      </div>
    )
  }

  const { start, end, today } = monthRange(new Date())
  const meta = await readRequestMeta()
  const reportCtx = { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
  const period = {
    projectId: context.projectId,
    startDate: start,
    endDate: end,
    branchId: context.branchId,
  }

  const [daily, expenses] = await Promise.all([
    reportService.dailySales(period, reportCtx),
    expenseService.list(context.projectId, start, end, context.userId),
  ])

  const dayRevenue = (row: { marketplaceRevenue: string; posRevenue: string }) =>
    Number(row.marketplaceRevenue) + Number(row.posRevenue)

  const monthRevenue = daily.reduce((sum, row) => sum + dayRevenue(row), 0)
  const todayRevenue = daily.filter((r) => r.date === today).reduce((s, r) => s + dayRevenue(r), 0)
  const monthExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const cashDelta = monthRevenue - monthExpenses

  const maxDay = Math.max(1, ...daily.map(dayRevenue))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Ringkasan</h1>
        <p className="text-muted-foreground text-sm">{context.projectName} · bulan ini</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Omzet Bulan Ini"
          value={monthRevenue}
          format="currency"
          icon={<Wallet className="size-5 text-blue-500" />}
          iconClassName="bg-blue-500/20"
        />
        <KpiCard
          title="Omzet Hari Ini"
          value={todayRevenue}
          format="currency"
          icon={<CalendarDays className="size-5 text-emerald-500" />}
          iconClassName="bg-emerald-500/20"
        />
        <KpiCard
          title="Pengeluaran Bulan Ini"
          value={monthExpenses}
          format="currency"
          icon={<Coins className="size-5 text-amber-500" />}
          iconClassName="bg-amber-500/20"
        />
        <KpiCard
          title="Selisih Kas"
          value={cashDelta}
          format="currency"
          description="Omzet − pengeluaran (belum termasuk HPP)"
          icon={<Scale className="size-5 text-violet-500" />}
          iconClassName="bg-violet-500/20"
        />
      </div>

      <div className="border-border bg-card rounded-xl border p-5">
        <h2 className="mb-4 font-semibold">Tren pendapatan harian</h2>
        {daily.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada penjualan bulan ini.</p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {daily.map((row) => {
              const value = dayRevenue(row)
              const height = Math.max(2, Math.round((value / maxDay) * 100))
              return (
                <div
                  key={row.date}
                  className="bg-primary/70 hover:bg-primary flex-1 rounded-t"
                  style={{ height: `${height}%` }}
                  title={`${row.date}: ${formatRupiahFromDecimal(String(value))}`}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

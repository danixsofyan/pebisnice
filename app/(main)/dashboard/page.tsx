import { Wallet, CalendarDays, Coins, Scale } from 'lucide-react'
import { getSessionContext } from '@/lib/auth/session-context'
import { reportService } from '@/lib/services/report.service'
import { expenseService } from '@/lib/services/expense.service'
import { dashboardService } from '@/lib/services/dashboard.service'
import { posService } from '@/lib/services/pos.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { readRequestMeta } from '@/lib/observability/server-context'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { formatRupiahFromDecimal } from '@/lib/formatters'

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  card: 'Kartu',
  other: 'Lainnya',
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10)
}

function ranges(now: Date) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  return {
    start: iso(new Date(Date.UTC(y, m, 1))),
    end: iso(new Date(Date.UTC(y, m + 1, 0))),
    today: iso(now),
    prevStart: iso(new Date(Date.UTC(y, m - 1, 1))),
    prevEnd: iso(new Date(Date.UTC(y, m, 0))),
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

  const { start, end, today, prevStart, prevEnd } = ranges(new Date())
  const meta = await readRequestMeta()
  const reportCtx = { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
  const base = { projectId: context.projectId, branchId: context.branchId }

  const [daily, prevDaily, expenses, extras, recent] = await Promise.all([
    reportService.dailySales({ ...base, startDate: start, endDate: end }, reportCtx),
    reportService.dailySales({ ...base, startDate: prevStart, endDate: prevEnd }, reportCtx),
    expenseService.list(context.projectId, start, end, context.userId),
    dashboardService.extras(context.projectId, context.userId, context.branchId, start, end),
    posService.listSales(context.projectId, context.userId, {
      branchId: context.branchId,
      limit: 5,
    }),
  ])

  const dayRevenue = (row: { marketplaceRevenue: string; posRevenue: string }) =>
    Number(row.marketplaceRevenue) + Number(row.posRevenue)

  const monthRevenue = daily.reduce((sum, row) => sum + dayRevenue(row), 0)
  const prevRevenue = prevDaily.reduce((sum, row) => sum + dayRevenue(row), 0)
  const todayRevenue = daily.filter((r) => r.date === today).reduce((s, r) => s + dayRevenue(r), 0)
  const monthExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const cashDelta = monthRevenue - monthExpenses
  const revenueChange =
    prevRevenue > 0 ? ((monthRevenue - prevRevenue) / prevRevenue) * 100 : undefined

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
          {...(revenueChange !== undefined ? { change: revenueChange } : {})}
          format="currency"
          description="vs bulan lalu"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Produk terlaris">
          {extras.topProducts.length === 0 ? (
            <Empty>Belum ada penjualan.</Empty>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {extras.topProducts.map((p) => (
                <li key={p.name} className="flex items-center justify-between py-2">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {p.qty} · {formatRupiahFromDecimal(p.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Stok menipis (≤5)">
          {extras.lowStock.length === 0 ? (
            <Empty>Semua stok aman.</Empty>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {extras.lowStock.map((s) => (
                <li key={s.name} className="flex items-center justify-between py-2">
                  <span>{s.name}</span>
                  <span className="text-destructive font-medium tabular-nums">{s.stockQty}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Metode pembayaran (kasir)">
          {extras.paymentBreakdown.length === 0 ? (
            <Empty>Belum ada transaksi kasir.</Empty>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {extras.paymentBreakdown.map((p) => (
                <li key={p.method} className="flex items-center justify-between py-2">
                  <span>
                    {PAYMENT_LABEL[p.method] ?? p.method}{' '}
                    <span className="text-muted-foreground text-xs">({p.count})</span>
                  </span>
                  <span className="tabular-nums">{formatRupiahFromDecimal(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Transaksi terbaru">
          {recent.length === 0 ? (
            <Empty>Belum ada transaksi.</Empty>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs">{t.orderId}</span>
                  <span className="tabular-nums">{formatRupiahFromDecimal(t.netAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>
}

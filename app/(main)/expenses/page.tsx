import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { expenseService } from '@/lib/services/expense.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { DeleteExpenseButton } from '@/components/expenses/delete-expense-button'

const CATEGORY_LABEL: Record<string, string> = {
  rent: 'Sewa',
  salary: 'Gaji',
  utility: 'Utilitas',
  marketing: 'Pemasaran',
  shipping: 'Pengiriman',
  supply: 'Perlengkapan',
  tax: 'Pajak',
  other: 'Lainnya',
}

function monthRange(now: Date): { start: string; end: string; today: string } {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return {
    start: iso(new Date(Date.UTC(y, m, 1))),
    end: iso(new Date(Date.UTC(y, m + 1, 0))),
    today: iso(now),
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function ExpensesPage() {
  const context = await getSessionContext()
  const canManage = hasRolePermission(context.role, 'expense:manage')
  const canView = hasRolePermission(context.role, 'report:view')

  if (!canView) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Peran Anda tidak dapat melihat pengeluaran.
        </p>
      </div>
    )
  }

  const { start, end, today } = monthRange(new Date())
  const branches = await getAccessibleBranches(context)
  const items = await expenseService.list(context.projectId, start, end, context.userId)

  const total = items.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Pengeluaran</h1>
          <p className="text-muted-foreground text-sm">
            Bulan ini · total {formatRupiahFromDecimal(String(total))}
          </p>
        </div>
        {canManage ? <ExpenseForm branches={branches} today={today} /> : null}
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada pengeluaran bulan ini.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Catatan</th>
                <th className="px-4 py-3 text-right font-medium">Nominal</th>
                {canManage ? <th className="px-4 py-3 text-right font-medium">Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-border border-t">
                  <td className="text-muted-foreground px-4 py-3">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                  <td className="text-muted-foreground px-4 py-3">{e.note ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(e.amount)}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <DeleteExpenseButton expenseId={e.id} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

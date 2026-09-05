import { getSessionContext } from '@/lib/auth/session-context'
import { promoService } from '@/lib/services/promo.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { PromotionForm } from '@/components/promotions/promotion-form'
import { TogglePromotionButton } from '@/components/promotions/toggle-promotion-button'

function fmtDate(value: Date | string | null): string {
  return value
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
    : '—'
}

function discountLabel(row: {
  discountType: 'percent' | 'nominal'
  percentBasisPoints: number
  amount: string
  maxDiscount: string | null
}): string {
  if (row.discountType === 'percent') {
    const pct = row.percentBasisPoints / 100
    const cap = row.maxDiscount ? ` (maks ${formatRupiahFromDecimal(row.maxDiscount)})` : ''
    return `${pct}%${cap}`
  }
  return formatRupiahFromDecimal(row.amount)
}

export default async function PromotionsPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'product:manage')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Voucher hanya untuk peran yang mengelola produk.
        </p>
      </div>
    )
  }

  const rows = await promoService.list(context.projectId, context.userId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Voucher &amp; Promo</h1>
          <p className="text-muted-foreground text-sm">
            Kode diskon yang bisa dipakai kasir saat transaksi.
          </p>
        </div>
        <PromotionForm />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada voucher.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Kode</th>
                <th className="px-4 py-3 font-medium">Diskon</th>
                <th className="px-4 py-3 text-right font-medium">Min. belanja</th>
                <th className="px-4 py-3 text-right font-medium">Terpakai</th>
                <th className="px-4 py-3 font-medium">Periode</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-border border-t align-top">
                  <td className="px-4 py-3">
                    <div className="font-mono font-medium">{r.code}</div>
                    <div className="text-muted-foreground text-xs">{r.name}</div>
                  </td>
                  <td className="px-4 py-3">{discountLabel(r)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRupiahFromDecimal(r.minSpend)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.usedCount}
                    {r.usageLimit !== null ? ` / ${r.usageLimit}` : ''}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {fmtDate(r.startsAt)} — {fmtDate(r.endsAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TogglePromotionButton id={r.id} isActive={r.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

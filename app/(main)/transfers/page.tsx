import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { transferService } from '@/lib/services/transfer.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { TransferForm } from '@/components/transfers/transfer-form'

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export default async function TransfersPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'inventory:adjust')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Transfer stok hanya untuk peran yang mengelola inventaris.
        </p>
      </div>
    )
  }

  const branches = await getAccessibleBranches(context)
  const canTransfer = branches.length >= 2
  const first = branches[0]
  const items = first ? await catalogService.list(context.projectId, first.id, context.userId) : []
  const productOptions = items.map((i) => ({
    variantId: i.variantId,
    label: i.variantName ? `${i.name} · ${i.variantName}` : i.name,
  }))
  const transfers = await transferService.list(context.projectId, context.userId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Transfer Stok</h1>
          <p className="text-muted-foreground text-sm">Pindah stok antar-cabang</p>
        </div>
        {canTransfer ? (
          <TransferForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            products={productOptions}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Butuh minimal dua cabang.</p>
        )}
      </div>

      {transfers.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada transfer stok.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Dari</th>
                <th className="px-4 py-3 font-medium">Ke</th>
                <th className="px-4 py-3 text-right font-medium">Barang</th>
                <th className="px-4 py-3 text-right font-medium">Total unit</th>
                <th className="px-4 py-3 font-medium">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-border border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{fmt(t.createdAt)}</td>
                  <td className="px-4 py-3">{t.fromBranch ?? '—'}</td>
                  <td className="px-4 py-3">{t.toBranch ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.itemCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.totalQty}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t.createdByEmail ?? '—'}
                    {t.note ? <div className="text-xs">{t.note}</div> : null}
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

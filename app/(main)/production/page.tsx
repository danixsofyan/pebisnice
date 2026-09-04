import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { productionService } from '@/lib/services/production.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { ProductionForm } from '@/components/production/production-form'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function ProductionPage() {
  const context = await getSessionContext()
  const branches = await getAccessibleBranches(context)
  const branch = branches[0]

  if (!branch) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Belum ada cabang</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Produksi dicatat per cabang; buat cabang lebih dulu.
        </p>
      </div>
    )
  }

  const [items, logs] = await Promise.all([
    catalogService.list(context.projectId, branch.id, context.userId),
    productionService.listByBranch(context.projectId, branch.id, context.userId),
  ])

  const nameOf = new Map(
    items.map((i) => [i.variantId, i.variantName ? `${i.name} · ${i.variantName}` : i.name])
  )
  const finishedOptions = items
    .filter((i) => i.type === 'finished')
    .map((i) => ({ variantId: i.variantId, label: nameOf.get(i.variantId) ?? i.name }))
  const materialOptions = items
    .filter((i) => i.type === 'material')
    .map((i) => ({
      variantId: i.variantId,
      label: `${nameOf.get(i.variantId) ?? i.name} (stok ${i.stockQty})`,
    }))

  const canManage = hasRolePermission(context.role, 'production:manage')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Produksi</h1>
          <p className="text-muted-foreground text-sm">Cabang {branch.name}</p>
        </div>
        {canManage ? (
          finishedOptions.length === 0 || materialOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Butuh minimal satu produk jadi dan satu bahan.
            </p>
          ) : (
            <ProductionForm
              branchId={branch.id}
              finishedOptions={finishedOptions}
              materialOptions={materialOptions}
            />
          )
        ) : null}
      </div>

      {logs.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada catatan produksi.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Produk jadi</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-border border-t">
                  <td className="text-muted-foreground px-4 py-3">
                    {formatDate(log.productionDate)}
                  </td>
                  <td className="px-4 py-3">{nameOf.get(log.productVariantId) ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{log.quantity}</td>
                  <td className="text-muted-foreground px-4 py-3">{log.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

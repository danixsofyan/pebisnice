import Link from 'next/link'
import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { catalogService } from '@/lib/services/catalog.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { OpnameForm } from '@/components/inventory/opname-form'

export default async function OpnamePage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'inventory:adjust')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Stok opname hanya untuk peran yang mengelola inventaris.
        </p>
      </div>
    )
  }

  const branches = await getAccessibleBranches(context)
  const params = await searchParams
  const branch =
    (params.branch && branches.find((b) => b.id === params.branch)) || branches[0] || null

  const items = branch
    ? await catalogService.list(context.projectId, branch.id, context.userId)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Stok Opname</h1>
          <p className="text-muted-foreground text-sm">
            Hitung fisik &amp; sesuaikan stok {branch ? `· ${branch.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 ? (
            <form action="/inventory/opname">
              <select
                name="branch"
                defaultValue={branch?.id ?? ''}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button className="border-input hover:bg-muted/40 ml-2 inline-flex h-9 items-center rounded-md border px-3 text-sm">
                Ganti cabang
              </button>
            </form>
          ) : null}
          <Link
            href="/inventory"
            className="border-input hover:bg-muted/40 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
          >
            ← Inventaris
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada produk untuk dihitung.
        </p>
      ) : (
        <OpnameForm
          branchId={branch!.id}
          items={items.map((i) => ({
            variantId: i.variantId,
            name: i.variantName ? `${i.name} · ${i.variantName}` : i.name,
            stockQty: i.stockQty,
          }))}
        />
      )}
    </div>
  )
}

import { getSessionContext } from '@/lib/auth/session-context'
import { purchasingService } from '@/lib/services/purchasing.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { SupplierForm } from '@/components/purchasing/supplier-form'
import { SuppliersTable } from '@/components/purchasing/suppliers-table'

export default async function SuppliersPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'inventory:adjust')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Supplier hanya untuk peran yang mengelola inventaris/pembelian.
        </p>
      </div>
    )
  }

  const suppliers = await purchasingService.listSuppliers(context.projectId, context.userId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Supplier</h1>
          <p className="text-muted-foreground text-sm">{suppliers.length} supplier</p>
        </div>
        <SupplierForm />
      </div>

      {suppliers.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada supplier.
        </p>
      ) : (
        <SuppliersTable
          suppliers={suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            phone: s.phone,
            email: s.email,
            note: s.note,
          }))}
        />
      )}
    </div>
  )
}

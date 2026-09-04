import { getSessionContext } from '@/lib/auth/session-context'
import { customerService } from '@/lib/services/customer.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { CustomerForm } from '@/components/customers/customer-form'
import { CustomersTable } from '@/components/customers/customers-table'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'pos:operate')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Data pelanggan hanya untuk peran yang melayani penjualan.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const query = params.q?.trim() || undefined
  const customers = await customerService.list(context.projectId, context.userId, query)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Pelanggan</h1>
          <p className="text-muted-foreground text-sm">{customers.length} pelanggan</p>
        </div>
        <CustomerForm />
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/customers">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Cari nama / telepon</label>
          <input
            name="q"
            defaultValue={query ?? ''}
            placeholder="Nama atau nomor…"
            className="border-input bg-background h-9 w-64 rounded-md border px-3 text-sm"
          />
        </div>
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Cari
        </button>
      </form>

      {customers.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          {query
            ? 'Tidak ada pelanggan yang cocok.'
            : 'Belum ada pelanggan. Tambahkan yang pertama.'}
        </p>
      ) : (
        <CustomersTable
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address,
            note: c.note,
          }))}
        />
      )}
    </div>
  )
}

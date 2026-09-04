import { getSessionContext } from '@/lib/auth/session-context'
import { auditService } from '@/lib/services/audit.service'
import { hasRolePermission } from '@/lib/authz/permissions'

const ACTION_LABEL: Record<string, string> = {
  create: 'Buat',
  update: 'Ubah',
  delete: 'Hapus',
  login: 'Login',
  logout: 'Logout',
  export: 'Ekspor',
  sync: 'Sinkron',
  invite: 'Undang',
}

const ACTIONS = ['', 'create', 'update', 'delete', 'export', 'sync', 'invite']

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string }>
}) {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'project:edit')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Hanya pemilik dan admin yang dapat melihat log audit.
        </p>
      </div>
    )
  }

  const params = await searchParams
  const rows = await auditService.list(context.projectId, context.userId, {
    ...(params.action ? { action: params.action } : {}),
    ...(params.resource ? { resource: params.resource } : {}),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Log Audit</h1>
        <p className="text-muted-foreground text-sm">
          Jejak setiap perubahan: siapa, apa, dan kapan. Tidak bisa diubah atau dihapus.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/audit">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Aksi</label>
          <select
            name="action"
            defaultValue={params.action ?? ''}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a ? (ACTION_LABEL[a] ?? a) : 'Semua aksi'}
              </option>
            ))}
          </select>
        </div>
        <input
          name="resource"
          defaultValue={params.resource ?? ''}
          placeholder="Sumber (mis. product)"
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        />
        <button className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm">
          Terapkan
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada catatan.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Aktor</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
                <th className="px-4 py-3 font-medium">Sumber</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-border border-t align-top">
                  <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">{r.actorEmail ?? '—'}</td>
                  <td className="px-4 py-3">{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className="px-4 py-3">
                    {r.resource}
                    {r.resourceId ? (
                      <span className="text-muted-foreground font-mono text-xs">
                        {' '}
                        {r.resourceId.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{r.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

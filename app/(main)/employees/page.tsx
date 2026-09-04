import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { teamService } from '@/lib/services/team.service'
import { hasRolePermission } from '@/lib/authz/permissions'
import { AddMemberForm } from '@/components/employees/add-member-form'
import { MemberActions } from '@/components/employees/member-actions'
import { ROLE_LABEL, STATUS_LABEL } from '@/components/employees/role-labels'

export default async function EmployeesPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'team:manage')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Hanya pemilik dan admin yang dapat mengelola karyawan.
        </p>
      </div>
    )
  }

  const [members, branches] = await Promise.all([
    teamService.list(context.projectId, context.userId),
    getAccessibleBranches(context),
  ])

  const active = members.filter((m) => m.status === 'active').length
  const invited = members.filter((m) => m.status === 'invited').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Karyawan</h1>
          <p className="text-muted-foreground text-sm">
            {members.length} anggota · {active} aktif · {invited} diundang
          </p>
        </div>
        <AddMemberForm branches={branches} />
      </div>

      {members.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed p-12 text-center text-sm">
          Belum ada karyawan. Tambahkan anggota tim dengan email Google mereka.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Anggota</th>
                <th className="px-4 py-3 font-medium">Peran</th>
                <th className="px-4 py-3 font-medium">Cabang</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-border border-t align-top">
                  <td className="px-4 py-3">
                    <div>{m.name ?? '—'}</div>
                    <div className="text-muted-foreground text-xs">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABEL[m.role] ?? m.role}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {m.branchName ?? 'Semua cabang'}
                  </td>
                  <td className="px-4 py-3">{STATUS_LABEL[m.status] ?? m.status}</td>
                  <td className="px-4 py-3">
                    <MemberActions
                      memberId={m.id}
                      role={m.role}
                      branchId={m.branchId}
                      status={m.status}
                      branches={branches}
                    />
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

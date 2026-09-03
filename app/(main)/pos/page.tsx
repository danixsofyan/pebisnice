import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cashSessions } from '@/lib/db/schema'
import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { posCatalogRepository } from '@/lib/repositories/pos-catalog.repository'
import { hasRolePermission } from '@/lib/authz/permissions'
import { PosTerminal } from '@/components/pos/pos-terminal'
import { CashSessionPanel } from '@/components/pos/cash-session-panel'

export default async function PosPage() {
  const context = await getSessionContext()

  if (!hasRolePermission(context.role, 'pos:operate')) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Tidak ada akses</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Peran Anda tidak memiliki izin mengoperasikan kasir.
        </p>
      </div>
    )
  }

  const branches = await getAccessibleBranches(context)
  const branch = branches[0]

  if (!branch) {
    return (
      <div className="border-border rounded-xl border border-dashed p-12 text-center">
        <h1 className="text-lg font-bold">Belum ada cabang</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Buat cabang terlebih dahulu di halaman pengaturan.
        </p>
      </div>
    )
  }

  const [openSession] = await db
    .select({ id: cashSessions.id, openingBalance: cashSessions.openingBalance })
    .from(cashSessions)
    .where(
      and(
        eq(cashSessions.branchId, branch.id),
        eq(cashSessions.status, 'open'),
        isNull(cashSessions.deletedAt)
      )
    )
    .limit(1)

  if (!openSession) {
    return (
      <CashSessionPanel branchId={branch.id} branchName={branch.name} openSession={null} />
    )
  }

  const items = await posCatalogRepository.search(context.projectId, branch.id, '')

  return (
    <div className="space-y-6">
      <CashSessionPanel
        branchId={branch.id}
        branchName={branch.name}
        openSession={{ id: openSession.id, openingBalance: openSession.openingBalance }}
      />

      <PosTerminal branchId={branch.id} branchName={branch.name} items={items} />
    </div>
  )
}

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { removeMemberAction, setMemberStatusAction, updateMemberAction } from '@/app/actions/team'
import { ASSIGNABLE_ROLE_OPTIONS } from './role-labels'

/**
 * Aksi per anggota: ubah peran/cabang (tersimpan otomatis saat diubah),
 * nonaktifkan/aktifkan, dan hapus.
 */
export function MemberActions({
  memberId,
  role,
  branchId,
  status,
  branches,
}: {
  memberId: string
  role: string
  branchId: string | null
  status: string
  branches: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function save(nextRole: string, nextBranch: string | null) {
    startTransition(async () => {
      await updateMemberAction({ memberId, role: nextRole, branchId: nextBranch })
      router.refresh()
    })
  }

  function toggleStatus() {
    startTransition(async () => {
      await setMemberStatusAction({
        memberId,
        status: status === 'disabled' ? 'active' : 'disabled',
      })
      router.refresh()
    })
  }

  function remove() {
    if (!confirm('Hapus anggota ini dari tim?')) return
    startTransition(async () => {
      await removeMemberAction(memberId)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        value={role}
        disabled={isPending}
        onChange={(e) => save(e.target.value, branchId)}
        className="border-input bg-background h-8 rounded-md border px-2 text-xs"
        aria-label="Peran"
      >
        {ASSIGNABLE_ROLE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <select
        value={branchId ?? ''}
        disabled={isPending}
        onChange={(e) => save(role, e.target.value || null)}
        className="border-input bg-background h-8 rounded-md border px-2 text-xs"
        aria-label="Cabang"
      >
        <option value="">Semua cabang</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" onClick={toggleStatus} disabled={isPending}>
        {status === 'disabled' ? 'Aktifkan' : 'Nonaktifkan'}
      </Button>
      <Button size="sm" variant="outline" onClick={remove} disabled={isPending}>
        Hapus
      </Button>
    </div>
  )
}

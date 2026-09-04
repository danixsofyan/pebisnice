'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setMutationReconciledAction } from '@/app/actions/finance'

export function ReconcileToggle({ id, reconciled }: { id: string; reconciled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await setMutationReconciledAction({ mutationId: id, reconciled: !reconciled })
      if (res.success) router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={
        reconciled
          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-500 disabled:opacity-50'
          : 'border-input hover:bg-muted/40 rounded-full border px-2 py-0.5 text-xs disabled:opacity-50'
      }
    >
      {reconciled ? 'Cocok ✓' : 'Tandai cocok'}
    </button>
  )
}

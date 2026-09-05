'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setPromotionActiveAction } from '@/app/actions/promotion'

export function TogglePromotionButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await setPromotionActiveAction({ id, isActive: !isActive })
      if (res.success) router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={
        isActive
          ? 'rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-500 disabled:opacity-50'
          : 'bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium disabled:opacity-50'
      }
      title="Klik untuk mengubah status"
    >
      {isActive ? 'Aktif' : 'Nonaktif'}
    </button>
  )
}

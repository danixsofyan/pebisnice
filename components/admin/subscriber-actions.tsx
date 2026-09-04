'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { grantAccessDaysAction, setSubscriptionStatusAction } from '@/app/actions/admin'

// Per-subscriber admin actions: add access days and cancel/reactivate; used inside a table row.
export function SubscriberActions({ userId, status }: { userId: string; status: string | null }) {
  const router = useRouter()
  const [days, setDays] = useState('14')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function grant() {
    setError(null)
    startTransition(async () => {
      const result = await grantAccessDaysAction({ userId, days: Number(days) })
      if (!result.success) return setError(result.error)
      router.refresh()
    })
  }

  function changeStatus(next: 'canceled' | 'active') {
    setError(null)
    startTransition(async () => {
      const result = await setSubscriptionStatusAction({ userId, status: next })
      if (!result.success) return setError(result.error)
      router.refresh()
    })
  }

  const isCanceled = status === 'canceled'

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Input
        value={days}
        onChange={(e) => setDays(e.target.value)}
        inputMode="numeric"
        className="h-8 w-16"
        aria-label="Jumlah hari"
      />
      <Button size="sm" variant="outline" onClick={grant} disabled={isPending}>
        + Hari
      </Button>
      {status === null ? null : isCanceled ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => changeStatus('active')}
          disabled={isPending}
        >
          Aktifkan
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => changeStatus('canceled')}
          disabled={isPending}
        >
          Batalkan
        </Button>
      )}
      {error ? <span className="text-destructive w-full text-right text-xs">{error}</span> : null}
    </div>
  )
}

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { acceptOnlineOrderAction, rejectOnlineOrderAction } from '@/app/actions/online-order'

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run(
    fn: (id: string) => Promise<{ success: boolean; error?: string }>,
    confirmMsg?: string
  ) {
    if (confirmMsg && !confirm(confirmMsg)) return
    startTransition(async () => {
      const res = await fn(orderId)
      if (!res.success) return alert(res.error)
      router.refresh()
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => run(acceptOnlineOrderAction, 'Terima pesanan ini dan buat transaksi kasir?')}
      >
        Terima
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run(rejectOnlineOrderAction, 'Tolak pesanan ini?')}
      >
        Tolak
      </Button>
    </div>
  )
}

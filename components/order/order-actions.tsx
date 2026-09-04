'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { acceptOnlineOrderAction, rejectOnlineOrderAction } from '@/app/actions/online-order'

const METHODS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Kartu' },
  { value: 'other', label: 'Lainnya' },
] as const

export function OrderActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [method, setMethod] = useState<string>('transfer')
  const [isPending, startTransition] = useTransition()

  function accept() {
    if (!confirm('Terima pesanan ini dan buat transaksi kasir?')) return
    startTransition(async () => {
      const res = await acceptOnlineOrderAction({ orderId, paymentMethod: method })
      if (!res.success) return alert(res.error)
      router.refresh()
    })
  }

  function reject() {
    if (!confirm('Tolak pesanan ini?')) return
    startTransition(async () => {
      const res = await rejectOnlineOrderAction(orderId)
      if (!res.success) return alert(res.error)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        aria-label="Metode bayar"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        disabled={isPending}
        className="border-input bg-background h-8 rounded-md border px-2 text-xs"
      >
        {METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={isPending} onClick={accept}>
        Terima
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={reject}>
        Tolak
      </Button>
    </div>
  )
}

'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { voidSaleAction } from '@/app/actions/pos'

/** Void a cashier sale: return stock and mark it void. */
export function VoidSaleButton({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function voidSale() {
    const reason = prompt('Alasan pembatalan?')
    if (!reason || !reason.trim()) return
    startTransition(async () => {
      const result = await voidSaleAction({ transactionId, reason: reason.trim() })
      if (!result.success) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={voidSale} disabled={isPending}>
      Batalkan
    </Button>
  )
}

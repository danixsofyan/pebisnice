'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { receiveOrderAction } from '@/app/actions/purchasing'

export function ReceiveOrderButton({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function receive() {
    if (!confirm('Terima barang PO ini? Stok akan bertambah.')) return
    startTransition(async () => {
      const res = await receiveOrderAction(purchaseOrderId)
      if (res.success) router.refresh()
    })
  }

  return (
    <Button size="sm" onClick={receive} disabled={isPending}>
      {isPending ? 'Memproses…' : 'Terima'}
    </Button>
  )
}

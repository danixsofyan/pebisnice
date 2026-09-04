'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getReceivableItemsAction, receiveOrderAction } from '@/app/actions/purchasing'

interface ReceivableItem {
  itemId: string
  productName: string
  remaining: number
}

export function ReceiveOrderButton({ purchaseOrderId }: { purchaseOrderId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReceivableItem[] | null>(null)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function openForm() {
    setOpen(true)
    setError(null)
    const res = await getReceivableItemsAction(purchaseOrderId)
    if (!res.success) return setError(res.error)
    setItems(res.data)
    // default: receive everything remaining (full receipt in one click)
    setQty(Object.fromEntries(res.data.map((i) => [i.itemId, i.remaining])))
  }

  function submit() {
    setError(null)
    const chosen = (items ?? [])
      .map((i) => ({ itemId: i.itemId, qty: qty[i.itemId] ?? 0 }))
      .filter((i) => i.qty > 0)
    if (chosen.length === 0) return setError('Isi jumlah diterima minimal satu barang')
    startTransition(async () => {
      const res = await receiveOrderAction({ purchaseOrderId, items: chosen })
      if (!res.success) return setError(res.error)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={openForm}>
        Terima
      </Button>
    )
  }

  return (
    <div className="border-border bg-card absolute right-0 z-10 mt-2 w-80 space-y-3 rounded-xl border p-4 text-left shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Terima barang</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Tutup
        </button>
      </div>
      {items === null ? (
        <p className="text-muted-foreground text-xs">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-xs">Semua barang sudah diterima.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.itemId} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex-1 truncate">
                {i.productName}
                <span className="text-muted-foreground"> · sisa {i.remaining}</span>
              </span>
              <input
                type="number"
                min={0}
                max={i.remaining}
                value={qty[i.itemId] ?? 0}
                onChange={(e) =>
                  setQty((q) => ({
                    ...q,
                    [i.itemId]: Math.max(0, Math.min(i.remaining, Number(e.target.value))),
                  }))
                }
                className="border-input bg-background h-8 w-16 rounded-md border px-2"
              />
            </div>
          ))}
          <p className="text-muted-foreground text-xs">
            Isi lebih kecil dari sisa untuk terima sebagian; PO tetap terbuka sampai lengkap.
          </p>
        </div>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <Button
        size="sm"
        onClick={submit}
        disabled={isPending || items === null || items.length === 0}
      >
        {isPending ? 'Memproses…' : 'Proses terima'}
      </Button>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getReturnableItemsAction, returnSaleAction } from '@/app/actions/pos'
import { formatRupiahFromDecimal } from '@/lib/formatters'

interface ReturnableItem {
  productVariantId: string
  productName: string
  remaining: number
  unitPrice: string
}

export function ReturnSaleButton({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReturnableItem[] | null>(null)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function openForm() {
    setOpen(true)
    setError(null)
    const res = await getReturnableItemsAction(transactionId)
    if (!res.success) return setError(res.error)
    setItems(res.data)
    setQty(Object.fromEntries(res.data.map((i) => [i.productVariantId, 0])))
  }

  function submit() {
    setError(null)
    const chosen = (items ?? [])
      .map((i) => ({ productVariantId: i.productVariantId, qty: qty[i.productVariantId] ?? 0 }))
      .filter((i) => i.qty > 0)
    if (chosen.length === 0) return setError('Isi qty retur minimal satu barang')
    startTransition(async () => {
      const res = await returnSaleAction({
        transactionId,
        reason: reason.trim() || undefined,
        items: chosen,
      })
      if (!res.success) return setError(res.error)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={openForm}>
        Retur
      </Button>
    )
  }

  return (
    <div className="border-border bg-card absolute right-0 z-10 mt-2 w-80 space-y-3 rounded-xl border p-4 text-left shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Retur barang</h3>
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
        <p className="text-muted-foreground text-xs">Tidak ada barang yang bisa diretur.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div
              key={i.productVariantId}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex-1 truncate">
                {i.productName}
                <span className="text-muted-foreground"> · sisa {i.remaining}</span>
              </span>
              <input
                type="number"
                min={0}
                max={i.remaining}
                value={qty[i.productVariantId] ?? 0}
                onChange={(e) =>
                  setQty((q) => ({
                    ...q,
                    [i.productVariantId]: Math.max(
                      0,
                      Math.min(i.remaining, Number(e.target.value))
                    ),
                  }))
                }
                className="border-input bg-background h-8 w-16 rounded-md border px-2"
              />
            </div>
          ))}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan (opsional)"
            className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
          />
          <p className="text-muted-foreground text-xs">
            Refund:{' '}
            {formatRupiahFromDecimal(
              String(
                items.reduce(
                  (sum, i) => sum + (qty[i.productVariantId] ?? 0) * Number(i.unitPrice),
                  0
                )
              )
            )}
          </p>
        </div>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <Button
        size="sm"
        onClick={submit}
        disabled={isPending || items === null || items.length === 0}
      >
        {isPending ? 'Memproses…' : 'Proses retur'}
      </Button>
    </div>
  )
}

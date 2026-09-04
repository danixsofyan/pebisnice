'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createTransferAction } from '@/app/actions/transfer'

interface BranchOption {
  id: string
  name: string
}
interface ProductOption {
  variantId: string
  label: string
}
interface ItemRow {
  productVariantId: string
  qty: string
}

export function TransferForm({
  branches,
  products,
}: {
  branches: BranchOption[]
  products: ProductOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fromBranchId, setFrom] = useState(branches[0]?.id ?? '')
  const [toBranchId, setTo] = useState(branches[1]?.id ?? '')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ productVariantId: '', qty: '1' }])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update(index: number, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const chosen = items
      .filter((i) => i.productVariantId && Number(i.qty) > 0)
      .map((i) => ({ productVariantId: i.productVariantId, qty: Number(i.qty) }))
    if (chosen.length === 0) return setError('Pilih minimal satu barang')
    startTransition(async () => {
      const res = await createTransferAction({
        fromBranchId,
        toBranchId,
        note: note.trim() || undefined,
        items: chosen,
      })
      if (!res.success) return setError(res.error)
      setItems([{ productVariantId: '', qty: '1' }])
      setNote('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Transfer stok</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Dari cabang</label>
          <select
            value={fromBranchId}
            onChange={(e) => setFrom(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Ke cabang</label>
          <select
            value={toBranchId}
            onChange={(e) => setTo(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-muted-foreground text-xs">Barang</span>
        {items.map((row, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={row.productVariantId}
              onChange={(e) => update(index, { productVariantId: e.target.value })}
              className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
            >
              <option value="">Pilih barang…</option>
              {products.map((p) => (
                <option key={p.variantId} value={p.variantId}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Jumlah"
              value={row.qty}
              onChange={(e) => update(index, { qty: e.target.value })}
              inputMode="numeric"
              className="border-input bg-background h-9 w-20 rounded-md border px-3 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((r) => [...r, { productVariantId: '', qty: '1' }])}
          className="text-muted-foreground hover:text-foreground text-xs underline"
        >
          + baris
        </button>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan (opsional)"
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Memproses…' : 'Proses transfer'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}

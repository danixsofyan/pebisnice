'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createOrderAction } from '@/app/actions/purchasing'

interface Option {
  id: string
  label: string
}
interface ProductOption {
  variantId: string
  label: string
}
interface ItemRow {
  productVariantId: string
  qty: string
  unitCost: string
}

export function PurchaseOrderForm({
  suppliers,
  branches,
  products,
}: {
  suppliers: Option[]
  branches: Option[]
  products: ProductOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ productVariantId: '', qty: '1', unitCost: '' }])
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
      .map((i) => ({
        productVariantId: i.productVariantId,
        qty: Number(i.qty),
        unitCost: Number(i.unitCost || 0).toFixed(2),
      }))
    if (chosen.length === 0) return setError('Pilih minimal satu barang')
    startTransition(async () => {
      const res = await createOrderAction({
        supplierId,
        branchId,
        note: note.trim() || undefined,
        items: chosen,
      })
      if (!res.success) return setError(res.error)
      setItems([{ productVariantId: '', qty: '1', unitCost: '' }])
      setNote('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Buat PO</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Cabang tujuan</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-muted-foreground text-xs">Barang (qty &amp; harga beli/unit)</span>
        {items.map((row, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <select
              value={row.productVariantId}
              onChange={(e) => update(index, { productVariantId: e.target.value })}
              className="border-input bg-background h-9 min-w-40 flex-1 rounded-md border px-3 text-sm"
            >
              <option value="">Pilih barang…</option>
              {products.map((p) => (
                <option key={p.variantId} value={p.variantId}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Qty"
              value={row.qty}
              onChange={(e) => update(index, { qty: e.target.value })}
              inputMode="numeric"
              className="border-input bg-background h-9 w-16 rounded-md border px-2 text-sm"
            />
            <input
              aria-label="Harga beli"
              value={row.unitCost}
              onChange={(e) => update(index, { unitCost: e.target.value })}
              inputMode="numeric"
              placeholder="Harga"
              className="border-input bg-background h-9 w-28 rounded-md border px-2 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((r) => [...r, { productVariantId: '', qty: '1', unitCost: '' }])}
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
          {isPending ? 'Menyimpan…' : 'Simpan PO'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}

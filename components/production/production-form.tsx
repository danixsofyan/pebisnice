'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { recordProductionAction } from '@/app/actions/production'

interface VariantOption {
  variantId: string
  label: string
}

interface MaterialRow {
  productVariantId: string
  qty: string
}

interface WorkerOption {
  memberId: string
  label: string
}

// Production form: one finished good, several materials used. Material stock goes down and finished stock up in one server transaction.
export function ProductionForm({
  branchId,
  finishedOptions,
  materialOptions,
  workerOptions,
}: {
  branchId: string
  finishedOptions: VariantOption[]
  materialOptions: VariantOption[]
  workerOptions: WorkerOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [productVariantId, setProductVariantId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10))
  const [producedByMemberId, setProducedByMemberId] = useState('')
  const [note, setNote] = useState('')
  const [materials, setMaterials] = useState<MaterialRow[]>([{ productVariantId: '', qty: '1' }])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateMaterial(index: number, patch: Partial<MaterialRow>) {
    setMaterials((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await recordProductionAction({
        branchId,
        productVariantId,
        quantity: Number(quantity || 0),
        productionDate,
        producedByMemberId: producedByMemberId || undefined,
        note: note.trim() || undefined,
        materials: materials
          .filter((m) => m.productVariantId)
          .map((m) => ({ productVariantId: m.productVariantId, qty: Number(m.qty || 0) })),
      })
      if (!result.success) return setError(result.error)
      setProductVariantId('')
      setQuantity('1')
      setProducedByMemberId('')
      setNote('')
      setMaterials([{ productVariantId: '', qty: '1' }])
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Catat produksi</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prod-out">Produk jadi</Label>
          <select
            id="prod-out"
            value={productVariantId}
            onChange={(e) => setProductVariantId(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            required
          >
            <option value="">Pilih produk jadi…</option>
            {finishedOptions.map((o) => (
              <option key={o.variantId} value={o.variantId}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-qty">Jumlah dihasilkan</Label>
          <Input
            id="prod-qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="numeric"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-date">Tanggal</Label>
          <Input
            id="prod-date"
            type="date"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
            required
          />
        </div>
        {workerOptions.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="prod-worker">Diproduksi oleh</Label>
            <select
              id="prod-worker"
              value={producedByMemberId}
              onChange={(e) => setProducedByMemberId(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Saya sendiri</option>
              {workerOptions.map((o) => (
                <option key={o.memberId} value={o.memberId}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="prod-note">Catatan (opsional)</Label>
          <Input id="prod-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Bahan yang dipakai</Label>
        {materials.map((row, index) => (
          <div key={index} className="flex gap-2">
            <select
              value={row.productVariantId}
              onChange={(e) => updateMaterial(index, { productVariantId: e.target.value })}
              className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
            >
              <option value="">Pilih bahan…</option>
              {materialOptions.map((o) => (
                <option key={o.variantId} value={o.variantId}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input
              value={row.qty}
              onChange={(e) => updateMaterial(index, { qty: e.target.value })}
              inputMode="numeric"
              className="w-20"
              aria-label="Jumlah bahan"
            />
            {materials.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMaterials((rows) => rows.filter((_, i) => i !== index))}
                aria-label="Hapus bahan"
              >
                ×
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMaterials((rows) => [...rows, { productVariantId: '', qty: '1' }])}
        >
          + Bahan
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !productVariantId}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  )
}

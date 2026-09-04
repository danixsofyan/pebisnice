'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProductAction } from '@/app/actions/catalog'

/**
 * Form tambah produk. Field HPP hanya ditampilkan untuk peran yang berhak —
 * dan bahkan bila dikirim paksa, service tetap mengabaikannya.
 */
export function ProductForm({ branchId, canViewCost }: { branchId: string; canViewCost: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<'finished' | 'material'>('finished')
  const [sku, setSku] = useState('')
  const [variantName, setVariantName] = useState('')
  const [hpp, setHpp] = useState('')
  const [initialStock, setInitialStock] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createProductAction({
        branchId,
        name,
        type,
        sku: sku.trim() || undefined,
        variantName: variantName.trim() || undefined,
        hpp: Number(hpp || 0).toFixed(2),
        initialStock: Number(initialStock || 0),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setName('')
      setSku('')
      setVariantName('')
      setHpp('')
      setInitialStock('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Tambah produk</Button>
  }

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">Nama produk</Label>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-type">Tipe</Label>
          <select
            id="p-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'finished' | 'material')}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="finished">Produk jadi (bisa dijual)</option>
            <option value="material">Bahan (untuk produksi)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-sku">SKU (opsional)</Label>
          <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="p-variant">Varian (opsional)</Label>
          <Input
            id="p-variant"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="Sedang, Merah, 500gr"
          />
        </div>

        {canViewCost ? (
          <div className="space-y-2">
            <Label htmlFor="p-hpp">HPP</Label>
            <Input
              id="p-hpp"
              value={hpp}
              onChange={(e) => setHpp(e.target.value)}
              inputMode="numeric"
              placeholder="0"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="p-stock">Stok awal</Label>
          <Input
            id="p-stock"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || name.trim().length === 0}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  )
}

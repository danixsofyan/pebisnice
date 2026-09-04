'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adjustStockAction } from '@/app/actions/inventory'

/**
 * Penyesuaian stok satu varian. Dua mode: "penyesuaian" (selisih +/-, mis.
 * barang rusak) dan "stok opname" (menetapkan jumlah hasil hitung fisik).
 */
export function AdjustStock({
  branchId,
  productVariantId,
  stockQty,
}: {
  branchId: string
  productVariantId: string
  stockQty: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'adjustment' | 'opname'>('adjustment')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await adjustStockAction({
        branchId,
        productVariantId,
        mode,
        value: Number(value || 0),
        reason: reason.trim(),
      })
      if (!result.success) return setError(result.error)
      setValue('')
      setReason('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Sesuaikan
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="border-border bg-card space-y-3 rounded-lg border p-3 text-left"
    >
      <div className="flex gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'adjustment' | 'opname')}
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          aria-label="Jenis penyesuaian"
        >
          <option value="adjustment">Penyesuaian (+/-)</option>
          <option value="opname">Stok opname</option>
        </select>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          className="h-8 w-24"
          placeholder={mode === 'adjustment' ? '±jumlah' : 'jumlah'}
          autoFocus
        />
      </div>
      <p className="text-muted-foreground text-xs">
        {mode === 'adjustment'
          ? `Stok kini ${stockQty}. Isi +/- untuk menambah atau mengurangi.`
          : `Stok kini ${stockQty}. Isi jumlah hasil hitung fisik.`}
      </p>
      <div className="space-y-1">
        <Label htmlFor={`reason-${productVariantId}`} className="text-xs">
          Alasan
        </Label>
        <Input
          id={`reason-${productVariantId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8"
          placeholder="mis. barang rusak, hasil opname"
          required
        />
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !value || !reason.trim()}>
          {isPending ? 'Menyimpan…' : 'Terapkan'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  )
}

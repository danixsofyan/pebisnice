'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { recordExpenseAction } from '@/app/actions/expenses'

const CATEGORIES = [
  { value: 'rent', label: 'Sewa' },
  { value: 'salary', label: 'Gaji' },
  { value: 'utility', label: 'Utilitas (listrik, air)' },
  { value: 'marketing', label: 'Pemasaran' },
  { value: 'shipping', label: 'Pengiriman' },
  { value: 'supply', label: 'Perlengkapan' },
  { value: 'tax', label: 'Pajak' },
  { value: 'other', label: 'Lainnya' },
] as const

export function ExpenseForm({
  branches,
  today,
}: {
  branches: Array<{ id: string; name: string }>
  today: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>('other')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(today)
  const [branchId, setBranchId] = useState<string>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await recordExpenseAction({
        category,
        amount: Number(amount || 0).toFixed(2),
        expenseDate,
        branchId: branchId || null,
        note: note.trim() || undefined,
      })
      if (!result.success) return setError(result.error)
      setAmount('')
      setNote('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Tambah pengeluaran</Button>

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="e-cat">Kategori</Label>
          <select
            id="e-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="e-amount">Nominal (Rp)</Label>
          <Input
            id="e-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="e-date">Tanggal</Label>
          <Input
            id="e-date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>

        {branches.length > 0 ? (
          <div className="space-y-2">
            <Label htmlFor="e-branch">Cabang (opsional)</Label>
            <select
              id="e-branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Semua / tidak spesifik</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="e-note">Catatan (opsional)</Label>
          <Input id="e-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !amount}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createReceivableAction } from '@/app/actions/receivable'

interface CustomerOption {
  id: string
  name: string
}

export function ReceivableForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createReceivableAction({
        customerId: customerId || undefined,
        amount: Number(amount || 0).toFixed(2),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      })
      if (!res.success) return setError(res.error)
      setCustomerId('')
      setAmount('')
      setDescription('')
      setDueDate('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Catat piutang</Button>

  return (
    <form
      onSubmit={submit}
      className="border-border bg-card w-full space-y-3 rounded-xl border p-4 sm:w-96"
    >
      {customers.length > 0 ? (
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Pelanggan (opsional)</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="">— tanpa pelanggan —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">Jumlah piutang</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="0"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">Keterangan (opsional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">Jatuh tempo (opsional)</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !amount}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
          Batal
        </Button>
      </div>
    </form>
  )
}

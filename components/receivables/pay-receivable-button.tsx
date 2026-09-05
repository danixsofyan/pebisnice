'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { payReceivableAction } from '@/app/actions/receivable'

const METHODS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Kartu' },
  { value: 'other', label: 'Lainnya' },
] as const

export function PayReceivableButton({ id, outstanding }: { id: string; outstanding: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(outstanding)
  const [method, setMethod] = useState<string>('cash')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await payReceivableAction({
        receivableId: id,
        amount: Number(amount || 0).toFixed(2),
        method,
      })
      if (!res.success) return setError(res.error)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Bayar
      </Button>
    )
  }

  return (
    <div className="border-border bg-card absolute right-0 z-10 mt-2 w-64 space-y-2 rounded-xl border p-3 text-left shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Terima pembayaran</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Tutup
        </button>
      </div>
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="numeric"
        className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
      />
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
      >
        {METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <Button size="sm" onClick={submit} disabled={isPending || !amount}>
        {isPending ? 'Memproses…' : 'Simpan'}
      </Button>
    </div>
  )
}

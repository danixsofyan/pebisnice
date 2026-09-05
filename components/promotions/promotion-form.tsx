'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createPromotionAction } from '@/app/actions/promotion'

export function PromotionForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('nominal')
  const [percent, setPercent] = useState('')
  const [amount, setAmount] = useState('')
  const [minSpend, setMinSpend] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setCode('')
    setName('')
    setDiscountType('nominal')
    setPercent('')
    setAmount('')
    setMinSpend('')
    setMaxDiscount('')
    setStartsAt('')
    setEndsAt('')
    setUsageLimit('')
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createPromotionAction({
        code: code.trim().toUpperCase(),
        name: name.trim() || undefined,
        discountType,
        percent: discountType === 'percent' ? Number(percent || 0) : undefined,
        amount: discountType === 'nominal' ? Number(amount || 0).toFixed(2) : undefined,
        minSpend: minSpend ? Number(minSpend).toFixed(2) : undefined,
        maxDiscount:
          discountType === 'percent' && maxDiscount ? Number(maxDiscount).toFixed(2) : undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
      })
      if (!res.success) return setError(res.error)
      reset()
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Buat voucher</Button>

  const inputCls = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm'

  return (
    <form
      onSubmit={submit}
      className="border-border bg-card w-full space-y-3 rounded-xl border p-4 sm:w-96"
    >
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">Kode voucher</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="HEMAT10"
          className={`${inputCls} font-mono`}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">Nama (opsional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>

      <div className="space-y-1">
        <label className="text-muted-foreground text-xs">Jenis diskon</label>
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as 'percent' | 'nominal')}
          className={inputCls}
        >
          <option value="nominal">Nominal (Rp)</option>
          <option value="percent">Persen (%)</option>
        </select>
      </div>

      {discountType === 'percent' ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Persen</label>
            <input
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Maks. potongan</label>
            <input
              type="number"
              min={0}
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Nominal potongan (Rp)</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            required
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Min. belanja (Rp)</label>
          <input
            type="number"
            min={0}
            value={minSpend}
            onChange={(e) => setMinSpend(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Kuota pakai</label>
          <input
            type="number"
            min={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="tanpa batas"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Mulai</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs">Berakhir</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPlanAction, updatePlanAction } from '@/app/actions/admin'

type Interval = 'trial' | 'monthly' | 'yearly'

export interface EditablePlan {
  id: string
  code: string
  name: string
  description: string | null
  interval: Interval
  price: string
  trialDays: number | null
  isActive: boolean
  sortOrder: number
}

const INTERVAL_LABEL: Record<Interval, string> = {
  trial: 'Masa coba',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
}

function PlanRow({ plan }: { plan: EditablePlan }) {
  const router = useRouter()
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [price, setPrice] = useState(String(Math.round(Number(plan.price))))
  const [trialDays, setTrialDays] = useState(plan.trialDays != null ? String(plan.trialDays) : '')
  const [isActive, setIsActive] = useState(plan.isActive)
  const [sortOrder, setSortOrder] = useState(String(plan.sortOrder))
  const [msg, setMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isTrial = plan.interval === 'trial'

  function save() {
    setMsg(null)
    startTransition(async () => {
      const result = await updatePlanAction({
        planId: plan.id,
        name,
        description: description.trim() || null,
        price: isTrial ? '0' : Number(price || 0).toFixed(2),
        trialDays: isTrial ? Number(trialDays || 0) : null,
        isActive,
        sortOrder: Number(sortOrder || 0),
      })
      setMsg(result.success ? 'Tersimpan' : result.error)
      if (result.success) router.refresh()
    })
  }

  return (
    <div className="border-border bg-card space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold">{INTERVAL_LABEL[plan.interval]}</span>
          <span className="text-muted-foreground ml-2 font-mono text-xs">{plan.code}</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Aktif
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Nama</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Urutan</Label>
          <Input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            inputMode="numeric"
          />
        </div>
        {isTrial ? (
          <div className="space-y-1">
            <Label>Lama trial (hari)</Label>
            <Input
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              inputMode="numeric"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label>Harga (Rp)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
          </div>
        )}
        <div className="space-y-1 sm:col-span-2">
          <Label>Deskripsi</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        {msg ? <span className="text-muted-foreground text-xs">{msg}</span> : null}
      </div>
    </div>
  )
}

function CreatePlan() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [interval, setInterval] = useState<Interval>('monthly')
  const [price, setPrice] = useState('')
  const [trialDays, setTrialDays] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function create() {
    setError(null)
    startTransition(async () => {
      const result = await createPlanAction({
        code,
        name,
        description: null,
        interval,
        price: interval === 'trial' ? '0' : Number(price || 0).toFixed(2),
        trialDays: interval === 'trial' ? Number(trialDays || 0) : null,
        sortOrder: 0,
      })
      if (!result.success) return setError(result.error)
      setCode('')
      setName('')
      setPrice('')
      setTrialDays('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Tambah paket
      </Button>
    )

  return (
    <div className="border-border bg-card space-y-3 rounded-xl border border-dashed p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Kode</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="mis. monthly_pro"
          />
        </div>
        <div className="space-y-1">
          <Label>Nama</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Jenis</Label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as Interval)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
            <option value="trial">Masa coba</option>
          </select>
        </div>
        {interval === 'trial' ? (
          <div className="space-y-1">
            <Label>Lama trial (hari)</Label>
            <Input
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              inputMode="numeric"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label>Harga (Rp)</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
          </div>
        )}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={create} disabled={isPending || !code || !name}>
          {isPending ? 'Membuat…' : 'Buat'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </div>
  )
}

export function PlanEditor({ plans }: { plans: EditablePlan[] }) {
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanRow key={plan.id} plan={plan} />
      ))}
      <CreatePlan />
    </div>
  )
}

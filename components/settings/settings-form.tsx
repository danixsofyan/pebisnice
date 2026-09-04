'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProjectSettingsAction } from '@/app/actions/account'

export function SettingsForm({
  initial,
}: {
  initial: { name: string; description: string; defaultCalcMethod: 'income_based' | 'order_based' }
}) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [calc, setCalc] = useState(initial.defaultCalcMethod)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMsg(null)
    startTransition(async () => {
      const result = await updateProjectSettingsAction({
        name,
        description: description.trim() || undefined,
        defaultCalcMethod: calc,
      })
      if (!result.success) return setError(result.error)
      setMsg('Tersimpan')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="border-border bg-card space-y-4 rounded-xl border p-6">
      <div className="space-y-2">
        <Label htmlFor="s-name">Nama bisnis</Label>
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-desc">Deskripsi (opsional)</Label>
        <Input id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s-calc">Metode kalkulasi laba</Label>
        <select
          id="s-calc"
          value={calc}
          onChange={(e) => setCalc(e.target.value as 'income_based' | 'order_based')}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        >
          <option value="income_based">Berbasis pemasukan (settlement)</option>
          <option value="order_based">Berbasis pesanan (tanggal order)</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? 'Menyimpan…' : 'Simpan'}
        </Button>
        {msg ? <span className="text-muted-foreground text-sm">{msg}</span> : null}
        {error ? <span className="text-destructive text-sm">{error}</span> : null}
      </div>
    </form>
  )
}

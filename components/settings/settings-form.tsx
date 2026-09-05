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
  initial: {
    name: string
    description: string
    defaultCalcMethod: 'income_based' | 'order_based'
    taxRatePercent: number
    taxInclusive: boolean
    waNumber: string
    loyaltyEnabled: boolean
    loyaltyEarnRate: number
    loyaltyRedeemValue: number
  }
}) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [calc, setCalc] = useState(initial.defaultCalcMethod)
  const [taxRate, setTaxRate] = useState(String(initial.taxRatePercent))
  const [taxInclusive, setTaxInclusive] = useState(initial.taxInclusive)
  const [waNumber, setWaNumber] = useState(initial.waNumber)
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(initial.loyaltyEnabled)
  const [loyaltyEarnRate, setLoyaltyEarnRate] = useState(String(initial.loyaltyEarnRate))
  const [loyaltyRedeemValue, setLoyaltyRedeemValue] = useState(String(initial.loyaltyRedeemValue))
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
        taxRatePercent: Number(taxRate || 0),
        taxInclusive,
        waNumber: waNumber.trim() || undefined,
        loyaltyEnabled,
        loyaltyEarnRate: Math.max(0, Math.floor(Number(loyaltyEarnRate || 0))),
        loyaltyRedeemValue: Math.max(0, Math.floor(Number(loyaltyRedeemValue || 0))),
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="s-tax">Tarif PPN (%)</Label>
          <Input
            id="s-tax"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
          <p className="text-muted-foreground text-xs">Kosongkan / 0 untuk menonaktifkan.</p>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={taxInclusive}
            onChange={(e) => setTaxInclusive(e.target.checked)}
            className="size-4"
          />
          Harga sudah termasuk PPN
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="s-wa">Nomor WhatsApp toko (untuk link order)</Label>
        <Input
          id="s-wa"
          value={waNumber}
          onChange={(e) => setWaNumber(e.target.value)}
          inputMode="tel"
          placeholder="628123456789"
        />
        <p className="text-muted-foreground text-xs">
          Format internasional tanpa +, mis. 628123456789. Dipakai tombol WhatsApp di link order.
        </p>
      </div>

      <div className="border-border space-y-4 border-t pt-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={loyaltyEnabled}
            onChange={(e) => setLoyaltyEnabled(e.target.checked)}
            className="size-4"
          />
          Aktifkan program loyalti (poin pelanggan)
        </label>
        {loyaltyEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-earn">Rp belanja per 1 poin</Label>
              <Input
                id="s-earn"
                value={loyaltyEarnRate}
                onChange={(e) => setLoyaltyEarnRate(e.target.value)}
                inputMode="numeric"
                placeholder="1000"
              />
              <p className="text-muted-foreground text-xs">
                Mis. 1000 = pelanggan dapat 1 poin tiap belanja Rp1.000. 0 mematikan perolehan.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-redeem">Nilai 1 poin (Rp)</Label>
              <Input
                id="s-redeem"
                value={loyaltyRedeemValue}
                onChange={(e) => setLoyaltyRedeemValue(e.target.value)}
                inputMode="numeric"
                placeholder="100"
              />
              <p className="text-muted-foreground text-xs">
                Mis. 100 = tiap poin memotong Rp100 saat ditukar. 0 mematikan penukaran.
              </p>
            </div>
          </div>
        ) : null}
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

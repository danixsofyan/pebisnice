'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { recordOpnameAction } from '@/app/actions/inventory'

interface OpnameItem {
  variantId: string
  name: string
  stockQty: number
}

export function OpnameForm({ branchId, items }: { branchId: string; items: OpnameItem[] }) {
  const router = useRouter()
  const [counted, setCounted] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // Only rows the user actually changed to a different, valid number are submitted.
  const changed = useMemo(
    () =>
      items
        .filter((i) => {
          const raw = counted[i.variantId]
          if (raw === undefined || raw === '') return false
          const n = Number(raw)
          return Number.isInteger(n) && n >= 0 && n !== i.stockQty
        })
        .map((i) => ({ productVariantId: i.variantId, countedQty: Number(counted[i.variantId]) })),
    [items, counted]
  )

  function submit() {
    setError(null)
    if (changed.length === 0) return setError('Belum ada selisih untuk disimpan')
    startTransition(async () => {
      const res = await recordOpnameAction({
        branchId,
        reason: reason.trim() || undefined,
        counts: changed,
      })
      if (!res.success) return setError(res.error)
      setDone(res.data.adjusted)
      setCounted({})
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alasan opname (opsional)"
          className="border-input bg-background h-9 flex-1 rounded-md border px-3 text-sm"
        />
        <Button onClick={submit} disabled={isPending || changed.length === 0}>
          {isPending ? 'Menyimpan…' : `Simpan (${changed.length} selisih)`}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {done !== null ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{done} item disesuaikan.</p>
      ) : null}

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Produk</th>
              <th className="px-4 py-3 text-right font-medium">Sistem</th>
              <th className="px-4 py-3 text-right font-medium">Hitung fisik</th>
              <th className="px-4 py-3 text-right font-medium">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const raw = counted[i.variantId]
              const n = raw === undefined || raw === '' ? null : Number(raw)
              const diff = n !== null && Number.isFinite(n) ? n - i.stockQty : null
              return (
                <tr key={i.variantId} className="border-border border-t">
                  <td className="px-4 py-3">{i.name}</td>
                  <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                    {i.stockQty}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={raw ?? ''}
                      placeholder={String(i.stockQty)}
                      onChange={(e) => setCounted((c) => ({ ...c, [i.variantId]: e.target.value }))}
                      className="border-input bg-background h-8 w-20 rounded-md border px-2 text-right"
                    />
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      diff === null || diff === 0
                        ? 'text-muted-foreground'
                        : diff > 0
                          ? 'text-emerald-500'
                          : 'text-destructive'
                    }`}
                  >
                    {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

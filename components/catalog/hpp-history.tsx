'use client'

import { useState } from 'react'
import { getCostHistoryAction } from '@/app/actions/catalog'
import { formatRupiahFromDecimal } from '@/lib/formatters'

interface CostRow {
  id: string
  cost: string
  previousCost: string | null
  effectiveFrom: string
  changedByEmail: string | null
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Inline HPP change history for one variant, loaded on demand so the product list stays light.
export function HppHistory({ variantId }: { variantId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<CostRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && rows === null) {
      setLoading(true)
      const res = await getCostHistoryAction(variantId)
      setRows(res.success ? res.data : [])
      setLoading(false)
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={toggle}
        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
      >
        {open ? 'Tutup riwayat' : 'Riwayat HPP'}
      </button>
      {open ? (
        <div className="border-border bg-muted/30 mt-2 rounded-lg border p-3 text-left">
          {loading ? (
            <p className="text-muted-foreground text-xs">Memuat…</p>
          ) : rows && rows.length > 0 ? (
            <ul className="divide-border divide-y text-xs">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="tabular-nums">
                    {r.previousCost ? (
                      <>
                        {formatRupiahFromDecimal(r.previousCost)}{' '}
                        <span className="text-muted-foreground">→</span>{' '}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Awal · </span>
                    )}
                    <span className="font-medium">{formatRupiahFromDecimal(r.cost)}</span>
                  </span>
                  <span className="text-muted-foreground text-right">
                    {when(r.effectiveFrom)}
                    {r.changedByEmail ? ` · ${r.changedByEmail}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs">Belum ada perubahan HPP.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

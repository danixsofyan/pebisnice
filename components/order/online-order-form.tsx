'use client'

import { useMemo, useState, useTransition } from 'react'
import { placeOrderAction } from '@/app/actions/online-order'
import { formatRupiahFromDecimal } from '@/lib/formatters'

interface MenuProduct {
  variantId: string
  name: string
  price: string
  stockQty: number
}

export function OnlineOrderForm({
  projectId,
  branchId,
  waNumber,
  storeName,
  products,
}: {
  projectId: string
  branchId: string
  waNumber: string | null
  storeName: string
  products: MenuProduct[]
}) {
  const [qty, setQty] = useState<Record<string, number>>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ waHref: string | null } | null>(null)
  const [isPending, startTransition] = useTransition()

  const chosen = useMemo(() => products.filter((p) => (qty[p.variantId] ?? 0) > 0), [products, qty])
  const total = chosen.reduce((sum, p) => sum + (qty[p.variantId] ?? 0) * Number(p.price), 0)

  function setItemQty(variantId: string, value: number, max: number) {
    setQty((q) => ({ ...q, [variantId]: Math.max(0, Math.min(max, value)) }))
  }

  function buildWaMessage() {
    const lines = chosen.map((p) => `- ${p.name} x${qty[p.variantId]}`)
    return [
      `Halo ${storeName}, saya mau pesan:`,
      ...lines,
      `Total: ${formatRupiahFromDecimal(String(total))}`,
      `Nama: ${name}`,
      phone ? `HP: ${phone}` : '',
      note ? `Catatan: ${note}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (chosen.length === 0) return setError('Pilih minimal satu produk')
    if (!name.trim()) return setError('Isi nama Anda')

    const message = buildWaMessage()
    startTransition(async () => {
      const res = await placeOrderAction({
        projectId,
        branchId,
        customerName: name,
        customerPhone: phone.trim() || undefined,
        note: note.trim() || undefined,
        items: chosen.map((p) => ({ variantId: p.variantId, qty: qty[p.variantId]! })),
      })
      if (!res.success) return setError(res.error)
      const waHref = waNumber
        ? `https://wa.me/${waNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`
        : null
      setDone({ waHref })
    })
  }

  if (done) {
    return (
      <div className="space-y-4 rounded-xl border p-5 text-center">
        <p className="font-semibold text-emerald-600 dark:text-emerald-400">Pesanan terkirim!</p>
        <p className="text-muted-foreground text-sm">
          Pesanan Anda sudah masuk. Konfirmasi ke penjual via WhatsApp agar segera diproses.
        </p>
        {done.waHref ? (
          <a
            href={done.waHref}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-5 text-sm font-medium text-white"
          >
            Buka WhatsApp
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="divide-y rounded-xl border">
        {products.map((p) => (
          <div key={p.variantId} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="text-muted-foreground text-xs">
                {formatRupiahFromDecimal(p.price)} · stok {p.stockQty}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setItemQty(p.variantId, (qty[p.variantId] ?? 0) - 1, p.stockQty)}
                className="h-8 w-8 rounded-md border text-lg leading-none"
              >
                −
              </button>
              <span className="w-6 text-center text-sm tabular-nums">{qty[p.variantId] ?? 0}</span>
              <button
                type="button"
                onClick={() => setItemQty(p.variantId, (qty[p.variantId] ?? 0) + 1, p.stockQty)}
                className="h-8 w-8 rounded-md border text-lg leading-none"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Anda *"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="No. WhatsApp (opsional)"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan (opsional)"
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Total: {formatRupiahFromDecimal(String(total))}
        </span>
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground h-10 rounded-md px-5 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Mengirim…' : 'Kirim pesanan'}
        </button>
      </div>
    </form>
  )
}

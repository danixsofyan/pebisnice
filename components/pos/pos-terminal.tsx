'use client'

import { useMemo, useState, useTransition } from 'react'
import { Minus, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSaleAction } from '@/app/actions/pos'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import type { SellableItem } from '@/lib/repositories/pos-catalog.repository'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Kartu' },
  { value: 'other', label: 'Lainnya' },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

interface CartEntry {
  item: SellableItem
  qty: number
  unitPrice: string
}

interface Receipt {
  orderCode: string
  total: string
  paidAmount: string
  changeAmount: string
}

// Cashier screen. Numbers shown here are preview only; every saved figure is recomputed server-side by priceCart(), so browser values can't affect what's recorded.
export function PosTerminal({
  branchId,
  branchName,
  items,
}: {
  branchId: string
  branchName: string
  items: SellableItem[]
}) {
  const [keyword, setKeyword] = useState('')
  const [cart, setCart] = useState<CartEntry[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmount, setPaidAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [isPending, startTransition] = useTransition()

  const visibleItems = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    if (!needle) return items

    return items.filter((item) =>
      [item.productName, item.variantName, item.sku]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle))
    )
  }, [items, keyword])

  const subtotalCents = cart.reduce(
    (total, entry) => total + Math.round(Number(entry.unitPrice || 0) * 100) * entry.qty,
    0
  )
  const subtotal = (subtotalCents / 100).toFixed(2)

  function addItem(item: SellableItem) {
    setError(null)
    setCart((current) => {
      const existing = current.find(
        (entry) => entry.item.productVariantId === item.productVariantId
      )
      if (existing) {
        return current.map((entry) =>
          entry.item.productVariantId === item.productVariantId
            ? { ...entry, qty: entry.qty + 1 }
            : entry
        )
      }
      return [...current, { item, qty: 1, unitPrice: '' }]
    })
  }

  function updateEntry(variantId: string, patch: Partial<CartEntry>) {
    setCart((current) =>
      current.map((entry) =>
        entry.item.productVariantId === variantId ? { ...entry, ...patch } : entry
      )
    )
  }

  function removeEntry(variantId: string) {
    setCart((current) => current.filter((entry) => entry.item.productVariantId !== variantId))
  }

  function submit() {
    setError(null)

    if (cart.length === 0) {
      setError('Keranjang masih kosong')
      return
    }
    if (cart.some((entry) => !entry.unitPrice)) {
      setError('Harga setiap item wajib diisi')
      return
    }

    startTransition(async () => {
      const result = await createSaleAction({
        branchId,
        lines: cart.map((entry) => ({
          productVariantId: entry.item.productVariantId,
          qty: entry.qty,
          unitPrice: Number(entry.unitPrice).toFixed(2),
        })),
        discount: { type: 'none' },
        paymentMethod,
        paidAmount: Number(paidAmount || subtotal).toFixed(2),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setReceipt(result.data)
      setCart([])
      setPaidAmount('')
    })
  }

  if (receipt) {
    return (
      <div className="border-border bg-card mx-auto max-w-sm rounded-xl border p-6 text-center">
        <p className="text-muted-foreground text-sm">Transaksi tersimpan</p>
        <p className="mt-1 font-mono text-lg font-bold">{receipt.orderCode}</p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium">{formatRupiahFromDecimal(receipt.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Bayar</dt>
            <dd>{formatRupiahFromDecimal(receipt.paidAmount)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>Kembali</dt>
            <dd>{formatRupiahFromDecimal(receipt.changeAmount)}</dd>
          </div>
        </dl>

        <Button className="mt-6 w-full" onClick={() => setReceipt(null)}>
          Transaksi berikutnya
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Cari produk atau SKU"
            className="pl-9"
            autoFocus
          />
        </div>

        {visibleItems.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-lg border border-dashed p-8 text-center text-sm">
            {items.length === 0
              ? 'Belum ada produk jadi di cabang ini.'
              : 'Tidak ada produk yang cocok.'}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <button
                key={item.productVariantId}
                onClick={() => addItem(item)}
                className="border-border hover:border-primary hover:bg-accent rounded-lg border p-3 text-left transition-colors"
              >
                <p className="text-sm font-medium">{item.productName}</p>
                {item.variantName ? (
                  <p className="text-muted-foreground text-xs">{item.variantName}</p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">Stok {item.stockQty}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="border-border bg-card h-fit space-y-4 rounded-xl border p-4">
        <div>
          <h2 className="font-bold">Keranjang</h2>
          <p className="text-muted-foreground text-xs">{branchName}</p>
        </div>

        {cart.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Belum ada item</p>
        ) : (
          <ul className="space-y-3">
            {cart.map((entry) => (
              <li key={entry.item.productVariantId} className="space-y-2 border-b pb-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{entry.item.productName}</p>
                  <button
                    onClick={() => removeEntry(entry.item.productVariantId)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Hapus ${entry.item.productName}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      updateEntry(entry.item.productVariantId, {
                        qty: Math.max(1, entry.qty - 1),
                      })
                    }
                    aria-label="Kurangi"
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{entry.qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => updateEntry(entry.item.productVariantId, { qty: entry.qty + 1 })}
                    aria-label="Tambah"
                  >
                    <Plus className="size-3" />
                  </Button>

                  <Input
                    value={entry.unitPrice}
                    onChange={(event) =>
                      updateEntry(entry.item.productVariantId, { unitPrice: event.target.value })
                    }
                    inputMode="numeric"
                    placeholder="Harga"
                    className="h-8 flex-1"
                    aria-label={`Harga ${entry.item.productName}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between border-t pt-3 text-sm font-bold">
          <span>Subtotal</span>
          <span>{formatRupiahFromDecimal(subtotal)}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment-method">Metode bayar</Label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paid-amount">Jumlah bayar</Label>
          <Input
            id="paid-amount"
            value={paidAmount}
            onChange={(event) => setPaidAmount(event.target.value)}
            inputMode="numeric"
            placeholder={subtotal}
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button className="w-full" onClick={submit} disabled={isPending || cart.length === 0}>
          {isPending ? 'Menyimpan…' : 'Simpan transaksi'}
        </Button>
      </aside>
    </div>
  )
}

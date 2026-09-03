'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { closeCashSessionAction, openCashSessionAction } from '@/app/actions/pos'
import { formatRupiahFromDecimal } from '@/lib/formatters'

interface ClosingResult {
  expectedBalance: string
  countedBalance: string
  difference: string
  isBalanced: boolean
}

/**
 * Buka dan tutup shift kasir.
 *
 * Saat menutup, kasir hanya menyetor hasil hitung fisik. Saldo yang diharapkan
 * dan selisihnya dihitung server dari transaksi tunai yang tercatat — angka
 * dari browser tidak dipakai.
 */
export function CashSessionPanel({
  branchId,
  branchName,
  openSession,
}: {
  branchId: string
  branchName: string
  openSession: { id: string; openingBalance: string } | null
}) {
  const [openingBalance, setOpeningBalance] = useState('')
  const [countedBalance, setCountedBalance] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [closing, setClosing] = useState<ClosingResult | null>(null)
  const [showClose, setShowClose] = useState(false)
  const [isPending, startTransition] = useTransition()

  function open() {
    setError(null)
    startTransition(async () => {
      const result = await openCashSessionAction({
        branchId,
        openingBalance: Number(openingBalance || 0).toFixed(2),
      })
      if (!result.success) setError(result.error)
    })
  }

  function close() {
    setError(null)
    startTransition(async () => {
      const result = await closeCashSessionAction({
        branchId,
        countedBalance: Number(countedBalance || 0).toFixed(2),
        note: note.trim() || undefined,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setClosing(result.data)
      setShowClose(false)
    })
  }

  if (closing) {
    return (
      <div className="border-border bg-card rounded-xl border p-6">
        <h2 className="font-bold">Shift ditutup — {branchName}</h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Seharusnya</dt>
            <dd>{formatRupiahFromDecimal(closing.expectedBalance)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Hasil hitung</dt>
            <dd>{formatRupiahFromDecimal(closing.countedBalance)}</dd>
          </div>
          <div
            className={`flex justify-between border-t pt-2 font-bold ${
              closing.isBalanced ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            <dt>Selisih</dt>
            <dd>{formatRupiahFromDecimal(closing.difference)}</dd>
          </div>
        </dl>

        {!closing.isBalanced ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Selisih tercatat apa adanya di audit log.
          </p>
        ) : null}
      </div>
    )
  }

  if (!openSession) {
    return (
      <div className="border-border bg-card mx-auto max-w-sm rounded-xl border p-6">
        <h2 className="font-bold">Buka shift — {branchName}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Kasir belum bisa dipakai sebelum shift dibuka.
        </p>

        <div className="mt-4 space-y-2">
          <Label htmlFor="opening-balance">Modal awal</Label>
          <Input
            id="opening-balance"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {error}
          </p>
        ) : null}

        <Button className="mt-4 w-full" onClick={open} disabled={isPending}>
          {isPending ? 'Membuka…' : 'Buka shift'}
        </Button>
      </div>
    )
  }

  return (
    <div className="border-border bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
      <div>
        <p className="text-sm font-medium">Shift aktif — {branchName}</p>
        <p className="text-muted-foreground text-xs">
          Modal awal {formatRupiahFromDecimal(openSession.openingBalance)}
        </p>
      </div>

      {showClose ? (
        <div className="flex flex-1 flex-wrap items-end justify-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="counted-balance" className="text-xs">
              Uang di laci
            </Label>
            <Input
              id="counted-balance"
              value={countedBalance}
              onChange={(event) => setCountedBalance(event.target.value)}
              inputMode="numeric"
              className="h-9 w-36"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="close-note" className="text-xs">
              Catatan
            </Label>
            <Input
              id="close-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-9 w-44"
              placeholder="Opsional"
            />
          </div>
          <Button onClick={close} disabled={isPending}>
            {isPending ? 'Menutup…' : 'Konfirmasi tutup'}
          </Button>
          <Button variant="outline" onClick={() => setShowClose(false)}>
            Batal
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowClose(true)}>
          Tutup shift
        </Button>
      )}

      {error ? (
        <p role="alert" className="text-destructive w-full text-sm">
          {error}
        </p>
      ) : null}
    </div>
  )
}

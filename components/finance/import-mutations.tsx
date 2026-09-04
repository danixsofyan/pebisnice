'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { importMutationsAction } from '@/app/actions/finance'

interface ImportResult {
  imported: number
  skipped: number
  parseErrors: Array<{ line: number; message: string }>
}

export function ImportMutations() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    const data = new FormData()
    data.set('bank', 'bca')
    data.set('year', String(year))
    data.set('file', file)
    startTransition(async () => {
      const res = await importMutationsAction(data)
      if (inputRef.current) inputRef.current.value = ''
      if (!res.success) return setError(res.error)
      setResult(res.data)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import mutasi BCA
      </Button>
    )
  }

  return (
    <div className="border-border bg-card w-full space-y-3 rounded-xl border p-4 sm:w-96">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Import mutasi rekening (BCA)</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Tutup
        </button>
      </div>
      <p className="text-muted-foreground text-xs">
        Unggah CSV hasil unduh KlikBCA (kolom Tanggal, Keterangan, Mutasi, Saldo). Baris duplikat
        otomatis dilewati, jadi aman diimpor ulang.
      </p>
      <label className="flex items-center gap-2 text-sm">
        Tahun mutasi
        <input
          type="number"
          value={year}
          min={2000}
          max={2100}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border-input bg-background h-9 w-24 rounded-md border px-2"
        />
      </label>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,text/csv"
        onChange={onFile}
        disabled={isPending}
        className="text-sm"
      />
      {isPending ? <p className="text-muted-foreground text-sm">Mengimpor…</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {result ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            {result.imported} mutasi diimpor · {result.skipped} dilewati (duplikat).
          </p>
          {result.parseErrors.length > 0 ? (
            <div className="text-destructive text-xs">
              Baris dilewati:
              <ul className="list-disc pl-4">
                {result.parseErrors.slice(0, 8).map((e) => (
                  <li key={e.line}>
                    baris {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

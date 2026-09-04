'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { importProductsAction } from '@/app/actions/catalog'
import { PRODUCT_CSV_TEMPLATE } from '@/lib/import/product-import'

interface ImportResult {
  created: number
  parseErrors: Array<{ line: number; message: string }>
  failed: Array<{ name: string; error: string }>
}

export function ImportProducts({ branchId }: { branchId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(PRODUCT_CSV_TEMPLATE)}`

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    const data = new FormData()
    data.set('branchId', branchId)
    data.set('file', file)
    startTransition(async () => {
      const res = await importProductsAction(data)
      if (inputRef.current) inputRef.current.value = ''
      if (!res.success) return setError(res.error)
      setResult(res.data)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import CSV
      </Button>
    )
  }

  return (
    <div className="border-border bg-card w-full space-y-3 rounded-xl border p-4 sm:w-96">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Import produk dari CSV</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Tutup
        </button>
      </div>
      <p className="text-muted-foreground text-xs">
        Kolom: name, type, sku, variant, hpp, stock.{' '}
        <a href={templateHref} download="produk-template.csv" className="underline">
          Unduh template
        </a>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onFile}
        disabled={isPending}
        className="text-sm"
      />
      {isPending ? <p className="text-muted-foreground text-sm">Mengimpor…</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {result ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium text-emerald-600 dark:text-emerald-400">
            {result.created} produk berhasil dibuat.
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
          {result.failed.length > 0 ? (
            <div className="text-destructive text-xs">
              Gagal dibuat:
              <ul className="list-disc pl-4">
                {result.failed.slice(0, 8).map((f, i) => (
                  <li key={i}>
                    {f.name}: {f.error}
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

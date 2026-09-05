'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createSaleAction } from '@/app/actions/pos'
import {
  listQueuedSales,
  markQueuedSaleFailed,
  removeQueuedSale,
  QUEUE_CHANGE_EVENT,
  type QueuedSale,
} from '@/lib/offline/sale-queue'

// Registers the service worker and drains the offline sale queue. Mounted app-wide so queued sales
// keep syncing even if the cashier navigates away from the POS screen. Replaying is idempotent
// server-side (clientRequestId), so a double-drain can't double-record a sale.
export function OfflineSync() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [queue, setQueue] = useState<QueuedSale[]>([])
  const [syncing, setSyncing] = useState(false)
  const draining = useRef(false)

  const refresh = useCallback(async () => {
    setQueue(await listQueuedSales())
  }, [])

  const drain = useCallback(async () => {
    if (draining.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    draining.current = true
    setSyncing(true)
    try {
      const pending = (await listQueuedSales()).filter((s) => s.status === 'pending')
      for (const sale of pending) {
        try {
          const res = await createSaleAction(sale.payload)
          if (res.success) {
            await removeQueuedSale(sale.clientRequestId)
          } else {
            // The server rejected the sale on its merits (stock short, shift closed, voucher
            // gone). Retrying won't help, so park it as failed for the cashier to resolve.
            await markQueuedSaleFailed(sale.clientRequestId, res.error)
          }
        } catch {
          // Network dropped mid-drain: stop and keep the rest pending for the next attempt.
          break
        }
      }
    } finally {
      draining.current = false
      setSyncing(false)
      await refresh()
    }
  }, [refresh])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Bootstrap in a macrotask so the initial load/drain runs as a callback rather than a
    // synchronous effect body (which would setState during the effect and cascade renders).
    const bootstrap = window.setTimeout(() => {
      void refresh()
      void drain()
    }, 0)

    const onOnline = () => {
      setOnline(true)
      void drain()
    }
    const onOffline = () => setOnline(false)
    const onQueueChange = () => void refresh()

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener(QUEUE_CHANGE_EVENT, onQueueChange)
    const interval = window.setInterval(() => void drain(), 20_000)

    return () => {
      window.clearTimeout(bootstrap)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener(QUEUE_CHANGE_EVENT, onQueueChange)
      window.clearInterval(interval)
    }
  }, [drain, refresh])

  const pending = queue.filter((s) => s.status === 'pending').length
  const failed = queue.filter((s) => s.status === 'failed')

  if (online && pending === 0 && failed.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 space-y-2">
      {!online ? (
        <div className="rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-lg">
          Mode offline — transaksi disimpan di perangkat
        </div>
      ) : null}

      {pending > 0 ? (
        <div className="border-border bg-card flex items-center justify-between rounded-lg border px-4 py-2 text-sm shadow-lg">
          <span>
            {pending} transaksi menunggu sinkron{syncing ? '…' : ''}
          </span>
          <button
            onClick={() => void drain()}
            disabled={syncing || !online}
            className="text-primary text-xs font-medium disabled:opacity-50"
          >
            Kirim sekarang
          </button>
        </div>
      ) : null}

      {failed.length > 0 ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm shadow-lg">
          <p className="font-medium text-red-500">
            {failed.length} transaksi gagal disinkron
          </p>
          <ul className="mt-1 space-y-1">
            {failed.map((s) => (
              <li key={s.clientRequestId} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground truncate text-xs">{s.error}</span>
                <button
                  onClick={() => void removeQueuedSale(s.clientRequestId)}
                  className="text-muted-foreground hover:text-foreground shrink-0 text-xs"
                >
                  Buang
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

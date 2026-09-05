// Client-side offline queue for POS sales, backed by IndexedDB so it survives reloads and app
// restarts. Each entry carries a clientRequestId that the server uses to make replay idempotent
// (a sale synced twice is recorded once). This module is browser-only; every call no-ops or throws
// clearly if IndexedDB is unavailable (e.g. during SSR).

const DB_NAME = 'pebisnice-offline'
const DB_VERSION = 1
const STORE = 'sales'

export interface QueuedSalePayload {
  branchId: string
  lines: Array<{ productVariantId: string; qty: number; unitPrice: string }>
  paymentMethod: 'cash' | 'transfer' | 'qris' | 'card' | 'other'
  paidAmount: string
  clientRequestId: string
}

export interface QueuedSale {
  clientRequestId: string
  payload: QueuedSalePayload
  total: string
  createdAt: number
  status: 'pending' | 'failed'
  error?: string
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientRequestId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
      })
  )
}

export async function enqueueSale(
  entry: Omit<QueuedSale, 'createdAt' | 'status'>
): Promise<void> {
  if (!hasIndexedDb()) throw new Error('Penyimpanan offline tidak tersedia di perangkat ini')
  const full: QueuedSale = { ...entry, createdAt: Date.now(), status: 'pending' }
  await tx('readwrite', (store) => store.put(full))
  notifyChange()
}

export async function listQueuedSales(): Promise<QueuedSale[]> {
  if (!hasIndexedDb()) return []
  const all = await tx<QueuedSale[]>('readonly', (store) => store.getAll())
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function removeQueuedSale(clientRequestId: string): Promise<void> {
  if (!hasIndexedDb()) return
  await tx('readwrite', (store) => store.delete(clientRequestId))
  notifyChange()
}

export async function markQueuedSaleFailed(clientRequestId: string, error: string): Promise<void> {
  if (!hasIndexedDb()) return
  const existing = await tx<QueuedSale | undefined>('readonly', (store) =>
    store.get(clientRequestId)
  )
  if (!existing) return
  await tx('readwrite', (store) => store.put({ ...existing, status: 'failed', error }))
  notifyChange()
}

// The UI listens for this to refresh its pending/failed counters immediately after a change.
export const QUEUE_CHANGE_EVENT = 'pebisnice:offline-queue-changed'

function notifyChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUEUE_CHANGE_EVENT))
  }
}

import { ValidationError } from '@/lib/errors/app-error'

export type MovementType =
  | 'sale'
  | 'return'
  | 'cancellation'
  | 'adjustment'
  | 'opname'
  | 'initial'
  | 'transfer_out'
  | 'transfer_in'

// Stock movement command; shaped per kind so the type forces correct input: sale needs a positive qty, adjustment a signed delta, opname a counted qty.
export type StockMovementCommand =
  | { type: 'sale'; qty: number; referenceId?: string }
  | { type: 'return'; qty: number; referenceId?: string }
  | { type: 'cancellation'; qty: number; referenceId?: string }
  | { type: 'adjustment'; delta: number; reason: string }
  | { type: 'opname'; countedQty: number; reason: string }
  | { type: 'initial'; qty: number }
  | { type: 'transfer_out'; qty: number; referenceId?: string }
  | { type: 'transfer_in'; qty: number; referenceId?: string }

export interface PlannedStockMovement {
  movementType: MovementType
  delta: number
  quantityAfter: number
  note: string | null
  referenceId: string | null
}

export class InsufficientStockError extends ValidationError {
  constructor(currentQty: number, delta: number) {
    super(`Stok tidak mencukupi: tersedia ${currentQty}, diminta ${Math.abs(delta)}`, {
      qty: ['Stok tidak mencukupi'],
    })
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} harus bilangan bulat positif`, {
      [field]: ['Harus bilangan bulat positif'],
    })
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} harus bilangan bulat tidak negatif`, {
      [field]: ['Harus bilangan bulat tidak negatif'],
    })
  }
}

function assertReason(reason: string): void {
  if (reason.trim().length === 0) {
    throw new ValidationError('Alasan wajib diisi', { reason: ['Alasan wajib diisi'] })
  }
}

function resolveDelta(command: StockMovementCommand, currentQty: number): number {
  switch (command.type) {
    case 'sale':
      assertPositiveInteger(command.qty, 'qty')
      return -command.qty

    case 'return':
    case 'cancellation':
    case 'transfer_in':
      assertPositiveInteger(command.qty, 'qty')
      return command.qty

    case 'transfer_out':
      assertPositiveInteger(command.qty, 'qty')
      return -command.qty

    case 'adjustment':
      assertReason(command.reason)
      if (!Number.isInteger(command.delta) || command.delta === 0) {
        throw new ValidationError('Delta penyesuaian tidak boleh nol', {
          delta: ['Harus bilangan bulat selain nol'],
        })
      }
      return command.delta

    case 'opname':
      assertReason(command.reason)
      assertNonNegativeInteger(command.countedQty, 'countedQty')
      return command.countedQty - currentQty

    case 'initial':
      assertNonNegativeInteger(command.qty, 'qty')
      return command.qty - currentQty
  }
}

function resolveNote(command: StockMovementCommand): string | null {
  if (command.type === 'adjustment' || command.type === 'opname') return command.reason.trim()
  return null
}

function resolveReferenceId(command: StockMovementCommand): string | null {
  if (
    command.type === 'sale' ||
    command.type === 'return' ||
    command.type === 'cancellation' ||
    command.type === 'transfer_out' ||
    command.type === 'transfer_in'
  ) {
    return command.referenceId ?? null
  }
  return null
}

// Compute a command's effect on the balance without touching the database; throws if it would go negative.
export function planStockMovement(
  command: StockMovementCommand,
  currentQty: number
): PlannedStockMovement {
  assertNonNegativeInteger(currentQty, 'currentQty')

  const delta = resolveDelta(command, currentQty)
  const quantityAfter = currentQty + delta

  if (quantityAfter < 0) throw new InsufficientStockError(currentQty, delta)

  return {
    movementType: command.type,
    delta,
    quantityAfter,
    note: resolveNote(command),
    referenceId: resolveReferenceId(command),
  }
}

// Reconcile a balance against its ledger; used by tests and opname to prove stock_qty = sum(movements.qty).
export function reconcileBalance(movements: Array<{ qty: number }>): number {
  return movements.reduce((total, movement) => total + movement.qty, 0)
}

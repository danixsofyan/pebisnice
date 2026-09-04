import { getAccessibleBranches, getSessionContext } from '@/lib/auth/session-context'
import { posService } from '@/lib/services/pos.service'
import { formatRupiahFromDecimal } from '@/lib/formatters'
import { ReceiptPrintButton } from '@/components/pos/receipt-print-button'

const PAYMENT: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  card: 'Kartu',
  other: 'Lainnya',
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getSessionContext()
  const [{ header, items }, branches] = await Promise.all([
    posService.getReceipt(context.projectId, context.userId, id),
    getAccessibleBranches(context),
  ])
  const branchName = header.branchId
    ? (branches.find((b) => b.id === header.branchId)?.name ?? '')
    : ''

  return (
    <div className="font-mono text-xs text-black">
      <div className="mx-auto w-[58mm] max-w-full border border-dashed border-black/30 bg-white p-3 print:border-0">
        <div className="text-center">
          <p className="text-sm font-bold uppercase">{context.projectName}</p>
          {branchName ? <p>{branchName}</p> : null}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>No</span>
            <span>{header.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu</span>
            <span>{formatDateTime(header.orderDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Bayar</span>
            <span>{PAYMENT[header.paymentMethod ?? ''] ?? header.paymentMethod ?? '-'}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="space-y-1">
          {items.map((item, index) => {
            const lineTotal = Number(item.unitPrice) * item.qty
            return (
              <div key={index}>
                <div>
                  {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ''}
                </div>
                <div className="flex justify-between">
                  <span>
                    {item.qty} x {formatRupiahFromDecimal(item.unitPrice)}
                  </span>
                  <span>{formatRupiahFromDecimal(String(lineTotal))}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiahFromDecimal(header.grossAmount)}</span>
          </div>
          {Number(header.discountAmount) > 0 ? (
            <div className="flex justify-between">
              <span>Diskon</span>
              <span>-{formatRupiahFromDecimal(header.discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatRupiahFromDecimal(header.netAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Dibayar</span>
            <span>{formatRupiahFromDecimal(header.paidAmount ?? '0')}</span>
          </div>
          <div className="flex justify-between">
            <span>Kembali</span>
            <span>{formatRupiahFromDecimal(header.changeAmount ?? '0')}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-black/40" />
        <p className="text-center">Terima kasih 🙏</p>
      </div>

      <ReceiptPrintButton />
    </div>
  )
}

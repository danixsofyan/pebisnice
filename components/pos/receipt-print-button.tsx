'use client'

import { Button } from '@/components/ui/button'

/** Print button, hidden while printing. */
export function ReceiptPrintButton() {
  return (
    <div className="mt-4 flex justify-center print:hidden">
      <Button onClick={() => window.print()}>Cetak struk</Button>
    </div>
  )
}

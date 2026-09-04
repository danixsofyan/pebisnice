'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { removeExpenseAction } from '@/app/actions/expenses'

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function remove() {
    if (!confirm('Hapus pengeluaran ini?')) return
    startTransition(async () => {
      await removeExpenseAction(expenseId)
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={remove} disabled={isPending}>
      Hapus
    </Button>
  )
}

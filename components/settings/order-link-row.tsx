'use client'

import { useState, useTransition } from 'react'
import { createOrderLinkAction } from '@/app/actions/online-order'

export function OrderLinkRow({
  branchId,
  branchName,
  slug: initialSlug,
}: {
  branchId: string
  branchName: string
  slug: string | null
}) {
  const [slug, setSlug] = useState(initialSlug)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const url =
    slug && typeof window !== 'undefined'
      ? `${window.location.origin}/o/${slug}`
      : slug
        ? `/o/${slug}`
        : null

  function generate() {
    startTransition(async () => {
      const res = await createOrderLinkAction(branchId)
      if (res.success) setSlug(res.data.slug)
    })
  }

  function copy() {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs">
      <span className="text-muted-foreground">{branchName}</span>
      {slug ? (
        <span className="flex items-center gap-2">
          <code className="break-all">/o/{slug}</code>
          <button type="button" onClick={copy} className="text-primary underline">
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className="border-input hover:bg-muted/40 rounded-md border px-2 py-1"
        >
          {isPending ? 'Membuat…' : 'Buat link'}
        </button>
      )}
    </div>
  )
}

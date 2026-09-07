'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetAction } from '@/app/actions/auth-password'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(id)
  }, [countdown])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const res = await requestPasswordResetAction({ email: email.trim() })
      if (res.success) {
        setMessage('Jika email terdaftar, tautan reset telah dikirim. Cek kotak masuk Anda.')
        setCountdown(res.retryAfterSec ?? 60)
      } else {
        // Rate-limited or invalid; show the reason and still hold a cooldown so the button locks.
        setError(res.error)
        setCountdown(60)
      }
    })
  }

  const disabled = isPending || countdown > 0

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={disabled || !email.trim()}>
        {isPending
          ? 'Mengirim…'
          : countdown > 0
            ? `Kirim ulang (${countdown}d)`
            : 'Kirim tautan reset'}
      </Button>
    </form>
  )
}

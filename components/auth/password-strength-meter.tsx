'use client'

import { scorePassword } from '@/lib/auth/password-strength'
import { cn } from '@/lib/utils'

const BAR_COLORS = [
  'bg-muted',
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-emerald-500',
] as const

const TEXT_COLORS = [
  'text-muted-foreground',
  'text-red-500',
  'text-orange-500',
  'text-yellow-600 dark:text-yellow-500',
  'text-emerald-600 dark:text-emerald-500',
] as const

// Four-segment strength bar + label. Only shown once the user starts typing.
export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const { score, label } = scorePassword(password)

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              seg <= score ? BAR_COLORS[score] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs', TEXT_COLORS[score])}>Kekuatan: {label}</p>
    </div>
  )
}

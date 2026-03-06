import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatRupiah, formatPercentage } from '@/lib/formatters'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface KpiCardProps {
  title: string
  value: number
  change?: number
  format: 'currency' | 'percentage' | 'number'
  description?: string
  isLoading?: boolean
  className?: string
  icon?: React.ReactNode
  iconClassName?: string

  'aria-label'?: string
}

export function KpiCard({
  title,
  value,
  change,
  format,
  description,
  isLoading = false,
  className,
  icon,
  iconClassName,
  'aria-label': ariaLabel,
}: KpiCardProps) {
  const formatted =
    format === 'currency'
      ? formatRupiah(value)
      : format === 'percentage'
        ? `${value.toFixed(1)}%`
        : value.toLocaleString('id-ID')

  const isUp = change !== undefined && change > 0
  const isDown = change !== undefined && change < 0

  if (isLoading) {
    return (
      <Card
        className={cn('animate-pulse', className)}
        aria-busy="true"
        aria-label={`Memuat ${title}`}
      >
        <CardHeader className="pb-2">
          <div className="bg-muted h-4 w-24 rounded" />
        </CardHeader>
        <CardContent>
          <div className="bg-muted h-8 w-32 rounded" />
        </CardContent>
      </Card>
    )
  }

  const trendLabel = isUp
    ? `naik ${formatPercentage(change!)}`
    : isDown
      ? `turun ${formatPercentage(change!)}`
      : 'tidak berubah'
  const fullAriaLabel =
    ariaLabel ?? `${title}: ${formatted}, ${change !== undefined ? trendLabel : ''}`

  return (
    <Card
      className={cn('group hover:border-primary/50 shadow-sm transition-colors', className)}
      role="region"
      aria-label={fullAriaLabel}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className={cn('rounded-lg p-2', iconClassName)}>{icon}</div>
        {change !== undefined && (
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-semibold',
              isUp && 'text-emerald-500',
              isDown && 'text-rose-500',
              !isUp && !isDown && 'text-muted-foreground'
            )}
            aria-label={trendLabel}
            role="status"
          >
            {isUp ? (
              <TrendingUp className="size-3" aria-hidden="true" />
            ) : isDown ? (
              <TrendingDown className="size-3" aria-hidden="true" />
            ) : (
              <Minus className="size-3" aria-hidden="true" />
            )}
            {formatPercentage(Math.abs(change))}
          </span>
        )}
      </CardHeader>

      <CardContent>
        <CardTitle
          className="text-muted-foreground mb-1 text-sm font-medium tracking-wider uppercase"
          id={`kpi-${title.replace(/\s/g, '-')}`}
        >
          {title}
        </CardTitle>
        <div
          className="truncate text-2xl font-bold tracking-tight 2xl:text-3xl"
          aria-labelledby={`kpi-${title.replace(/\s/g, '-')}`}
        >
          {formatted}
        </div>
        {description && <p className="text-muted-foreground mt-1 text-xs">{description}</p>}
      </CardContent>
    </Card>
  )
}

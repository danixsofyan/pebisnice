// Format a NUMERIC(18,2) string as Rupiah. Takes a string, not a number, so large values don't lose precision through a float, matching lib/domain/money.ts.
export function formatRupiahFromDecimal(value: string): string {
  const negative = value.startsWith('-')
  const [whole = '0'] = value.replace('-', '').split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${negative ? '-' : ''}Rp ${grouped}`
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

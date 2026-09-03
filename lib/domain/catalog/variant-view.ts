/**
 * Dua bentuk tampilan varian produk.
 *
 * Perbedaannya bukan soal menyembunyikan di UI: bentuk tanpa biaya memang
 * tidak pernah meng-select kolom HPP dari database, sehingga nilainya tidak
 * pernah melewati batas server sekalipun ada bug serialisasi.
 */

export interface VariantWithoutCost {
  id: string
  projectId: string
  productId: string
  skuVariant: string | null
  variantName: string | null
}

export interface VariantWithCost extends VariantWithoutCost {
  hpp: string
  hppUpdatedAt: Date | null
}

export type VariantView = VariantWithoutCost | VariantWithCost

/** Nama kolom yang dianggap membocorkan biaya. Dipakai juga oleh test. */
export const COST_FIELDS = ['hpp', 'hppUpdatedAt', 'hpp_at_time', 'cost', 'costAmount'] as const

export function hasCost(variant: VariantView): variant is VariantWithCost {
  return 'hpp' in variant
}

/**
 * Jaring pengaman terakhir sebelum data meninggalkan server. Idealnya tidak
 * pernah menemukan apa pun untuk dibuang — kalau menemukan, berarti ada query
 * yang meng-select kolom biaya padahal seharusnya tidak.
 */
export function stripCostFields<T extends object>(value: T): Omit<T, (typeof COST_FIELDS)[number]> {
  const clean = { ...value } as Record<string, unknown>
  for (const field of COST_FIELDS) delete clean[field]
  return clean as Omit<T, (typeof COST_FIELDS)[number]>
}

export function containsCostField(value: object): boolean {
  return COST_FIELDS.some((field) => field in value)
}

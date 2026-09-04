// Two variant view shapes; the cost-free one never selects the HPP column, so cost cannot leak past a serialization bug.

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

// Column names considered cost-revealing; also used by tests.
export const COST_FIELDS = ['hpp', 'hppUpdatedAt', 'hpp_at_time', 'cost', 'costAmount'] as const

export function hasCost(variant: VariantView): variant is VariantWithCost {
  return 'hpp' in variant
}

// Last guard before data leaves the server; finding anything means a query selected a cost column it should not.
export function stripCostFields<T extends object>(value: T): Omit<T, (typeof COST_FIELDS)[number]> {
  const clean = { ...value } as Record<string, unknown>
  for (const field of COST_FIELDS) delete clean[field]
  return clean as Omit<T, (typeof COST_FIELDS)[number]>
}

export function containsCostField(value: object): boolean {
  return COST_FIELDS.some((field) => field in value)
}

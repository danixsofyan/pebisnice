import type { ListedObject } from '@/lib/storage/object-store'

// Selects orphaned product images (objects no product row references). Kept IO-free for testing; only product-image keys, and only past the age threshold so in-flight uploads survive.

const PRODUCT_IMAGE_KEY = /^[0-9a-f-]{36}\/products\/[^/]+$/i

export function isProductImageKey(key: string): boolean {
  return PRODUCT_IMAGE_KEY.test(key)
}

export interface OrphanScanInput {
  objects: ListedObject[]
  referencedKeys: Set<string>
  now: Date
  minAgeMs: number
}

export function selectOrphans(input: OrphanScanInput): string[] {
  const threshold = input.now.getTime() - input.minAgeMs

  return (
    input.objects
      .filter((object) => isProductImageKey(object.key))
      .filter((object) => !input.referencedKeys.has(object.key))
      // No date means unknown age; leave it.
      .filter((object) => object.lastModified !== null && object.lastModified.getTime() < threshold)
      .map((object) => object.key)
  )
}

/** Default age threshold: 24h, long enough for in-flight uploads. */
export const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000

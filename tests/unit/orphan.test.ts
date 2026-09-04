import { describe, expect, it } from 'vitest'
import { isProductImageKey, selectOrphans, ORPHAN_MIN_AGE_MS } from '@/lib/domain/media/orphan'
import type { ListedObject } from '@/lib/storage/object-store'

const PROJECT = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-09-04T12:00:00Z')
const OLD = new Date(NOW.getTime() - ORPHAN_MIN_AGE_MS - 1000)
const FRESH = new Date(NOW.getTime() - 1000)

function obj(key: string, lastModified: Date | null): ListedObject {
  return { key, lastModified, size: 10 }
}

describe('pengenalan kunci foto produk', () => {
  it('mengenali pola <project>/products/<file>', () => {
    expect(isProductImageKey(`${PROJECT}/products/abc.webp`)).toBe(true)
  })
  it('menolak pola lain', () => {
    expect(isProductImageKey(`${PROJECT}/diagnostic/x.txt`)).toBe(false)
    expect(isProductImageKey('sembarang/objek')).toBe(false)
  })
})

describe('pemilihan berkas yatim', () => {
  const base = { referencedKeys: new Set<string>(), now: NOW, minAgeMs: ORPHAN_MIN_AGE_MS }

  it('menghapus foto lama yang tak dirujuk', () => {
    const orphans = selectOrphans({ ...base, objects: [obj(`${PROJECT}/products/a.webp`, OLD)] })
    expect(orphans).toEqual([`${PROJECT}/products/a.webp`])
  })

  it('membiarkan foto yang masih dirujuk produk', () => {
    const orphans = selectOrphans({
      ...base,
      referencedKeys: new Set([`${PROJECT}/products/a.webp`]),
      objects: [obj(`${PROJECT}/products/a.webp`, OLD)],
    })
    expect(orphans).toEqual([])
  })

  it('membiarkan foto yang baru diunggah (di bawah ambang usia)', () => {
    const orphans = selectOrphans({ ...base, objects: [obj(`${PROJECT}/products/a.webp`, FRESH)] })
    expect(orphans).toEqual([])
  })

  it('tidak pernah menyentuh objek non-foto-produk', () => {
    const orphans = selectOrphans({ ...base, objects: [obj(`${PROJECT}/diagnostic/x.txt`, OLD)] })
    expect(orphans).toEqual([])
  })

  it('membiarkan objek tanpa tanggal (usia tak pasti)', () => {
    const orphans = selectOrphans({ ...base, objects: [obj(`${PROJECT}/products/a.webp`, null)] })
    expect(orphans).toEqual([])
  })
})

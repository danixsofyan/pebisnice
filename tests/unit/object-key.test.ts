import { describe, expect, it } from 'vitest'
import {
  buildObjectKey,
  fileProxyUrl,
  objectKeyBelongsToProject,
  objectKeyFromSegments,
} from '@/lib/storage/object-key'

const PROJECT_A = '11111111-1111-4111-8111-111111111111'
const PROJECT_B = '22222222-2222-4222-8222-222222222222'

describe('object key', () => {
  it('menyusun kunci berprefiks project', () => {
    expect(
      buildObjectKey({ projectId: PROJECT_A, resource: 'products', id: 'abc123', ext: 'WEBP' })
    ).toBe(`${PROJECT_A}/products/abc123.webp`)
  })

  it('menolak projectId yang bukan UUID', () => {
    expect(() =>
      buildObjectKey({ projectId: 'bukan-uuid', resource: 'products', id: 'x', ext: 'webp' })
    ).toThrow()
  })

  it('menolak resource dan ekstensi yang mengandung karakter berbahaya', () => {
    expect(() =>
      buildObjectKey({ projectId: PROJECT_A, resource: '../etc', id: 'x', ext: 'webp' })
    ).toThrow()
    expect(() =>
      buildObjectKey({ projectId: PROJECT_A, resource: 'products', id: 'x', ext: 'php.webp' })
    ).toThrow()
  })
})

describe('penegakan tenant pada kunci proxy', () => {
  it('menerima kunci milik project sendiri', () => {
    expect(objectKeyFromSegments([PROJECT_A, 'products', 'a.webp'], PROJECT_A)).toBe(
      `${PROJECT_A}/products/a.webp`
    )
  })

  it('menolak kunci milik project lain walau namanya benar', () => {
    expect(objectKeyFromSegments([PROJECT_B, 'products', 'a.webp'], PROJECT_A)).toBeNull()
  })

  it('menolak upaya path traversal', () => {
    expect(objectKeyFromSegments([PROJECT_A, '..', 'a.webp'], PROJECT_A)).toBeNull()
    expect(objectKeyFromSegments([PROJECT_A, 'products', ''], PROJECT_A)).toBeNull()
    expect(objectKeyFromSegments(['..', PROJECT_A, 'a.webp'], PROJECT_A)).toBeNull()
  })

  it('menolak kunci tanpa resource', () => {
    expect(objectKeyFromSegments([PROJECT_A], PROJECT_A)).toBeNull()
  })
})

describe('kepemilikan kunci sebelum penghapusan', () => {
  it('mengizinkan penghapusan kunci milik sendiri', () => {
    expect(objectKeyBelongsToProject(`${PROJECT_A}/products/a.webp`, PROJECT_A)).toBe(true)
  })

  it('menolak kunci milik project lain', () => {
    expect(objectKeyBelongsToProject(`${PROJECT_B}/products/a.webp`, PROJECT_A)).toBe(false)
  })

  it('menolak traversal', () => {
    expect(objectKeyBelongsToProject(`${PROJECT_A}/../${PROJECT_B}/a.webp`, PROJECT_A)).toBe(false)
  })
})

describe('URL proxy', () => {
  it('relatif ke aplikasi, bukan host penyedia', () => {
    const url = fileProxyUrl(`${PROJECT_A}/products/a b.webp`)
    expect(url).toBe(`/api/v1/files/${PROJECT_A}/products/a%20b.webp`)
    expect(url.startsWith('/api/v1/files/')).toBe(true)
  })
})

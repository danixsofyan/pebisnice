import { describe, expect, it } from 'vitest'
import { inspectImage, IMAGE_MAX_BYTES } from '@/lib/domain/media/image'

const jpeg = () => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const png = () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const webp = () => Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])

describe('validasi gambar dari byte', () => {
  it('mengenali JPG, PNG, WebP dan menetapkan ekstensinya', () => {
    expect(inspectImage(jpeg())).toEqual({ ok: true, kind: { mime: 'image/jpeg', ext: 'jpg' } })
    expect(inspectImage(png())).toEqual({ ok: true, kind: { mime: 'image/png', ext: 'png' } })
    expect(inspectImage(webp())).toEqual({ ok: true, kind: { mime: 'image/webp', ext: 'webp' } })
  })

  it('menolak berkas yang mengaku gambar padahal bukan', () => {
    // Byte awal skrip PHP, bukan tanda tangan gambar mana pun.
    const fake = new TextEncoder().encode('<?php system($_GET[0]); ?>')
    const result = inspectImage(fake)
    expect(result.ok).toBe(false)
  })

  it('menolak berkas kosong', () => {
    expect(inspectImage(new Uint8Array(0)).ok).toBe(false)
  })

  it('menolak berkas melebihi 2 MB', () => {
    const big = new Uint8Array(IMAGE_MAX_BYTES + 1)
    big.set(jpeg())
    expect(inspectImage(big).ok).toBe(false)
  })
})

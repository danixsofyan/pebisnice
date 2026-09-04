// Product image rules. Type is checked from bytes, not the client-declared name or Content-Type; the output extension is server-decided so a disguised .php cannot be stored.

export interface ImageKind {
  mime: string
  ext: string
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

// Magic numbers of each format's first bytes.
const SIGNATURES: Array<{ kind: ImageKind; test: (b: Uint8Array) => boolean }> = [
  {
    kind: { mime: 'image/jpeg', ext: 'jpg' },
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    kind: { mime: 'image/png', ext: 'png' },
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    kind: { mime: 'image/webp', ext: 'webp' },
    // RIFF....WEBP
    test: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
]

export type ImageCheck = { ok: true; kind: ImageKind } | { ok: false; reason: string }

export function inspectImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0) {
    return { ok: false, reason: 'Berkas kosong' }
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'Ukuran gambar melebihi 2 MB' }
  }

  const match = SIGNATURES.find((entry) => entry.test(bytes))
  if (!match) {
    return { ok: false, reason: 'Format tidak didukung. Gunakan JPG, PNG, atau WebP' }
  }

  return { ok: true, kind: match.kind }
}

export const IMAGE_MAX_BYTES = MAX_IMAGE_BYTES
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'

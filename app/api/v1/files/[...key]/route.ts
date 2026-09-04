import { NextResponse, type NextRequest } from 'next/server'
import { resolveSessionState } from '@/lib/auth/session-context'
import { getObject } from '@/lib/storage/object-store'
import { objectKeyFromSegments } from '@/lib/storage/object-key'
import { logger } from '@/lib/logging/logger'

/**
 * Proxy baca berkas dari bucket privat.
 *
 * Bucket tidak punya URL publik; ini satu-satunya jalan browser mengambil
 * berkas unggahan. Tiga lapis pemeriksaan sebelum satu byte pun dikirim:
 *
 *   1. harus login,
 *   2. harus punya project aktif,
 *   3. kunci objek harus berprefiks project pemohon.
 *
 * Lapis ke-3 yang membuat menebak kunci milik project lain tidak berguna:
 * meski nama objeknya benar, prefiksnya tidak akan cocok dan jawabannya 404 —
 * sengaja disamakan dengan "tidak ada" agar tak membocorkan keberadaannya.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const state = await resolveSessionState()
  if (state.status !== 'ready') {
    return new NextResponse(null, { status: 401 })
  }

  const { key: segments } = await params
  const key = objectKeyFromSegments(segments, state.context.projectId)
  if (!key) {
    return new NextResponse(null, { status: 404 })
  }

  const object = await getObject(key)
  if (!object) {
    return new NextResponse(null, { status: 404 })
  }

  const headers = new Headers({
    'Content-Type': object.contentType,
    // Privat: boleh disimpan cache browser pengguna, tak boleh cache bersama.
    'Cache-Control': object.cacheControl ?? 'private, max-age=31536000, immutable',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
  })
  if (object.contentLength !== null) headers.set('Content-Length', String(object.contentLength))
  if (object.etag) headers.set('ETag', object.etag)

  logger.debug({ projectId: state.context.projectId, key }, 'file served via proxy')

  return new NextResponse(object.body, { status: 200, headers })
}

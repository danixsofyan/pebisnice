import { NextResponse, type NextRequest } from 'next/server'
import { resolveSessionState } from '@/lib/auth/session-context'
import { getObject } from '@/lib/storage/object-store'
import { objectKeyFromSegments } from '@/lib/storage/object-key'
import { logger } from '@/lib/logging/logger'

// Read a file from the private bucket. The bucket has no public URL; this is the only way the browser fetches an upload. Three checks before a single byte is sent: must be logged in, must have an active project, and the object key must be prefixed with the requesting project. The third makes guessing another project's key useless: even with the right object name the prefix won't match and the answer is 404, deliberately the same as absent so existence isn't leaked.
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
    // Private: may sit in the user's browser cache, never a shared cache.
    'Cache-Control': object.cacheControl ?? 'private, max-age=31536000, immutable',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
  })
  if (object.contentLength !== null) headers.set('Content-Length', String(object.contentLength))
  if (object.etag) headers.set('ETag', object.etag)

  logger.debug({ projectId: state.context.projectId, key }, 'file served via proxy')

  return new NextResponse(object.body, { status: 200, headers })
}

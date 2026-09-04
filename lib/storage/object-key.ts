import { isValidUuid } from '@/lib/security/uuid'

// Object key convention: <projectId>/<resource>/<id>.<ext>. The projectId prefix isn't just folder tidiness, it's the cross-tenant boundary: the proxy serves only objects whose prefix matches the requesting project, so guessing another project's key isn't enough to read it.

const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/i
const SAFE_EXT = /^[a-z0-9]+$/i

export interface ObjectKeyParts {
  projectId: string
  resource: string
  id: string
  ext: string
}

export function buildObjectKey(parts: ObjectKeyParts): string {
  if (!isValidUuid(parts.projectId)) {
    throw new Error('projectId bukan UUID yang sah')
  }
  if (!SAFE_SEGMENT.test(parts.resource)) {
    throw new Error('resource hanya boleh huruf kecil, angka, dan tanda hubung')
  }
  if (!SAFE_ID.test(parts.id)) {
    throw new Error('id objek mengandung karakter yang tidak diizinkan')
  }
  if (!SAFE_EXT.test(parts.ext)) {
    throw new Error('ekstensi tidak sah')
  }

  return `${parts.projectId}/${parts.resource}/${parts.id}.${parts.ext.toLowerCase()}`
}

// Rebuild a key from proxy path segments, rejecting anything that could escape one project's space (traversal, empty prefix). Returns null for an invalid key; callers treat that as 404, not an error.
export function objectKeyFromSegments(segments: string[], projectId: string): string | null {
  if (segments.length < 2) return null
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null
  }
  if (segments.some((segment) => segment.includes('/') || segment.includes('\\'))) {
    return null
  }
  if (segments[0] !== projectId) return null

  return segments.join('/')
}

// Whether a whole key lives within one project's space. Used before deleting an object on user request, so no one can delete another project's file by guessing its key.
export function objectKeyBelongsToProject(key: string, projectId: string): boolean {
  if (key.includes('..') || key.includes('\\')) return false
  return key.startsWith(`${projectId}/`)
}

/** The client-facing URL: relative, same origin as the app. */
export function fileProxyUrl(key: string): string {
  return `/api/v1/files/${key.split('/').map(encodeURIComponent).join('/')}`
}

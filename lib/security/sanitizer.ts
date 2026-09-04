import DOMPurify from 'isomorphic-dompurify'

export { isValidUuid } from './uuid'

const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
}

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return ''

  let clean = input.trim()

  clean = DOMPurify.sanitize(clean, PLAIN_TEXT_CONFIG)

  clean = clean.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

  return clean
}

export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  })
}

export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input)

    if (!['https:', 'http:'].includes(url.protocol)) return null

    return url.toString()
  } catch {
    return null
  }
}


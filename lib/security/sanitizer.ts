import createDOMPurify from 'isomorphic-dompurify'

const DOMPurify = createDOMPurify()

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

export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

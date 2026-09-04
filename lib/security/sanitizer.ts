export { isValidUuid } from './uuid'

// Plain-text sanitizer with no DOM dependency. Previously used DOMPurify, which drags in jsdom on the server, and jsdom repeatedly ships ESM-only subdeps that Next's server bundle can't require() (ERR_REQUIRE_ESM). We only clean plain text (names, notes, SKUs), so a full DOM is overkill; this strips all markup and adds no dependency. script/style content is dropped; other tags are removed but their text kept; looped until stable so reconstructed tags can't slip through.
const SCRIPT_STYLE = /<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi
const TAG = /<[^>]*>/g
// Built from a string so control bytes aren't written raw in the source file.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]', 'g')

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return ''

  let clean = input
  let previous: string
  do {
    previous = clean
    clean = clean.replace(SCRIPT_STYLE, '').replace(TAG, '')
  } while (clean !== previous)

  return clean.replace(CONTROL_CHARS, '').trim()
}

/** Allow only http/https URLs; reject schemes like javascript: and data:. */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (!['https:', 'http:'].includes(url.protocol)) return null
    return url.toString()
  } catch {
    return null
  }
}

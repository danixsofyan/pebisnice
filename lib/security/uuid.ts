// Dependency-free UUID validation. Split from sanitizer.ts on purpose: that module imports DOMPurify, which on the server pulls the whole DOM (jsdom); taking one regex from there would make every path touching it, including the database layer, load jsdom, which once broke the Vercel runtime with ERR_REQUIRE_ESM.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(value: string): boolean {
  return UUID_V4.test(value)
}

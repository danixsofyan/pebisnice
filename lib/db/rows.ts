// drizzle-orm/postgres-js returns raw `execute()` results as an array (RowList), not a
// node-postgres-style `{ rows }` object. This normalizes either shape so callers read the
// same way; reading `.rows` directly off a postgres-js result silently yields undefined.
export function execRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  return (result as { rows?: T[] }).rows ?? []
}

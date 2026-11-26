/**
 * Validates a `returnTo` query param: only in-app absolute paths are allowed
 * (prevents open redirects like "//evil.com" or "https://…").
 */
export function safeReturnTo(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}

/** Sets (or replaces) a query param on an in-app path, e.g. withParam('/entry/add?meal=lunch', 'productId', '7'). */
export function withParam(path: string, key: string, value: string): string {
  const [pathname, query = ''] = path.split('?', 2) as [string, string?]
  const params = new URLSearchParams(query)
  params.set(key, value)
  return `${pathname}?${params.toString()}`
}

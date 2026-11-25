/**
 * Validates a `returnTo` query param: only in-app absolute paths are allowed
 * (prevents open redirects like "//evil.com" or "https://…").
 */
export function safeReturnTo(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when env vars are present; otherwise the app shows a configuration error. */
export const isSupabaseConfigured = Boolean(url && anonKey)

// Placeholders keep createClient from throwing when env is missing; the UI blocks usage in that case.
export const supabase = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

// Generic over the whole response: Supabase responses are unions ({data, error: null} | {data: null, error}),
// so inferring a plain T from `data: T | null` would pick up `null` from the error branch.
type AnyResult = { data: unknown; error: { message: string } | null }

/** Returns data of a Supabase call; throws on error or when no data came back. */
export function must<R extends AnyResult>(result: R): NonNullable<R['data']> {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null || result.data === undefined) {
    throw new Error('Brak danych w odpowiedzi serwera.')
  }
  return result.data as NonNullable<R['data']>
}

/** Returns data (possibly null, e.g. maybeSingle) of a Supabase call; throws on error. */
export function maybe<R extends AnyResult>(result: R): NonNullable<R['data']> | null {
  if (result.error) throw new Error(result.error.message)
  return (result.data ?? null) as NonNullable<R['data']> | null
}

/** Throws on error; for calls whose data is not needed (update/delete without select). */
export function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message)
}

/** Current user's id (RLS fills user_id by default; this is for explicit checks). */
export async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Nie jesteś zalogowany.')
  return id
}

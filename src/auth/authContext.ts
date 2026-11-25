import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthState = {
  /** undefined = still restoring the session from storage */
  session: Session | null | undefined
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Maps Supabase auth errors to Polish messages. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Nieprawidłowy e-mail lub hasło.'
  if (m.includes('email not confirmed')) return 'Adres e-mail nie został potwierdzony.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Zbyt wiele prób. Spróbuj za chwilę.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Brak połączenia z internetem.'
  return 'Nie udało się zalogować. Spróbuj ponownie.'
}

import { useState } from 'react'
import { useAuth } from '@/auth/authContext'
import { QueryState } from '@/components/QueryState'
import { BackupSection } from '@/components/settings/BackupSection'
import { GoalsSection } from '@/components/settings/GoalsSection'
import { MealsSection } from '@/components/settings/MealsSection'
import { useGoals, useMeals } from '@/hooks/useSettings'

export function SettingsScreen() {
  const { session, signOut } = useAuth()
  const goals = useGoals()
  const meals = useMeals()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    if (!window.confirm('Wylogować się?')) return
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  // Wait for real (non-placeholder) data so the forms start with stored values.
  const loading = goals.isPlaceholderData || meals.isPlaceholderData

  return (
    <>
      <h1 className="screen-title">Ustawienia</h1>

      {loading ? (
        <QueryState isLoading={goals.isFetching || meals.isFetching} error={goals.error ?? meals.error} onRetry={() => { void goals.refetch(); void meals.refetch() }} />
      ) : (
        <>
          {goals.data && <GoalsSection goals={goals.data} />}
          {meals.data && <MealsSection meals={meals.data} />}
        </>
      )}

      <BackupSection />

      <section className="card section">
        <h2 className="section-title">Konto</h2>
        <p className="muted">Zalogowano jako {session?.user.email}</p>
        <button type="button" className="button button-secondary" onClick={handleSignOut} disabled={busy}>
          Wyloguj się
        </button>
      </section>
    </>
  )
}

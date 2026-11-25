import { useState } from 'react'
import { useAuth } from '@/auth/authContext'

export function SettingsScreen() {
  const { session, signOut } = useAuth()
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

  return (
    <>
      <h1 className="screen-title">Ustawienia</h1>
      <div className="placeholder">Tu pojawią się cele, kopia zapasowa i Garmin (Etap 5 i 7).</div>

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

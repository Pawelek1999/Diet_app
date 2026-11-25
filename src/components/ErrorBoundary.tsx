import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Catches render errors so the app shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    // A new deploy can remove old lazy-loaded chunks; a reload fetches the current version.
    const isStaleChunk = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message)

    return (
      <div className="login">
        <div className="login-card">
          <h1 className="login-title">Coś poszło nie tak</h1>
          <p className="muted center">
            {isStaleChunk
              ? 'Pojawiła się nowa wersja aplikacji albo brak internetu. Odśwież, żeby kontynuować.'
              : 'Wystąpił nieoczekiwany błąd. Twoje dane są bezpieczne w bazie.'}
          </p>
          <p className="muted small center">{error.message}</p>
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
            Odśwież aplikację
          </button>
        </div>
      </div>
    )
  }
}

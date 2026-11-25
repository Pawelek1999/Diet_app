type Props = {
  isLoading: boolean
  error: unknown
  onRetry?: () => void
}

/** Loading spinner or error box with retry. Renders nothing when data is ready. */
export function QueryState({ isLoading, error, onRetry }: Props) {
  if (isLoading) {
    return (
      <div className="state" aria-busy="true">
        <span className="spinner" aria-label="Ładowanie" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="state state-error" role="alert">
        <p>Nie udało się pobrać danych.</p>
        <p className="muted small">{error instanceof Error ? error.message : String(error)}</p>
        {onRetry && (
          <button type="button" className="button button-secondary" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        )}
      </div>
    )
  }
  return null
}

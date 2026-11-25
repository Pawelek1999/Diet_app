import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

type Props = {
  title: string
  /** Where "back" goes when there is no history (e.g. opened from a fresh start). */
  backTo?: string
  action?: ReactNode
}

/** Header for sub-screens: back button, title, optional action on the right. */
export function ScreenHeader({ title, backTo, action }: Props) {
  const navigate = useNavigate()

  function goBack() {
    // history.state.idx is set by React Router; 0 means this is the first entry.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(backTo ?? '/', { replace: true })
  }

  return (
    <header className="screen-header">
      {backTo !== undefined ? (
        <button type="button" className="icon-button" onClick={goBack} aria-label="Wstecz">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <span className="icon-button-placeholder" />
      )}
      <h1 className="screen-header-title">{title}</h1>
      <div className="screen-header-action">{action}</div>
    </header>
  )
}

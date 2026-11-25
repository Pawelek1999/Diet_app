type Props = {
  active: boolean
  onToggle: () => void
  label: string
}

export function FavoriteButton({ active, onToggle, label }: Props) {
  return (
    <button
      type="button"
      className={active ? 'icon-button favorite active' : 'icon-button favorite'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={active}
      aria-label={active ? `Usuń z ulubionych: ${label}` : `Dodaj do ulubionych: ${label}`}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  )
}

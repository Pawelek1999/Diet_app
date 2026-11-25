import type { RefObject } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
}

export function SearchInput({ value, onChange, placeholder = 'Szukaj…', inputRef, autoFocus }: Props) {
  return (
    <div className="search">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value !== '' && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Wyczyść">
          ×
        </button>
      )}
    </div>
  )
}

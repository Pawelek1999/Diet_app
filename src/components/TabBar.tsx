import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

type Tab = { to: string; label: string; icon: ReactNode; end?: boolean }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const TABS: Tab[] = [
  {
    to: '/',
    label: 'Dziś',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    to: '/foods',
    label: 'Produkty',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'Historia',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M5 20V12M12 20V6M19 20v-9" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Ustawienia',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Główna nawigacja">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'tabbar-link active' : 'tabbar-link')}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

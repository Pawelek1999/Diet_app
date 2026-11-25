import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Scrolls to the top when the screen (pathname) changes; query-only changes keep the position. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

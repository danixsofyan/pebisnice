import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Subscribe to a media query via useSyncExternalStore, not a setState-in-useEffect. React 19 flags setState-in-effect for cascading renders; a media query is external data, and this is React's way to read it without an extra render.
function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** The server can't know screen width; assume desktop to avoid a wrong render. */
function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Berlangganan media query lewat `useSyncExternalStore`, bukan `useEffect`
 * yang memanggil `setState`.
 *
 * React 19 menandai pola setState-dalam-effect karena memicu render berantai;
 * media query adalah sumber data eksternal, dan inilah cara yang disediakan
 * React untuk membacanya tanpa render tambahan.
 */
function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Server tidak tahu lebar layar; anggap desktop agar tidak salah render. */
function getServerSnapshot(): boolean {
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

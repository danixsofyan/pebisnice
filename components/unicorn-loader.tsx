'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export function UnicornLoader() {
  useEffect(() => {
    const win = window as any
    if (win.UnicornStudio?.isInitialized) {
      win.UnicornStudio.init()
    }
  }, [])

  return (
    <Script
      src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
      onLoad={() => {
        const win = window as any
        if (win.UnicornStudio && !win.UnicornStudio.isInitialized) {
          win.UnicornStudio.init()
          win.UnicornStudio.isInitialized = true
        } else if (win.UnicornStudio) {
          win.UnicornStudio.init()
        }
      }}
      strategy="afterInteractive"
    />
  )
}

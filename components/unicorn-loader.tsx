'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export function UnicornLoader() {
  useEffect(() => {
    // @ts-ignore
    if (window.UnicornStudio?.isInitialized) {
      // @ts-ignore
      window.UnicornStudio.init()
    }
  }, [])

  return (
    <Script
      src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
      onLoad={() => {
        // @ts-ignore
        if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
          // @ts-ignore
          window.UnicornStudio.init()
          // @ts-ignore
          window.UnicornStudio.isInitialized = true
        } else if (window.UnicornStudio) {
          // @ts-ignore
          window.UnicornStudio.init()
        }
      }}
      strategy="afterInteractive"
    />
  )
}

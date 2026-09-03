'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface UnicornStudioApi {
  isInitialized?: boolean
  init: () => void
}

function getUnicornStudio(): UnicornStudioApi | undefined {
  return (window as Window & { UnicornStudio?: UnicornStudioApi }).UnicornStudio
}

export function UnicornLoader() {
  useEffect(() => {
    const unicornStudio = getUnicornStudio()
    if (unicornStudio?.isInitialized) {
      unicornStudio.init()
    }
  }, [])

  return (
    <Script
      src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
      onLoad={() => {
        const unicornStudio = getUnicornStudio()
        if (!unicornStudio) return

        unicornStudio.init()
        unicornStudio.isInitialized = true
      }}
      strategy="afterInteractive"
    />
  )
}

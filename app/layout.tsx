import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Pebisnice',
  description: '',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pebisnice',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0b0c',
}

import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'

import { UnicornLoader } from '@/components/unicorn-loader'
import { Analytics } from '@vercel/analytics/next'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // next-themes injects an inline anti-flash script that Next.js does not nonce for us.
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UnicornLoader />
        <ThemeProvider
          nonce={nonce}
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>

        {/*
          Skripnya disuntik lewat document.createElement dari bundle klien yang
          sudah ber-nonce, sehingga lolos CSP `strict-dynamic` tanpa perlu
          melonggarkan script-src. Beacon-nya menuju /_vercel/insights pada
          origin yang sama, jadi connect-src 'self' juga sudah mencukupi.
        */}
        <Analytics />
      </body>
    </html>
  )
}

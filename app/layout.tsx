import type { Metadata } from 'next'
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
}

import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'

import { UnicornLoader } from '@/components/unicorn-loader'

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
      </body>
    </html>
  )
}

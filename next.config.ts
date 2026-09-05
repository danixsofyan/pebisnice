import type { NextConfig } from 'next'

// Google avatar for the login page. Uploads don't go through next/image from an
// external host (served by the same-origin proxy in app/api/v1/files), so no
// storage host needs allowing. pdfkit stays external so its font files ship via
// file tracing instead of being bundled.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pdfkit'],
  // Statement/image uploads go through server actions. The app caps files at 2 MB (validated in the
  // action and again when parsing); this raises the framework's default 1 MB body limit to match so
  // legitimate 2 MB uploads aren't rejected before validation. 2 MB is a hard ceiling for every
  // action and small enough to hold in memory safely.
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
}

export default nextConfig

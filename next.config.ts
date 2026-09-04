import type { NextConfig } from 'next'

// Google avatar for the login page. Uploads don't go through next/image from an
// external host (served by the same-origin proxy in app/api/v1/files), so no
// storage host needs allowing. pdfkit stays external so its font files ship via
// file tracing instead of being bundled.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pdfkit'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
}

export default nextConfig

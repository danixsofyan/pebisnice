import type { NextConfig } from 'next'
import { storageHostname } from './lib/storage'

// Host storage diturunkan dari NEXT_PUBLIC_STORAGE_BASE_URL lewat satu helper
// bersama, supaya daftar host di sini tidak bisa berbeda dengan yang diizinkan
// CSP di lib/security/headers.ts.
const remoteImageHosts = ['lh3.googleusercontent.com', storageHostname()].filter(
  (host): host is string => Boolean(host)
)

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteImageHosts.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
}

export default nextConfig

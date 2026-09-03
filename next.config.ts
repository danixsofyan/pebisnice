import type { NextConfig } from 'next'

const remoteImageHosts = [
  'lh3.googleusercontent.com',
  ...(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST
    ? [process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST]
    : []),
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteImageHosts.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
}

export default nextConfig

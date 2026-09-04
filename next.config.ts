import type { NextConfig } from 'next'

// Foto Google untuk avatar login. Berkas unggahan tidak lewat next/image dari
// host luar — disajikan proxy satu-origin di app/api/v1/files, jadi tak ada
// host penyedia storage yang perlu diizinkan.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
}

export default nextConfig

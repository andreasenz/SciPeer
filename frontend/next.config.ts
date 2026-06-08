import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'orcid.org' },
      { protocol: 'https', hostname: '*.orcid.org' },
    ],
  },
}

export default nextConfig

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'orcid.org' },
      { protocol: 'https', hostname: '*.orcid.org' },
    ],
  },
  // Webpack (non-Turbopack) builds: disable canvas (not needed in browser)
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  // Turbopack (dev --turbopack): same alias via turbopack config
  turbopack: {
    resolveAlias: {
      canvas: './src/lib/canvas-empty.js',
    },
  },
}

export default nextConfig

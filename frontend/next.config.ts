import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'orcid.org' },
      { protocol: 'https', hostname: '*.orcid.org' },
    ],
  },
  webpack: (config) => {
    // react-pdf / pdfjs-dist: disable the canvas package (not needed in browser)
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig

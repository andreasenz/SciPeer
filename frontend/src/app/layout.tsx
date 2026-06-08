import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SciPeer — Open Community Science',
  description: 'Free, open, community-reviewed scientific papers with DOI assignment.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  )
}

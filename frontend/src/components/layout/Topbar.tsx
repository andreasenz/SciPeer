'use client'

import { IconSearch, IconBell } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Feed', href: '/' },
  { label: 'Discover', href: '/discover' },
  { label: 'My Papers', href: '/my-papers' },
  { label: 'Reviews', href: '/reviews' },
]

export default function Topbar() {
  const pathname = usePathname()

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <div className="logo">SP</div>
        <span className="brand-name serif">SciPeer</span>
      </Link>

      <nav className="topnav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`t${pathname === n.href ? ' active' : ''}`}>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="search">
        <IconSearch size={15} />
        <span>Search papers…</span>
      </div>

      <div className="topbar-right">
        <IconBell />
        <div className="avatar">A</div>
      </div>
    </header>
  )
}

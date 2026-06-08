'use client'

import { IconSearch, IconBell, IconLogin } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { label: 'Feed', href: '/' },
  { label: 'Discover', href: '/discover' },
  { label: 'My Papers', href: '/my-papers' },
  { label: 'Reviews', href: '/reviews' },
]

export default function Topbar() {
  const pathname = usePathname()
  const { user, loading, login, logout } = useAuth()

  const initials = user?.display_name
    ? user.display_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

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
        {!loading && (
          user ? (
            <>
              <IconBell />
              <div
                className="avatar"
                title={`${user.display_name} — click to sign out`}
                onClick={logout}
                style={{ cursor: 'pointer' }}
              >
                {initials}
              </div>
            </>
          ) : (
            <button
              onClick={login}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '8px 14px' }}
            >
              <IconLogin size={15} />
              Login with ORCID
            </button>
          )
        )}
      </div>
    </header>
  )
}

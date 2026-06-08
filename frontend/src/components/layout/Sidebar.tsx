'use client'

import {
  IconHome2,
  IconFileText,
  IconStarFilled,
  IconUser,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const FIELDS = ['Computer Science', 'Biology', 'Physics', 'Medicine', 'Mathematics']

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <Link href="/submit" className="btn-submit">
        <IconPlus size={16} />
        Submit Paper
      </Link>

      <nav className="nav">
        <Link href="/" className={`nav-item${pathname === '/' ? ' active' : ''}`}>
          <IconHome2 />
          Feed
        </Link>
        <Link href="/my-papers" className={`nav-item${pathname === '/my-papers' ? ' active' : ''}`}>
          <IconFileText />
          My Papers
        </Link>
        <Link href="/reviews" className={`nav-item${pathname === '/reviews' ? ' active' : ''}`}>
          <IconStarFilled />
          My Reviews
        </Link>
        <Link href="/profile" className={`nav-item${pathname === '/profile' ? ' active' : ''}`}>
          <IconUser />
          Profile & Karma
        </Link>
      </nav>

      <div className="nav-sep" />

      <div className="filter-label">FIELD</div>
      {FIELDS.map((f) => (
        <label key={f} className="check">
          <span className="box">
            <IconCheck size={10} />
          </span>
          {f}
        </label>
      ))}
    </aside>
  )
}

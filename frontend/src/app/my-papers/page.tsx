'use client'

import { useEffect, useState } from 'react'
import { IconFileText, IconStarFilled, IconMessageCircle, IconDots, IconLoader } from '@tabler/icons-react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { StatusChip } from '@/components/ui/Chip'
import { api } from '@/lib/api'
import type { Paper } from '@/lib/types'

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function MyPapersPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.papers.my()
      .then(setPapers)
      .catch(() => setPapers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <div className="page-head">
            <h1 className="serif">My Papers</h1>
            <p>Submissions you authored or co-authored.</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--ink3)' }}>
              <IconLoader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : papers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink3)' }}>
              <IconFileText size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No papers yet</div>
              <Link href="/submit" className="btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
                Submit your first paper
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {papers.map((p) => (
                <div
                  key={p.id}
                  className="panel panel-pad"
                  style={{ display: 'flex', alignItems: 'center', gap: 18 }}
                >
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'var(--primary-bg)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconFileText size={22} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                      <StatusChip status={p.status} />
                      {p.field_name && (
                        <span className="chip chip-disc">{p.field_name}</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink3)' }}>
                        {timeAgo(p.created_at)}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                      {p.title}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink2)' }}>
                      {p.score !== undefined && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconStarFilled size={12} style={{ color: 'var(--amber)' }} />
                          {p.score.toFixed(1)} avg score
                        </span>
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconMessageCircle size={12} />
                        {p.review_count ?? 0} {(p.review_count ?? 0) === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link
                      href={`/review/${p.id}`}
                      className="btn-primary"
                      style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8 }}
                    >
                      View
                    </Link>
                    <button
                      style={{
                        border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px',
                        background: 'var(--surface)', color: 'var(--ink2)',
                      }}
                    >
                      <IconDots size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

'use client'

import { IconFileText, IconStarFilled, IconMessageCircle, IconDots } from '@tabler/icons-react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { StatusChip } from '@/components/ui/Chip'
import type { Paper } from '@/lib/types'

const MY_PAPERS: Paper[] = [
  {
    id: 'mock-3',
    title: 'Riemannian Gradient Flows for Optimal Transport in Infinite Dimensions',
    abstract: '',
    status: 'PUBLISHED',
    field_category_id: 'math',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    field_name: 'Mathematics',
    score: 5.0,
    review_count: 11,
  },
  {
    id: 'mock-5',
    title: 'A Unified Framework for Sparse Neural Architecture Search Under Memory Constraints',
    abstract: '',
    status: 'DRAFT',
    field_category_id: 'cs',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    field_name: 'Computer Science',
    score: undefined,
    review_count: 0,
  },
  {
    id: 'mock-r1',
    title: 'Attention Replication Study on Low-Resource Languages',
    abstract: '',
    status: 'REVISION_REQUESTED',
    field_category_id: 'cs',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    field_name: 'Computer Science',
    score: 4.1,
    review_count: 6,
  },
]

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function MyPapersPage() {
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MY_PAPERS.map((p) => (
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
                      {p.review_count} {p.review_count === 1 ? 'review' : 'reviews'}
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

          {MY_PAPERS.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink3)' }}>
              <IconFileText size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No papers yet</div>
              <Link href="/submit" className="btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
                Submit your first paper
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

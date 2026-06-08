'use client'

import {
  IconStarFilled,
  IconCircleCheck,
  IconClock,
  IconClipboardText,
} from '@tabler/icons-react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'

interface ReviewEntry {
  id: string
  paperId: string
  title: string
  field: string
  score: number
  status: 'submitted' | 'pending'
  submittedAt: string
  mandatory_open: number
  mandatory_total: number
}

const MY_REVIEWS: ReviewEntry[] = [
  {
    id: 'rv1',
    paperId: 'mock-1',
    title: 'Attention Is All You Need: A Replication Study on Low-Resource Languages',
    field: 'Computer Science',
    score: 4,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    mandatory_open: 0,
    mandatory_total: 2,
  },
  {
    id: 'rv2',
    paperId: 'mock-2',
    title: 'CRISPR-Cas9 Off-Target Effects in Murine Hepatocytes: A Systematic Mapping',
    field: 'Biology',
    score: 3,
    status: 'submitted',
    submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    mandatory_open: 1,
    mandatory_total: 3,
  },
  {
    id: 'rv3',
    paperId: 'mock-4',
    title: 'Social Determinants of Antibiotic Resistance Spread in Urban Hospital Networks',
    field: 'Medicine',
    score: 0,
    status: 'pending',
    submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    mandatory_open: 2,
    mandatory_total: 2,
  },
]

const SCORE_LABELS: Record<number, string> = {
  0: 'Not scored yet',
  1: 'Strong Reject',
  2: 'Weak Reject',
  3: 'Borderline',
  4: 'Weak Accept',
  5: 'Strong Accept',
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function MyReviewsPage() {
  const submitted = MY_REVIEWS.filter((r) => r.status === 'submitted')
  const pending = MY_REVIEWS.filter((r) => r.status === 'pending')

  return (
    <>
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <div className="page-head">
            <h1 className="serif">My Reviews</h1>
            <p>Papers you have reviewed or been assigned to review.</p>
          </div>

          {pending.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 10 }}>
                Pending — {pending.length} open
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {pending.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.5px', color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 10 }}>
            Submitted — {submitted.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {submitted.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>

          {MY_REVIEWS.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink3)' }}>
              <IconClipboardText size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No reviews yet</div>
              <Link href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
                Browse papers to review
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function ReviewCard({ review }: { review: ReviewEntry }) {
  const isPending = review.status === 'pending'

  return (
    <div
      className="panel panel-pad"
      style={{
        display: 'flex', alignItems: 'center', gap: 18,
        borderLeft: isPending ? '3px solid var(--amber)' : '3px solid var(--green)',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: isPending ? 'var(--amber-bg)' : 'var(--green-bg)',
          color: isPending ? 'var(--amber)' : 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isPending ? <IconClock size={22} /> : <IconCircleCheck size={22} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <span className={`chip ${isPending ? 'chip-urg' : 'chip-pub'}`}>
            {isPending ? 'Pending' : 'Submitted'}
          </span>
          <span className="chip chip-disc">{review.field}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink3)' }}>
            {timeAgo(review.submittedAt)}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, marginBottom: 5, lineHeight: 1.3 }}>
          {review.title}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink2)', alignItems: 'center' }}>
          {review.score > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconStarFilled size={12} style={{ color: 'var(--amber)' }} />
              {review.score} — {SCORE_LABELS[review.score]}
            </span>
          )}
          {review.mandatory_total > 0 && (
            <span>
              {review.mandatory_open}/{review.mandatory_total} mandatory open
            </span>
          )}
        </div>
      </div>

      <Link
        href={`/review/${review.paperId}`}
        className="btn-primary"
        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, flexShrink: 0 }}
      >
        {isPending ? 'Review now' : 'View'}
      </Link>
    </div>
  )
}

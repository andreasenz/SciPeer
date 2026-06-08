'use client'

import { useEffect, useState } from 'react'
import {
  IconStarFilled,
  IconCircleCheck,
  IconClock,
  IconClipboardText,
  IconLoader,
} from '@tabler/icons-react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import { api } from '@/lib/api'
import type { ReviewScore, Paper } from '@/lib/types'

interface ReviewEntry {
  score: ReviewScore
  paper: Paper | null
}

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
  const [entries, setEntries] = useState<ReviewEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.reviews.my()
      .then(async (scores) => {
        const enriched = await Promise.all(
          scores.map(async (s) => {
            const paper = await api.papers.get(s.submission_id).catch(() => null)
            return { score: s, paper }
          })
        )
        setEntries(enriched)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <div className="page-head">
            <h1 className="serif">My Reviews</h1>
            <p>Papers you have scored as a reviewer.</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--ink3)' }}>
              <IconLoader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink3)' }}>
              <IconClipboardText size={40} style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No reviews yet</div>
              <Link href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 8 }}>
                Browse papers to review
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entries.map(({ score, paper }) => (
                <ReviewCard key={score.id} score={score} paper={paper} />
              ))}
            </div>
          )}
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function ReviewCard({ score, paper }: { score: ReviewScore; paper: Paper | null }) {
  return (
    <div
      className="panel panel-pad"
      style={{
        display: 'flex', alignItems: 'center', gap: 18,
        borderLeft: '3px solid var(--green)',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'var(--green-bg)',
          color: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconCircleCheck size={22} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <span className="chip chip-pub">Submitted</span>
          {paper?.field_name && <span className="chip chip-disc">{paper.field_name}</span>}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink3)' }}>
            {timeAgo(score.submitted_at)}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, marginBottom: 5, lineHeight: 1.3 }}>
          {paper?.title ?? score.submission_id}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink2)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconStarFilled size={12} style={{ color: 'var(--amber)' }} />
            {score.raw_score} — {SCORE_LABELS[score.raw_score] ?? ''}
          </span>
        </div>
      </div>

      <Link
        href={`/review/${score.submission_id}`}
        className="btn-primary"
        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, flexShrink: 0 }}
      >
        View
      </Link>
    </div>
  )
}

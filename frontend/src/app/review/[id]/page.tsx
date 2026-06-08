'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  IconZoomIn,
  IconZoomOut,
  IconDownload,
  IconClipboardText,
  IconThumbUp,
  IconThumbDown,
  IconCircleCheck,
  IconClock,
  IconChevronLeft,
  IconLoader,
  IconAlertTriangle,
  IconX,
  IconPlus,
} from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { Paper, ReviewScore, ReviewComment } from '@/lib/types'

type CoiStatus = 'loading' | 'ok' | 'conflict' | 'unauthenticated'
type DraftType = 'mandatory' | 'suggested'

interface PendingComment {
  type: DraftType
  body: string
}

export default function ReviewWorkspace() {
  const { id: paperId } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()

  const [paper, setPaper] = useState<Paper | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [scores, setScores] = useState<ReviewScore[]>([])
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [loading, setLoading] = useState(true)

  const [myScore, setMyScore] = useState<number | null>(null)
  const [coiStatus, setCoiStatus] = useState<CoiStatus>('loading')

  const [draftType, setDraftType] = useState<DraftType>('mandatory')
  const [draftBody, setDraftBody] = useState('')
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    if (!paperId) return
    Promise.all([
      api.papers.get(paperId),
      api.papers.pdfUrl(paperId).catch(() => null),
      api.reviews.getScores(paperId).catch(() => [] as ReviewScore[]),
      api.reviews.getComments(paperId).catch(() => [] as ReviewComment[]),
    ]).then(([p, urlResult, s, c]) => {
      setPaper(p)
      setPdfUrl(urlResult?.url ?? null)
      setScores(s)
      setComments(c)
    }).finally(() => setLoading(false))
  }, [paperId])

  useEffect(() => {
    if (authLoading) return
    if (!user) { setCoiStatus('unauthenticated'); return }
    if (!paperId) return
    api.reviews.coiCheck(paperId, user.id)
      .then(r => setCoiStatus(r.has_conflict ? 'conflict' : 'ok'))
      .catch(() => setCoiStatus('ok'))
  }, [authLoading, user, paperId])

  function addPendingComment() {
    if (!draftBody.trim()) return
    setPendingComments(prev => [...prev, { type: draftType, body: draftBody.trim() }])
    setDraftBody('')
  }

  function removePending(idx: number) {
    setPendingComments(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (myScore === null || coiStatus !== 'ok') return
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.reviews.submitScore(paperId, myScore)
      for (const c of pendingComments) {
        await api.reviews.addComment(paperId, c.type, c.body)
      }
      const [freshScores, freshComments] = await Promise.all([
        api.reviews.getScores(paperId),
        api.reviews.getComments(paperId),
      ])
      setScores(freshScores)
      setComments(freshComments)
      setPendingComments([])
      setMyScore(null)
      setSubmitted(true)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleVote(id: string, dir: 'up' | 'down') {
    const prev = votes[id]
    if (prev === dir) return
    setVotes(v => ({ ...v, [id]: dir }))
    try {
      const updated = await api.reviews.voteComment(id, dir)
      setComments(cs => cs.map(c => c.id === id ? updated : c))
    } catch {
      setVotes(v => ({ ...v, [id]: prev ?? null }))
    }
  }

  // Compute score distribution
  const total = scores.length
  const bars = [5, 4, 3, 2, 1].map(n => ({
    label: String(n),
    pct: total > 0 ? Math.round(scores.filter(s => s.raw_score === n).length / total * 100) : 0,
  }))
  const weightedAvg = total > 0
    ? (scores.reduce((sum, s) => sum + s.raw_score, 0) / total).toFixed(1)
    : '—'

  const mandatoryComments = comments.filter(c => c.comment_type === 'mandatory')
  const suggestedComments = comments.filter(c => c.comment_type === 'suggested')
  const openMandatory = mandatoryComments.filter(c => !c.is_resolved).length

  const canSubmit = coiStatus === 'ok' && myScore !== null && !submitting

  return (
    <>
      <Topbar />
      <div style={{ padding: '16px 24px 0' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink2)', fontWeight: 500 }}>
          <IconChevronLeft size={15} /> Back to Feed
        </Link>
      </div>

      <div style={{ padding: '12px 24px 40px' }}>
        <div className="v3">
          {/* ── Manuscript pane ── */}
          <div className="ms-pane">
            <div className="ms-toolbar">
              <IconZoomOut size={16} />
              <span style={{ fontWeight: 600 }}>100%</span>
              <IconZoomIn size={16} />
              <span style={{ flex: 1 }} />
              {paper?.pdf_url && (
                <a href={pdfUrl ?? paper.pdf_url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink2)', display: 'flex' }}>
                  <IconDownload size={16} />
                </a>
              )}
              <IconClipboardText size={16} />
              <span>PDF</span>
            </div>
            <div className="ms-body" style={{ padding: 0, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)' }}>
                  <IconLoader size={32} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Paper manuscript"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)', gap: 8 }}>
                  <IconClipboardText size={36} />
                  <span style={{ fontSize: 13 }}>No PDF uploaded yet</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Review pane ── */}
          <div className="review-pane">
            <div className="rp-head">
              <IconClipboardText />
              <b>Review Workspace</b>
              {paper && <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--ink3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{paper.title}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink3)', flexShrink: 0 }}>{total} reviewer{total !== 1 ? 's' : ''}</span>
            </div>

            <div className="score-box">
              <div className="score-top">
                <span className="score-num">{weightedAvg}</span>
                <span className="score-of">/ 5</span>
                <span className="score-votes">avg · {total} vote{total !== 1 ? 's' : ''}</span>
              </div>
              <div className="bars">
                {bars.map((b) => (
                  <div key={b.label} className="bar-row">
                    <span style={{ width: 12, textAlign: 'right' }}>{b.label}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${b.pct}%` }} />
                    </div>
                    <span style={{ width: 28 }}>{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COI / auth banner */}
            {coiStatus === 'unauthenticated' && (
              <div style={{ padding: '10px 18px', background: '#fef9c3', borderBottom: '1px solid #fde047', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <IconAlertTriangle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                Log in to review this paper
              </div>
            )}
            {coiStatus === 'conflict' && (
              <div style={{ padding: '10px 18px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <IconAlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0 }} />
                You have a conflict of interest with an author and cannot review this paper
              </div>
            )}

            {/* Score selector */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 8 }}>Your Score</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => coiStatus === 'ok' && setMyScore(n)}
                    disabled={coiStatus !== 'ok'}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, border: '1.5px solid',
                      borderColor: myScore === n ? 'var(--primary)' : 'var(--border)',
                      background: myScore === n ? 'var(--primary-bg)' : 'var(--surface)',
                      color: myScore === n ? 'var(--primary)' : 'var(--ink2)',
                      fontWeight: 700, fontSize: 13,
                      cursor: coiStatus === 'ok' ? 'pointer' : 'not-allowed',
                      opacity: coiStatus === 'ok' ? 1 : 0.5,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {['Strong Reject', '', '', 'Weak Accept', '', 'Strong Accept'].map((l, i) => (
                  <div key={i} style={{ flex: 1, fontSize: 9, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.2 }}>{l}</div>
                ))}
              </div>
            </div>

            {/* Comment drafting */}
            {coiStatus === 'ok' && (
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 8 }}>Add Comment</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {(['mandatory', 'suggested'] as DraftType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setDraftType(t)}
                      style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: '1.5px solid',
                        borderColor: draftType === t ? (t === 'mandatory' ? 'var(--red)' : 'var(--primary)') : 'var(--border)',
                        background: draftType === t ? (t === 'mandatory' ? '#fef2f2' : 'var(--primary-bg)') : 'var(--surface)',
                        color: draftType === t ? (t === 'mandatory' ? 'var(--red)' : 'var(--primary)') : 'var(--ink3)',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'mandatory' ? 'Mandatory' : 'Suggested'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={draftBody}
                  onChange={e => setDraftBody(e.target.value)}
                  placeholder={draftType === 'mandatory' ? 'Required change the authors must address…' : 'Optional improvement to consider…'}
                  rows={3}
                  style={{
                    width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
                    padding: '8px 10px', fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical',
                    outline: 'none', lineHeight: 1.5, color: 'var(--ink)',
                  }}
                />
                <button
                  onClick={addPendingComment}
                  disabled={!draftBody.trim()}
                  style={{
                    marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                    padding: '6px 14px', borderRadius: 7, border: '1.5px solid var(--primary)',
                    background: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 600,
                    cursor: draftBody.trim() ? 'pointer' : 'not-allowed', opacity: draftBody.trim() ? 1 : 0.5,
                  }}
                >
                  <IconPlus size={13} /> Add comment
                </button>

                {pendingComments.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 6 }}>{pendingComments.length} comment{pendingComments.length !== 1 ? 's' : ''} queued</div>
                    {pendingComments.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 8px', marginBottom: 4, background: 'var(--surface)', borderRadius: 7, border: '1px solid var(--border)' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                          background: c.type === 'mandatory' ? '#fef2f2' : 'var(--primary-bg)',
                          color: c.type === 'mandatory' ? 'var(--red)' : 'var(--primary)',
                          flexShrink: 0,
                        }}>
                          {c.type === 'mandatory' ? 'M' : 'S'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink)', flex: 1, lineHeight: 1.4 }}>{c.body}</span>
                        <button onClick={() => removePending(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', padding: 2 }}>
                          <IconX size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rp-scroll">
              {submitted && (
                <div style={{ padding: '10px 18px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)' }}>
                  <IconCircleCheck size={15} /> Review submitted successfully
                </div>
              )}

              <div className="rsec">
                Mandatory {openMandatory > 0 && <span className="chip chip-urg" style={{ fontSize: 10 }}>{openMandatory} open</span>}
              </div>

              {mandatoryComments.map((c) => (
                <CommentCard key={c.id} comment={c} vote={votes[c.id] ?? null} onVote={toggleVote} />
              ))}

              <div className="rsec">Suggested</div>

              {suggestedComments.map((c) => (
                <CommentCard key={c.id} comment={c} vote={votes[c.id] ?? null} onVote={toggleVote} />
              ))}
            </div>

            <div className="rp-foot">
              <div className="countdown">
                <IconClock size={15} />
                {loading ? '…' : `${total} review${total !== 1 ? 's' : ''}`}
              </div>
              {submitError && <span style={{ fontSize: 11, color: 'var(--red)', marginLeft: 8 }}>{submitError}</span>}
              <button
                className="btn-primary"
                style={{ marginLeft: 'auto', opacity: canSubmit ? 1 : 0.5 }}
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconLoader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…
                  </span>
                ) : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

function CommentCard({
  comment,
  vote,
  onVote,
}: {
  comment: ReviewComment
  vote: 'up' | 'down' | null
  onVote: (id: string, dir: 'up' | 'down') => void
}) {
  const isMand = comment.comment_type === 'mandatory'
  return (
    <div className={`comment ${isMand ? 'mand' : 'sugg'}`}>
      <div className="c-head">
        <span className={`c-badge ${isMand ? 'mand' : 'sugg'}`}>{isMand ? 'Mandatory' : 'Suggested'}</span>
        <span className={`c-status ${comment.is_resolved ? 'resolved' : 'open'}`}>
          {comment.is_resolved ? <><IconCircleCheck size={12} /> Resolved</> : <><IconClock size={12} /> Open</>}
        </span>
      </div>
      <p className="c-body">{comment.body}</p>
      <div className="c-foot">
        <button
          className={`vote up${vote === 'up' ? ' active' : ''}`}
          onClick={() => onVote(comment.id, 'up')}
        >
          <IconThumbUp size={13} /> {comment.upvotes + (vote === 'up' ? 1 : 0)}
        </button>
        <button
          className={`vote down${vote === 'down' ? ' active' : ''}`}
          onClick={() => onVote(comment.id, 'down')}
        >
          <IconThumbDown size={13} /> {comment.downvotes + (vote === 'down' ? 1 : 0)}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
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
} from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Link from 'next/link'

const COMMENTS = [
  {
    id: 'c1',
    type: 'mand' as const,
    text: 'The baseline comparison in Table 2 is missing BERT-large. This is a mandatory requirement for the claims in Section 4.1 to hold.',
    resolved: true,
    up: 5,
    down: 0,
    reviewer: 'Reviewer A',
  },
  {
    id: 'c2',
    type: 'mand' as const,
    text: 'Statistical significance tests are absent for all reported improvements. Please add p-values or confidence intervals.',
    resolved: false,
    up: 8,
    down: 1,
    reviewer: 'Reviewer B',
  },
  {
    id: 'c3',
    type: 'sugg' as const,
    text: 'Consider adding a limitations section discussing the computational cost of the proposed approach.',
    resolved: false,
    up: 3,
    down: 2,
    reviewer: 'Reviewer A',
  },
  {
    id: 'c4',
    type: 'sugg' as const,
    text: 'The related work section could benefit from citing recent work on efficient attention (Longformer, BigBird).',
    resolved: true,
    up: 2,
    down: 0,
    reviewer: 'Reviewer C',
  },
]

const BARS = [
  { label: '5', pct: 60 },
  { label: '4', pct: 25 },
  { label: '3', pct: 10 },
  { label: '2', pct: 5 },
  { label: '1', pct: 0 },
]

export default function ReviewWorkspace() {
  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | null>>({})
  const [myScore, setMyScore] = useState<number | null>(null)

  function toggleVote(id: string, dir: 'up' | 'down') {
    setVotes((v) => ({ ...v, [id]: v[id] === dir ? null : dir }))
  }

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
              <IconDownload size={16} />
              <IconClipboardText size={16} />
              <span>Page 1 / 14</span>
            </div>
            <div className="ms-body">
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink3)', marginBottom: 6 }}>
                Preprint · Under Review on SciPeer
              </p>
              <h2>Attention Is All You Need: A Replication Study on Low-Resource Languages</h2>
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink2)', marginBottom: 18 }}>
                L. Chen · H. Nakamura · F. Al-Rashid
              </p>

              <div className="ms-h">Abstract</div>
              <p>
                We replicate the original transformer architecture experiments on 12 low-resource
                language pairs drawn from the FLORES-200 benchmark. Our results demonstrate that
                standard sinusoidal positional encodings{' '}
                <span className="hl">require adaptation</span> for morphologically rich languages
                such as Finnish, Turkish, and Georgian, where sub-word tokenisation interacts
                unfavourably with absolute position representations.
              </p>

              <div className="ms-h">1. Introduction</div>
              <p>
                The transformer architecture introduced by Vaswani et al. (2017) has become the
                dominant paradigm in natural language processing. However, the original evaluation
                focused primarily on high-resource language pairs (EN-DE, EN-FR), leaving open
                questions about generalisation to morphologically complex and low-resource settings.
              </p>
              <p>
                In this work, we conduct a systematic replication study across 12 language pairs,
                controlling for dataset size, tokenisation strategy, and training compute. Our
                primary contributions are: (i) a reproducible benchmark suite for low-resource
                NMT; (ii) evidence that{' '}
                <span className="hl">positional encoding choice</span> accounts for up to 2.3 BLEU
                points on agglutinative languages; and (iii) a set of practical recommendations
                for practitioners.
              </p>

              <div className="ms-h">2. Background</div>
              <p>
                Low-resource neural machine translation has been studied extensively in the
                context of transfer learning (Zoph et al., 2016), multilingual pre-training
                (Conneau et al., 2020), and data augmentation (Sennrich et al., 2016). Our work
                is closest to the systematic evaluation of Ott et al. (2018), but focuses on
                the specific interaction between positional encoding and morphological complexity.
              </p>
            </div>
          </div>

          {/* ── Review pane ── */}
          <div className="review-pane">
            <div className="rp-head">
              <IconClipboardText />
              <b>Review Workspace</b>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink3)' }}>7 reviewers</span>
            </div>

            <div className="score-box">
              <div className="score-top">
                <span className="score-num">4.2</span>
                <span className="score-of">/ 5</span>
                <span className="score-votes">weighted avg · 7 votes</span>
              </div>
              <div className="bars">
                {BARS.map((b) => (
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

            {/* Score selector */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', marginBottom: 8 }}>Your Score</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMyScore(n)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, border: '1.5px solid',
                      borderColor: myScore === n ? 'var(--primary)' : 'var(--border)',
                      background: myScore === n ? 'var(--primary-bg)' : 'var(--surface)',
                      color: myScore === n ? 'var(--primary)' : 'var(--ink2)',
                      fontWeight: 700, fontSize: 13,
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

            <div className="rp-scroll">
              <div className="rsec">
                Mandatory <span className="chip chip-urg" style={{ fontSize: 10 }}>2 open</span>
              </div>

              {COMMENTS.filter((c) => c.type === 'mand').map((c) => (
                <div key={c.id} className={`comment ${c.type}`}>
                  <div className="c-head">
                    <span className="c-badge mand">Mandatory</span>
                    <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.reviewer}</span>
                    <span className={`c-status ${c.resolved ? 'resolved' : 'open'}`}>
                      {c.resolved ? <><IconCircleCheck size={12} /> Resolved</> : <><IconClock size={12} /> Open</>}
                    </span>
                  </div>
                  <p className="c-body">{c.text}</p>
                  <div className="c-foot">
                    <button
                      className={`vote up${votes[c.id] === 'up' ? ' active' : ''}`}
                      onClick={() => toggleVote(c.id, 'up')}
                    >
                      <IconThumbUp size={13} /> {c.up + (votes[c.id] === 'up' ? 1 : 0)}
                    </button>
                    <button
                      className={`vote down${votes[c.id] === 'down' ? ' active' : ''}`}
                      onClick={() => toggleVote(c.id, 'down')}
                    >
                      <IconThumbDown size={13} /> {c.down + (votes[c.id] === 'down' ? 1 : 0)}
                    </button>
                  </div>
                </div>
              ))}

              <div className="rsec">Suggested</div>

              {COMMENTS.filter((c) => c.type === 'sugg').map((c) => (
                <div key={c.id} className={`comment ${c.type}`}>
                  <div className="c-head">
                    <span className="c-badge sugg">Suggested</span>
                    <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.reviewer}</span>
                    <span className={`c-status ${c.resolved ? 'resolved' : 'open'}`}>
                      {c.resolved ? <><IconCircleCheck size={12} /> Resolved</> : <><IconClock size={12} /> Open</>}
                    </span>
                  </div>
                  <p className="c-body">{c.text}</p>
                  <div className="c-foot">
                    <button
                      className={`vote up${votes[c.id] === 'up' ? ' active' : ''}`}
                      onClick={() => toggleVote(c.id, 'up')}
                    >
                      <IconThumbUp size={13} /> {c.up + (votes[c.id] === 'up' ? 1 : 0)}
                    </button>
                    <button
                      className={`vote down${votes[c.id] === 'down' ? ' active' : ''}`}
                      onClick={() => toggleVote(c.id, 'down')}
                    >
                      <IconThumbDown size={13} /> {c.down + (votes[c.id] === 'down' ? 1 : 0)}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rp-foot">
              <div className="countdown">
                <IconClock size={15} />
                Closes in 4d 12h
              </div>
              <button
                className="btn-primary"
                style={{ marginLeft: 'auto', opacity: myScore === null ? 0.5 : 1 }}
                disabled={myScore === null}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

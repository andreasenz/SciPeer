'use client'

import {
  IconCircleCheck,
  IconTrophy,
  IconStarFilled,
  IconFlame,
  IconBook,
  IconFileText,
  IconAward,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import Panel from '@/components/ui/Panel'

const XP_EVENTS = [
  { icon: IconStarFilled, label: 'Review submitted — "Attention Is All…"', ago: '2h ago', xp: +50, pos: true },
  { icon: IconThumbUpIcon, label: 'Review upvoted by community', ago: '5h ago', xp: +10, pos: true },
  { icon: IconBook, label: 'Review submitted — "CRISPR off-target…"', ago: '1d ago', xp: +50, pos: true },
  { icon: IconFlame, label: 'Streak bonus — 5 consecutive reviews', ago: '1d ago', xp: +100, pos: true },
  { icon: IconArrowDown, label: 'Review flagged as off-topic', ago: '3d ago', xp: -20, pos: false },
  { icon: IconFileText, label: 'Paper published — "Riemannian Gradient…"', ago: '1mo ago', xp: +200, pos: true },
]

function IconThumbUpIcon(props: { size?: number; style?: React.CSSProperties }) {
  return <IconStarFilled {...props} />
}

const BADGES = [
  { icon: IconTrophy, label: 'Top Reviewer', sub: 'Q2 2025', cls: 'gold' },
  { icon: IconStarFilled, label: '50 Reviews', sub: 'Milestone', cls: 'blue' },
  { icon: IconFlame, label: '30-day Streak', sub: 'Active', cls: 'purple' },
  { icon: IconCircleCheck, label: 'ORCID Verified', sub: 'Identity', cls: 'green' },
]

export default function ProfilePage() {
  return (
    <>
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <div className="v4-grid">
            {/* ── Left column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Panel>
                <div className="profile-head">
                  <div className="pf-avatar">A</div>
                  <div>
                    <div className="pf-name">Dr. Andrea Santomauro</div>
                    <div className="pf-verify">
                      <IconCircleCheck size={14} /> ORCID Verified
                    </div>
                    <div className="pf-bio">
                      Associate Professor, UPO — Universit&agrave; del Piemonte Orientale.
                      Research interests: machine learning, computational biology, and
                      open science infrastructure.
                    </div>
                  </div>
                </div>

                <div className="stat-grid" style={{ marginTop: 22 }}>
                  <div className="stat">
                    <div className="stat-num">2,840</div>
                    <div className="stat-lab">Karma XP</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">47</div>
                    <div className="stat-lab">Reviews done</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">12</div>
                    <div className="stat-lab">Papers submitted</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">4.6</div>
                    <div className="stat-lab">Avg review score</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">0.89</div>
                    <div className="stat-lab">Rep. weight</div>
                  </div>
                  <div className="stat">
                    <div className="stat-num">8</div>
                    <div className="stat-lab">Day streak</div>
                  </div>
                </div>
              </Panel>

              <Panel title="Badges">
                <div className="badge-row">
                  {BADGES.map((b) => (
                    <div key={b.label} className={`badge ${b.cls}`}>
                      <b.icon size={17} />
                      <div>
                        <div>{b.label}</div>
                        <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--ink3)' }}>{b.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Recent Papers">
                {[
                  { title: 'Riemannian Gradient Flows for Optimal Transport', status: 'Published · DOI 10.1234/sp.2025.001', score: 5.0 },
                  { title: 'Sparse NAS Under Memory Constraints', status: 'Under Review · 3 reviewers', score: 3.8 },
                  { title: 'Attention Replication in Low-Resource NLP', status: 'Revision Requested', score: 4.1 },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < 2 ? '1px solid var(--border2)' : 'none' }}>
                    <IconFileText size={18} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)' }}>{p.status}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber)', fontWeight: 700, fontSize: 13 }}>
                      <IconStarFilled size={13} /> {p.score}
                    </div>
                  </div>
                ))}
              </Panel>
            </div>

            {/* ── Right column: XP log ── */}
            <div>
              <Panel title="Karma / XP Log">
                {XP_EVENTS.map((e, i) => (
                  <div key={i} className="xp-row">
                    <div className="xp-ico">
                      <e.icon size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, lineHeight: 1.3 }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{e.ago}</div>
                    </div>
                    <div className={`xp-amt ${e.pos ? 'pos' : 'neg'}`}>
                      {e.pos ? '+' : ''}{e.xp} XP
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 18, padding: '13px 0 0', borderTop: '1px solid var(--border2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink2)', fontWeight: 600 }}>Total Karma XP</span>
                  <span style={{ fontSize: 22, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--primary)' }}>2,840</span>
                </div>
              </Panel>

              <div style={{ marginTop: 18 }}>
                <Panel title="Leaderboard Position">
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 600, color: 'var(--amber)' }}>#12</div>
                    <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 4 }}>in Computer Science this month</div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                      <IconArrowUp size={14} /> Up 4 places this week
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

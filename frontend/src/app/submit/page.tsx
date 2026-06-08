'use client'

import { useState } from 'react'
import {
  IconCheck,
  IconX,
  IconLoader,
  IconUpload,
  IconCircleCheck,
  IconShieldCheck,
  IconAlertTriangle,
} from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import Panel from '@/components/ui/Panel'

const FIELDS = [
  'Computer Science',
  'Biology',
  'Physics',
  'Medicine',
  'Mathematics',
  'Chemistry',
  'Environmental Science',
  'Psychology',
]

const KEYWORDS = ['machine learning', 'transformer', 'NLP', 'attention']

type COIStatus = 'idle' | 'running' | 'ok'

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [field, setField] = useState('')
  const [coiStatus, setCoiStatus] = useState<COIStatus>('idle')

  function runCOI() {
    if (!title) return
    setCoiStatus('running')
    setTimeout(() => setCoiStatus('ok'), 1800)
  }

  return (
    <>
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <div className="page-head">
            <h1 className="serif">Submit a Paper</h1>
            <p>Your manuscript will enter a 7-day open review period before scoring begins.</p>
          </div>

          <div className="v2-grid">
            {/* ── Left: form ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Panel>
                <div className="field-label">Paper Title *</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter full paper title…"
                  style={{
                    width: '100%', border: '1.5px solid var(--border)', borderRadius: 9,
                    padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                    color: 'var(--ink)',
                  }}
                />

                <div className="field-label">Abstract *</div>
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  rows={6}
                  placeholder="Paste your abstract here…"
                  style={{
                    width: '100%', border: '1.5px solid var(--border)', borderRadius: 9,
                    padding: '10px 13px', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical',
                    outline: 'none', lineHeight: 1.6, color: 'var(--ink)',
                  }}
                />

                <div className="field-label">Field Category *</div>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--border)', borderRadius: 9,
                    padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                    background: 'var(--surface)', color: 'var(--ink)',
                  }}
                >
                  <option value="">Select a field…</option>
                  {FIELDS.map((f) => <option key={f}>{f}</option>)}
                </select>

                <div className="field-label">Keywords</div>
                <div className="kw">
                  {KEYWORDS.map((k) => (
                    <span key={k} className="chip chip-rev" style={{ cursor: 'pointer' }}>
                      {k} <IconX size={11} />
                    </span>
                  ))}
                  <span className="chip chip-draft" style={{ cursor: 'pointer' }}>+ Add</span>
                </div>
              </Panel>

              <Panel>
                <div className="panel-title">Upload PDF *</div>
                <div className="upload">
                  <IconUpload />
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop PDF here or click to browse</div>
                  <div style={{ fontSize: 12 }}>Max 30 MB · PDF required · source optional</div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <div className="upload" style={{ flex: 1, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>LaTeX / Source</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>Optional</div>
                  </div>
                </div>
              </Panel>

              <button
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '12px 28px', fontSize: 14, borderRadius: 10 }}
              >
                Submit for Review
              </button>
            </div>

            {/* ── Right: COI graph check ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Panel title="Conflict-of-Interest Graph Check">
                <div
                  className="graph-wrap"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {coiStatus === 'idle' && (
                    <div style={{ textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                      Enter title to preview your author graph
                    </div>
                  )}
                  {coiStatus === 'running' && (
                    <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: 13 }}>
                      <IconLoader size={36} style={{ animation: 'spin 1s linear infinite' }} />
                      <div style={{ marginTop: 10 }}>Querying ORCID coauthor graph…</div>
                    </div>
                  )}
                  {coiStatus === 'ok' && (
                    <div style={{ textAlign: 'center', color: 'var(--green)', fontSize: 13 }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                      Graph verified — 47 eligible reviewers found
                    </div>
                  )}
                </div>

                <div className="legend">
                  <span><span className="ldot" style={{ background: '#1e4fcd' }} />You</span>
                  <span><span className="ldot" style={{ background: '#d23b3b' }} />COI (blocked)</span>
                  <span><span className="ldot" style={{ background: '#0f9d58' }} />Eligible</span>
                  <span><span className="ldot" style={{ background: '#94a3b8' }} />Unknown</span>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 14 }}
                  onClick={runCOI}
                  disabled={!title || coiStatus === 'running'}
                >
                  {coiStatus === 'running' ? 'Running…' : 'Run COI Check'}
                </button>
              </Panel>

              <Panel title="COI Algorithm">
                <div className="algo-row">
                  <div className="algo-ico algo-ok"><IconShieldCheck size={15} /></div>
                  <div className="algo-txt">
                    <b>ORCID coauthor graph</b>
                    <span>Pre-seeded from ORCID Works API. Updated on login.</span>
                  </div>
                </div>
                <div className="algo-row">
                  <div className="algo-ico algo-run"><IconLoader size={15} /></div>
                  <div className="algo-txt">
                    <b>Recursive CTE — 2 hops</b>
                    <span>PostgreSQL WITH RECURSIVE query. Depth configurable per field.</span>
                  </div>
                </div>
                <div className="algo-row">
                  <div className="algo-ico algo-block"><IconX size={15} /></div>
                  <div className="algo-txt">
                    <b>Blocked reviewers</b>
                    <span>Anyone within 2 hops of any author is automatically excluded.</span>
                  </div>
                </div>

                {coiStatus === 'ok' && (
                  <div className="verdict">
                    <IconCircleCheck size={24} />
                    <div>
                      <b>No conflicts found</b>
                      <span>Eligible reviewer pool: 47 researchers</span>
                    </div>
                  </div>
                )}
                {coiStatus === 'idle' && (
                  <div className="verdict" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <IconAlertTriangle size={24} style={{ color: 'var(--amber)' }} />
                    <div>
                      <b style={{ color: 'var(--ink2)' }}>Check not run yet</b>
                      <span style={{ color: 'var(--ink3)' }}>Run check after entering title</span>
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

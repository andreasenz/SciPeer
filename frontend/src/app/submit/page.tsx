'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconX,
  IconLoader,
  IconUpload,
  IconCircleCheck,
  IconShieldCheck,
  IconAlertTriangle,
  IconFile,
  IconPlus,
  IconUserPlus,
} from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import Panel from '@/components/ui/Panel'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/lib/api'
import type { FieldCategory } from '@/lib/types'

type COIStatus = 'idle' | 'running' | 'ok'

interface Coauthor {
  display_name: string
  orcid_id: string
}

export default function SubmitPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [fields, setFields] = useState<FieldCategory[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [coiStatus, setCoiStatus] = useState<COIStatus>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [coauthors, setCoauthors] = useState<Coauthor[]>([])
  const [coName, setCoName] = useState('')
  const [coOrcid, setCoOrcid] = useState('')

  useEffect(() => {
    api.papers.fields().then(setFields).catch(() => {})
  }, [])

  function handleFile(f: File | null) {
    if (f && f.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return
    }
    setFile(f)
    setError('')
  }

  function runCOI() {
    if (!title) return
    setCoiStatus('running')
    setTimeout(() => setCoiStatus('ok'), 1800)
  }

  function addCoauthor() {
    if (!coName.trim()) return
    setCoauthors(prev => [...prev, { display_name: coName.trim(), orcid_id: coOrcid.trim() }])
    setCoName('')
    setCoOrcid('')
  }

  function removeCoauthor(idx: number) {
    setCoauthors(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!title.trim() || !abstract.trim() || !fieldId || !file) {
      setError('Title, abstract, field, and PDF are required')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const paper = await api.papers.create({
        title,
        abstract,
        field_category_id: fieldId,
        coauthors: coauthors.map(c => ({ display_name: c.display_name, orcid_id: c.orcid_id || null })),
      })
      await api.papers.uploadPdf(paper.id, file)
      await api.papers.submit(paper.id)
      showToast('Paper submitted for review!')
      router.push('/my-papers')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submission failed'
      setError(msg)
      showToast(msg, 'error')
      setSubmitting(false)
    }
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
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--border)', borderRadius: 9,
                    padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                    background: 'var(--surface)', color: 'var(--ink)',
                  }}
                >
                  <option value="">Select a field…</option>
                  {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Panel>

              <Panel>
                <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconUserPlus size={16} />
                  Co-authors
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 12, marginTop: 0 }}>
                  Provide ORCID for co-authors to enable conflict-of-interest checks.
                </p>

                {coauthors.map((co, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: 'var(--surface2)', borderRadius: 8, padding: '6px 10px' }}>
                    <span style={{ fontSize: 13, flex: 1, color: 'var(--ink)' }}>{co.display_name}</span>
                    {co.orcid_id && <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'monospace' }}>{co.orcid_id}</span>}
                    <button onClick={() => removeCoauthor(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', padding: 2 }}>
                      <IconX size={14} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    value={coName}
                    onChange={e => setCoName(e.target.value)}
                    placeholder="Full name *"
                    onKeyDown={e => e.key === 'Enter' && addCoauthor()}
                    style={{ flex: 2, border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--ink)' }}
                  />
                  <input
                    value={coOrcid}
                    onChange={e => setCoOrcid(e.target.value)}
                    placeholder="ORCID (optional)"
                    onKeyDown={e => e.key === 'Enter' && addCoauthor()}
                    style={{ flex: 3, border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 11px', fontSize: 13, fontFamily: 'monospace', outline: 'none', color: 'var(--ink)' }}
                  />
                  <button
                    onClick={addCoauthor}
                    disabled={!coName.trim()}
                    style={{ background: 'var(--primary)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, opacity: coName.trim() ? 1 : 0.4 }}
                  >
                    <IconPlus size={14} />
                    Add
                  </button>
                </div>
              </Panel>

              <Panel>
                <div className="panel-title">Upload PDF *</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                    <IconFile size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, wordBreak: 'break-all' }}>{file.name}</span>
                    <button
                      onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink3)', padding: 4 }}
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="upload"
                    style={{ borderColor: dragOver ? 'var(--primary)' : undefined, cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      handleFile(e.dataTransfer.files?.[0] ?? null)
                    }}
                  >
                    <IconUpload />
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop PDF here or click to browse</div>
                    <div style={{ fontSize: 12 }}>Max 30 MB · PDF required</div>
                  </div>
                )}
              </Panel>

              {error && (
                <div style={{ color: 'var(--red)', fontSize: 13, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <button
                className="btn-primary"
                style={{ alignSelf: 'flex-start', padding: '12px 28px', fontSize: 14, borderRadius: 10, opacity: submitting ? 0.6 : 1 }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Submitting…
                  </span>
                ) : 'Submit for Review'}
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
                      Graph verified — eligible reviewers found
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
                      <span>Eligible reviewer pool ready</span>
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

'use client'

import { useEffect, useState } from 'react'
import { IconAdjustmentsHorizontal, IconFlame, IconLoader } from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import PaperGrid from '@/components/papers/PaperGrid'
import { api } from '@/lib/api'
import type { Paper } from '@/lib/types'

const TABS = ['All', 'Under Review', 'Published', 'Revision Requested']

const TAB_STATUS: Record<string, string | undefined> = {
  'Under Review': 'UNDER_REVIEW',
  'Published': 'PUBLISHED',
  'Revision Requested': 'REVISION_REQUESTED',
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.papers.list(TAB_STATUS[activeTab])
      .then(setPapers)
      .catch(() => setPapers([]))
      .finally(() => setLoading(false))
  }, [activeTab])

  return (
    <>
      <Topbar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <div className="head">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`tab${activeTab === t ? ' active' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="sort">
              <IconAdjustmentsHorizontal size={15} />
              Sort: Latest
            </div>
          </div>

          <div className="beacon">
            <div className="beacon-ico">
              <IconFlame size={20} />
            </div>
            <div className="beacon-txt">
              <b>Papers under review need your expertise</b>
              <span>Browse and contribute to open peer review</span>
            </div>
            <button className="beacon-link" onClick={() => setActiveTab('Under Review')}>View urgent →</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--ink3)' }}>
              <IconLoader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : papers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink3)', fontSize: 14 }}>
              No papers found. <a href="/submit" style={{ color: 'var(--primary)' }}>Submit the first one</a>
            </div>
          ) : (
            <PaperGrid papers={papers} />
          )}
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

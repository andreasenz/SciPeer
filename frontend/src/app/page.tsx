'use client'

import { useState } from 'react'
import { IconAdjustmentsHorizontal, IconFlame } from '@tabler/icons-react'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import PaperGrid from '@/components/papers/PaperGrid'
import type { Paper } from '@/lib/types'

const TABS = ['All', 'Under Review', 'Published', 'Needs Reviewers']

const MOCK_PAPERS: Paper[] = [
  {
    id: 'mock-1',
    title: 'Attention Is All You Need: A Replication Study on Low-Resource Languages',
    abstract:
      'We replicate the original transformer architecture experiments on 12 low-resource language pairs and demonstrate that positional encodings require adaptation for morphologically rich languages.',
    status: 'UNDER_REVIEW',
    field_category_id: 'cs',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    authors: 'Chen, L. · Nakamura, H. · Al-Rashid, F.',
    score: 4.2,
    review_count: 7,
    field_name: 'Computer Science',
    urgency: 'Needs 1 review',
  },
  {
    id: 'mock-2',
    title: 'CRISPR-Cas9 Off-Target Effects in Murine Hepatocytes: A Systematic Mapping',
    abstract:
      'Using whole-genome sequencing on 847 edited samples we construct the first comprehensive off-target atlas for liver-targeted CRISPR therapeutics.',
    status: 'UNDER_REVIEW',
    field_category_id: 'bio',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    authors: 'Williams, K. · Santos, M.',
    score: 3.8,
    review_count: 5,
    field_name: 'Biology',
    urgency: 'Expiring 2d',
    hot: true,
  },
  {
    id: 'mock-3',
    title: 'Quantum Error Correction via Topological Codes in Noisy Intermediate-Scale Devices',
    abstract:
      'We demonstrate a 34% reduction in logical error rate by adapting surface codes to the specific noise characteristics of superconducting qubit arrays.',
    status: 'PUBLISHED',
    field_category_id: 'phys',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    authors: 'Park, J. · Ivanova, E. · Thompson, R.',
    score: 4.7,
    review_count: 9,
    field_name: 'Physics',
  },
  {
    id: 'mock-4',
    title: 'Social Determinants of Antibiotic Resistance Spread in Urban Hospital Networks',
    abstract:
      'Epidemiological network analysis of 23 hospitals reveals that staff mobility patterns account for 61% of resistant strain dissemination across facilities.',
    status: 'REVISION_REQUESTED',
    field_category_id: 'med',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    authors: 'Okonkwo, A. · Reyes, C.',
    score: 3.5,
    review_count: 4,
    field_name: 'Medicine',
  },
  {
    id: 'mock-5',
    title: 'A Unified Framework for Sparse Neural Architecture Search Under Memory Constraints',
    abstract:
      'We propose MESA, a differentiable NAS method that jointly optimises accuracy and peak activation memory, enabling deployment on 4 MB SRAM microcontrollers.',
    status: 'DRAFT',
    field_category_id: 'cs',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    authors: 'Dumont, P. · Kim, S.',
    score: undefined,
    review_count: 0,
    field_name: 'Computer Science',
    urgency: 'Draft — opens 6d',
  },
  {
    id: 'mock-6',
    title: 'Riemannian Gradient Flows for Optimal Transport in Infinite Dimensions',
    abstract:
      'We establish convergence guarantees for gradient flow discretisations of the Wasserstein distance in infinite-dimensional Hilbert spaces.',
    status: 'PUBLISHED',
    field_category_id: 'math',
    pdf_url: '',
    source_url: null,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    authors: 'Lefebvre, M. · Vasquez, D.',
    score: 5.0,
    review_count: 11,
    field_name: 'Mathematics',
  },
]

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('All')

  const filtered = MOCK_PAPERS.filter((p) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Under Review') return p.status === 'UNDER_REVIEW'
    if (activeTab === 'Published') return p.status === 'PUBLISHED'
    if (activeTab === 'Needs Reviewers') return p.review_count !== undefined && p.review_count < 3
    return true
  })

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
              <b>3 papers need your review in your field</b>
              <span>Biology · Computer Science — your expertise is valuable</span>
            </div>
            <button className="beacon-link">View urgent →</button>
          </div>

          <PaperGrid papers={filtered} />
        </main>
      </div>
    </>
  )
}

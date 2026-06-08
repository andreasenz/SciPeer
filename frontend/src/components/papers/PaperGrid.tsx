import type { Paper } from '@/lib/types'
import PaperCard from './PaperCard'

interface PaperGridProps {
  papers: Paper[]
}

export default function PaperGrid({ papers }: PaperGridProps) {
  if (papers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink3)', fontSize: 14 }}>
        No papers to show yet.
      </div>
    )
  }
  return (
    <div className="grid">
      {papers.map((p) => (
        <PaperCard key={p.id} paper={p} />
      ))}
    </div>
  )
}

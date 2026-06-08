import { IconStar, IconMessageCircle, IconEye } from '@tabler/icons-react'
import type { Paper } from '@/lib/types'
import { StatusChip, UrgencyChip } from '@/components/ui/Chip'
import Link from 'next/link'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface PaperCardProps {
  paper: Paper
}

export default function PaperCard({ paper }: PaperCardProps) {
  return (
    <Link href={`/review/${paper.id}`} className="card">
      <div className="card-top">
        <StatusChip status={paper.status} />
        {paper.field_name && (
          <span className="chip chip-draft">{paper.field_name}</span>
        )}
        {paper.urgency && (
          <UrgencyChip label={paper.urgency} hot={paper.hot} />
        )}
      </div>

      <h3 className="card-title serif">{paper.title}</h3>
      {paper.status !== 'UNDER_REVIEW' && paper.status !== 'REVISION_REQUESTED' &&
        paper.author_names && paper.author_names.length > 0 && (
          <div className="card-auth">{paper.author_names.join(', ')}</div>
        )
      }

      {paper.abstract && (
        <p className="card-abs">
          {paper.abstract.length > 160 ? paper.abstract.slice(0, 160) + '…' : paper.abstract}
        </p>
      )}

      <div className="card-foot">
        {paper.score !== undefined && (
          <div className="metric">
            <IconStar size={14} className="star" />
            <span>{paper.score.toFixed(1)}</span>
          </div>
        )}
        {paper.review_count !== undefined && (
          <div className="metric">
            <IconMessageCircle size={14} />
            <span>{paper.review_count}</span>
          </div>
        )}
        <div className="metric">
          <IconEye size={14} />
          <span>—</span>
        </div>
        <span className="card-age">{timeAgo(paper.created_at)}</span>
      </div>
    </Link>
  )
}

import type { PaperStatus } from '@/lib/types'

const STATUS_CLASS: Record<PaperStatus, string> = {
  PUBLISHED: 'chip chip-pub',
  UNDER_REVIEW: 'chip chip-rev',
  DRAFT: 'chip chip-draft',
  REVISION_REQUESTED: 'chip chip-disc',
  CAMERA_READY: 'chip chip-rev',
  REJECTED: 'chip chip-draft',
}

const STATUS_LABEL: Record<PaperStatus, string> = {
  PUBLISHED: 'Published',
  UNDER_REVIEW: 'Under Review',
  DRAFT: 'Draft',
  REVISION_REQUESTED: 'Revision',
  CAMERA_READY: 'Camera Ready',
  REJECTED: 'Rejected',
}

interface ChipProps {
  status: PaperStatus
}

export function StatusChip({ status }: ChipProps) {
  return <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
}

interface UrgencyChipProps {
  label: string
  hot?: boolean
}

export function UrgencyChip({ label, hot }: UrgencyChipProps) {
  return <span className={`chip chip-urg${hot ? ' hot' : ''}`}>{label}</span>
}

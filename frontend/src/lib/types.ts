export type PaperStatus = 'DRAFT' | 'UNDER_REVIEW' | 'REVISION_REQUESTED' | 'CAMERA_READY' | 'PUBLISHED' | 'REJECTED'

export interface FieldCategory {
  id: string
  name: string
  slug: string
  coi_depth: number
}

export interface Paper {
  id: string
  title: string
  abstract: string
  status: PaperStatus
  field_category_id: string
  pdf_url: string
  source_url: string | null
  created_at: string
  updated_at: string
  // enriched client-side
  authors?: string
  score?: number
  review_count?: number
  field_name?: string
  urgency?: string
  hot?: boolean
}

export interface ReviewScore {
  id: string
  submission_id: string
  reviewer_id: string
  raw_score: number
  submitted_at: string
}

export interface ReviewComment {
  id: string
  submission_id: string
  reviewer_id: string
  comment_type: 'mandatory' | 'suggested'
  body: string
  is_resolved: boolean
  upvotes: number
  downvotes: number
  created_at: string
}

export interface ReputationScore {
  user_id: string
  normalized_weight: number
  total_reviews: number
  total_xp: number
  updated_at: string
}

export interface GamificationEvent {
  id: string
  event_type: string
  xp_delta: number
  created_at: string
}

export interface User {
  id: string
  orcid_id: string
  display_name: string
  email: string | null
  affiliation: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface COICheckResult {
  has_conflict: boolean
  candidate_reviewer_id: string
}

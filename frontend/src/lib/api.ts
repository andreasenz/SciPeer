const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string; db: boolean; redis: boolean }>('/api/health'),

  auth: {
    me: () => request<import('./types').User>('/api/v1/auth/me'),
    loginUrl: () => `${API_BASE}/api/v1/auth/orcid/login`,
    callback: (code: string, state?: string) =>
      request<import('./types').TokenResponse>('/api/v1/auth/orcid/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state: state ?? null }),
      }),
    refresh: (refresh_token: string) =>
      request<import('./types').TokenResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token }),
      }),
  },

  papers: {
    list: (status?: string) =>
      request<import('./types').Paper[]>(`/api/v1/papers${status ? `?status=${status}` : ''}`),
    my: () => request<import('./types').Paper[]>('/api/v1/papers/my'),
    get: (id: string) => request<import('./types').Paper>(`/api/v1/papers/${id}`),
    create: (body: { title: string; abstract: string; field_category_id: string }) =>
      request<import('./types').Paper>('/api/v1/papers', { method: 'POST', body: JSON.stringify(body) }),
    uploadPdf: (paperId: string, file: File): Promise<import('./types').Paper> => {
      const form = new FormData()
      form.append('file', file)
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      return fetch(`${API_BASE}/api/v1/papers/${paperId}/upload-pdf`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(r =>
        r.ok
          ? (r.json() as Promise<import('./types').Paper>)
          : r.json().then(e => Promise.reject(new Error(e.detail ?? 'Upload failed')))
      )
    },
    submit: (paperId: string) =>
      request<import('./types').Paper>(`/api/v1/papers/${paperId}/submit`, { method: 'POST' }),
    pdfUrl: (id: string) => request<{ url: string }>(`/api/v1/papers/${id}/pdf-url`),
    fields: () => request<import('./types').FieldCategory[]>('/api/v1/papers/fields'),
    search: (q: string, status?: string) =>
      request<{ hits: import('./types').Paper[] }>(
        `/api/v1/papers/search?q=${encodeURIComponent(q)}${status ? `&status=${status}` : ''}`
      ),
  },

  reviews: {
    coiCheck: (paperId: string, reviewerId: string) =>
      request<import('./types').COICheckResult>(`/api/v1/reviews/coi-check/${paperId}/${reviewerId}`),
    my: () => request<import('./types').ReviewScore[]>('/api/v1/reviews/my'),
    getScores: (paperId: string) =>
      request<import('./types').ReviewScore[]>(`/api/v1/reviews/${paperId}/scores`),
    getComments: (paperId: string) =>
      request<import('./types').ReviewComment[]>(`/api/v1/reviews/${paperId}/comments`),
    submitScore: (paperId: string, raw_score: number) =>
      request<import('./types').ReviewScore>(`/api/v1/reviews/${paperId}/scores`, {
        method: 'POST',
        body: JSON.stringify({ raw_score }),
      }),
    addComment: (paperId: string, comment_type: 'mandatory' | 'suggested', body: string) =>
      request<import('./types').ReviewComment>(`/api/v1/reviews/${paperId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment_type, body }),
      }),
    voteComment: (commentId: string, direction: 'up' | 'down') =>
      request<import('./types').ReviewComment>(
        `/api/v1/reviews/comments/${commentId}/vote?direction=${direction}`,
        { method: 'PATCH' }
      ),
    resolveComment: (commentId: string) =>
      request<import('./types').ReviewComment>(
        `/api/v1/reviews/comments/${commentId}/resolve`,
        { method: 'PATCH' }
      ),
  },

  gamification: {
    reputation: () => request<import('./types').ReputationScore>('/api/v1/gamification/me/reputation'),
    events: () => request<import('./types').GamificationEvent[]>('/api/v1/gamification/me/events'),
  },
}

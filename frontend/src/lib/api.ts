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
    get: (id: string) => request<import('./types').Paper>(`/api/v1/papers/${id}`),
    create: (body: { title: string; abstract: string; field_category_id: string }) =>
      request<import('./types').Paper>('/api/v1/papers', { method: 'POST', body: JSON.stringify(body) }),
    fields: () => request<import('./types').FieldCategory[]>('/api/v1/papers/fields'),
  },

  reviews: {
    coiCheck: (paperId: string, reviewerId: string) =>
      request<import('./types').COICheckResult>(`/api/v1/reviews/coi-check/${paperId}/${reviewerId}`),
  },

  gamification: {
    reputation: () => request<import('./types').ReputationScore>('/api/v1/gamification/me/reputation'),
    events: () => request<import('./types').GamificationEvent[]>('/api/v1/gamification/me/events'),
  },
}

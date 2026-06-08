'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

export interface AuthState {
  user: User | null
  loading: boolean
  accessToken: string | null
  login: () => void
  logout: () => void
  setTokens: (access: string, refresh: string) => void
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    setAccessToken(token)
    api.auth.me()
      .then(setUser)
      .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token') })
      .finally(() => setLoading(false))
  }, [])

  function login() {
    window.location.href = api.auth.loginUrl()
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    setAccessToken(null)
  }

  function setTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    setAccessToken(access)
    api.auth.me().then(setUser).catch(() => {})
  }

  return { user, loading, accessToken, login, logout, setTokens }
}

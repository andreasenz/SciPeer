'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 14, color: 'var(--ink2)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14 }}>Completing sign-in…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 14, color: 'var(--ink)' }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>Sign-in failed</div>
      <div style={{ fontSize: 13, color: 'var(--ink2)', maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>{message}</div>
      <Link href="/" style={{ marginTop: 8, padding: '10px 22px', borderRadius: 9, background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
        Back to home
      </Link>
    </div>
  )
}

function CallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const called = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (called.current) return
    called.current = true

    // Redirect from ORCID with error param
    const authError = params.get('auth')
    if (authError === 'error') {
      setError('ORCID sign-in was cancelled or failed. Make sure the app is registered in ORCID Developer Tools and the redirect URI matches.')
      return
    }

    const code = params.get('code')
    if (!code) {
      setError('No authorisation code received from ORCID. Please try signing in again.')
      return
    }

    api.auth.callback(code, params.get('state') ?? undefined)
      .then(({ access_token, refresh_token }) => {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        router.replace('/')
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        setError(`Could not complete sign-in: ${msg}. Check that ORCID_CLIENT_ID and ORCID_CLIENT_SECRET are set correctly in .env.`)
      })
  }, [params, router])

  if (error) return <ErrorMessage message={error} />
  return <Spinner />
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackInner />
    </Suspense>
  )
}

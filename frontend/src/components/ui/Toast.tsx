'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { IconCircleCheck, IconAlertCircle, IconInfoCircle, IconX } from '@tabler/icons-react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastCtx {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

const ICONS = {
  success: <IconCircleCheck size={16} />,
  error: <IconAlertCircle size={16} />,
  info: <IconInfoCircle size={16} />,
}

const COLORS = {
  success: { bg: 'var(--green)', text: '#fff' },
  error: { bg: 'var(--red)', text: '#fff' },
  info: { bg: 'var(--primary)', text: '#fff' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200)
  }, [])

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const col = COLORS[t.type]
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: col.bg, color: col.text,
              padding: '11px 16px', borderRadius: 11,
              fontSize: 13.5, fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,.18)',
              pointerEvents: 'auto',
              maxWidth: 380,
              animation: 'toastIn .22s ease-out',
            }}>
              {ICONS[t.type]}
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', color: col.text, cursor: 'pointer', opacity: .7, padding: 2, lineHeight: 0 }}
              >
                <IconX size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

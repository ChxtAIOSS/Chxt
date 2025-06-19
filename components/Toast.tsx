// components/Toast.tsx
"use client"

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, memo, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import styles from './Toast.module.css'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'primary'
  title: string
  message: string
  duration: number
  actions?: ToastAction[]
  dismissible: boolean
  icon?: ReactNode
  ambient?: boolean
  timestamp: number
}

interface ToastAction {
  text: string
  onClick: () => void
  style?: 'primary' | 'secondary' | 'danger'
}

export interface ToastContextType {
  show: (
    type: Toast['type'], 
    title: string, 
    message: string, 
    options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message' | 'timestamp'>>
  ) => string
  dismiss: (id: string) => void
  addToast: (message: string, type?: Toast['type'], duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

// Icons as a const object
const ICONS = {
  success: <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>,
  error: <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>,
  warning: <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>,
  info: <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>,
  primary: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
}

const ToastItem = memo(({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleDismiss = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 500)
  }, [toast.id, onDismiss])

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
    
    if (toast.duration > 0) {
      const startTime = Date.now()
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100)
        setProgress(remaining)
        if (remaining <= 0) handleDismiss()
      }, 16)
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [toast.duration, handleDismiss])

  const timeString = new Date(toast.timestamp).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })

  const toastClasses = `${styles.toast} ${styles[toast.type]} ${isVisible ? styles.show : ''} ${isExiting ? styles.hide : ''} ${isVisible && !isExiting ? styles.fresh : ''}`

  return (
    <div className={toastClasses}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${styles.icon} ${styles[toast.type]}`}>
          {toast.icon || ICONS[toast.type]}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[0.9375rem] text-white/95 leading-[1.2] mb-[0.125rem] tracking-[-0.01em]">
            {toast.title}
          </div>
          <div className="text-[0.75rem] text-white/45 font-medium">{timeString}</div>
        </div>
        
        {toast.dismissible && (
          <button
            onPointerDown={handleDismiss}
            className="w-6 h-6 border-none bg-white/[0.04] rounded-[0.5rem] text-white/35 cursor-pointer flex items-center justify-center flex-shrink-0 backdrop-blur-[8px] transition-all duration-[250ms] hover:bg-white/10 hover:text-white/70 hover:scale-110"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <div className="text-[0.8125rem] text-white/70 leading-[1.4] mb-[0.875rem] font-normal">
        {toast.message}
      </div>

      {toast.actions && toast.actions.length > 0 && (
        <div className="flex gap-2">
          {toast.actions.map((action, idx) => (
            <button
              key={idx}
              onPointerDown={() => {
                action.onClick()
                handleDismiss()
              }}
              className={`${styles.btn} ${styles[action.style || 'secondary']}`}
            >
              {action.text}
            </button>
          ))}
        </div>
      )}

      {toast.duration > 0 && (
        <div className={styles.progress}>
          <div 
            className={`${styles.progressBar} ${styles[toast.type]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
})

ToastItem.displayName = 'ToastItem'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)
  const idRef = useRef(0)

  useEffect(() => setMounted(true), [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(n => n.id !== id))
  }, [])

  const show = useCallback((
    type: Toast['type'],
    title: string,
    message: string,
    options: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message' | 'timestamp'>> = {}
  ) => {
    const id = `toast-${++idRef.current}`
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration: options.duration ?? 6000,
      actions: options.actions,
      dismissible: options.dismissible ?? true,
      icon: options.icon,
      ambient: options.ambient,
      timestamp: Date.now()
    }
    setToasts(prev => [...prev, toast])
    return id
  }, [])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info', primary: 'Notification' }
    show(type, titles[type], message, { duration })
  }, [show])

  const contextValue = useMemo(() => ({ show, dismiss, addToast }), [show, dismiss, addToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted && createPortal(
        <div className={styles.container}>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export default ToastProvider
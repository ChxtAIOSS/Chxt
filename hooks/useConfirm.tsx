// hooks/useConfirm.tsx
import { useState, useCallback } from 'react'
import { ConfirmModal } from '@/components/ConfirmModal'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: ''
  })
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((confirmOptions: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(confirmOptions)
      setResolvePromise(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    // Wait for exit animation before resolving
    setTimeout(() => {
      if (resolvePromise) {
        resolvePromise(true)
        setResolvePromise(null)
      }
    }, 300)
  }, [resolvePromise])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    // Wait for exit animation before resolving
    setTimeout(() => {
      if (resolvePromise) {
        resolvePromise(false)
        setResolvePromise(null)
      }
    }, 300)
  }, [resolvePromise])

  const ConfirmDialog = (
    <ConfirmModal
      isOpen={isOpen}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      type={options.type}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, ConfirmDialog }
}
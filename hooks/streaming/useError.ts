import { useState, useCallback } from 'react'
import { useToast } from '@/components/Toast'

export type StreamError = {
  message: string
  code?: string
  timestamp: Date
  retryable: boolean
}

export function useError() {
  const { addToast } = useToast()
  const [errors, setErrors] = useState<StreamError[]>([])
  const [lastError, setLastError] = useState<StreamError | null>(null)

  const handleError = useCallback((
    error: unknown,
    context?: { retryable?: boolean; showToast?: boolean }
  ) => {
    const streamError: StreamError = {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error && 'code' in error ? String(error.code) : undefined,
      timestamp: new Date(),
      retryable: context?.retryable ?? true,
    }

    setErrors(prev => [...prev, streamError])
    setLastError(streamError)

    if (context?.showToast !== false) {
      addToast(streamError.message, 'error')
    }

    return streamError
  }, [addToast])

  const clearErrors = useCallback(() => {
    setErrors([])
    setLastError(null)
  }, [])

  const clearError = useCallback((error: StreamError) => {
    setErrors(prev => prev.filter(e => e !== error))
    if (lastError === error) {
      setLastError(null)
    }
  }, [lastError])

  return {
    errors,
    lastError,
    handleError,
    clearErrors,
    clearError,
  }
}
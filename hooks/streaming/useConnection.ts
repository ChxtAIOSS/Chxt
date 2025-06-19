import { useCallback, useRef, useState } from 'react'

export interface ConnectionState {
  isConnected: boolean
  abortController: AbortController | null
  reconnectAttempts: number
}

export function useConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: true,
    abortController: null,
    reconnectAttempts: 0,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const createAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    
    setConnectionState(prev => ({
      ...prev,
      abortController: controller,
    }))

    return controller
  }, [])

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      abortController: null,
    }))
  }, [])

  const reconnect = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      isConnected: true,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }))
  }, [])

  return {
    connectionState,
    createAbortController,
    disconnect,
    reconnect,
  }
}
"use client"

import { useState } from 'react'
import { StreamingContext } from '@/contexts/StreamingContext'
import { ToastProvider } from '@/lib/dynamicComponents'
import { Layout } from '@/components/Layout'

export default function App() {
  const [streamingThreads, setStreamingThreads] = useState<Set<string>>(new Set())
  
  const setStreamingThread = (threadId: string, isStreaming: boolean) => {
    setStreamingThreads(prev => {
      const next = new Set(prev)
      if (isStreaming) {
        next.add(threadId)
      } else {
        next.delete(threadId)
      }
      return next
    })
  }
  
  return (
    <ToastProvider>
      <StreamingContext.Provider value={{
        streamingThreads,
        setStreamingThread
      }}>
        <Layout />
      </StreamingContext.Provider>
    </ToastProvider>
  )
}
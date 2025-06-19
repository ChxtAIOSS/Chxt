// contexts/StreamingContext.tsx
import React from 'react'

export interface StreamingContextType {
  streamingThreads: Set<string>
  setStreamingThread: (threadId: string, isStreaming: boolean) => void
}

export const StreamingContext = React.createContext<StreamingContextType>({
  streamingThreads: new Set(),
  setStreamingThread: () => {},
})
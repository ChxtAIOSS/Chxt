// lib/types.ts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface SearchResult {
  id: string
  title: string
  url: string
  description: string
  favicon?: string
}

export interface SearchSession {
  query: string
  results: SearchResult[]
  isSearching: boolean
  isComplete: boolean
  timestamp: number
  hasTriggeredAI: boolean
}

// Database message type from Convex
export interface DatabaseMessage {
  _id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  createdAt: number
  status?: 'streaming' | 'complete' | 'error'
  threadId: string
  userId: string
  _creationTime: number
  model?: string
  metadata?: Record<string, unknown>
}
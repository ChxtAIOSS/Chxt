"use client"

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

export function useAutoThreadNaming() {
  const pathname = usePathname()
  const { user } = useUser()
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null
  const autoUpdateTitle = useMutation(api.threads.autoUpdateTitle)
  const threadId = pathname?.split('/')[2] || ''
  const messages = useQuery(api.messages.listByThread, { threadId })
  const threads = useQuery(api.threads.list, { 
    sessionId: user?.id ? undefined : sessionId || undefined 
  })
  const processedThreadsRef = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    if (!messages || messages.length < 2) return
    if (!threadId) return
    
    const thread = threads?.find((t: any) => t._id === threadId)
    if (!thread || thread.title !== 'New Chat') return
    
    if (processedThreadsRef.current.has(threadId)) return
    
    const firstUserMessage = messages.find(msg => msg.role === 'user')
    const firstAssistantMessage = messages.find(
      msg => msg.role === 'assistant' && msg.status === 'complete'
    )
    
    if (firstAssistantMessage && firstAssistantMessage.content.length > 10) {
      processedThreadsRef.current.add(threadId)
      
      let title = ''
      
      if (firstUserMessage) {
        const userContent = firstUserMessage.content.trim()
        
        if (userContent.endsWith('?')) {
          const cleanQuestion = userContent
            .replace(/^(what|how|why|when|where|who|which|can you|could you|would you|please|tell me about|explain)\s+/i, '')
            .replace(/\?$/, '')
            .trim()
          
          const words = cleanQuestion.split(/\s+/).slice(0, 4)
          if (words.length >= 2) {
            title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          }
        }
        else if (userContent.length < 50) {
          const cleanCommand = userContent
            .replace(/^(create|make|build|write|generate|help me with|show me|give me|find)\s+/i, '')
            .replace(/[.!]$/, '')
            .trim()
          
          const words = cleanCommand.split(/\s+/).slice(0, 4)
          if (words.length >= 2) {
            title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          }
        }
      }
      
      if (!title && firstUserMessage && firstAssistantMessage) {
        const userLower = firstUserMessage.content.toLowerCase()
        const assistantStart = firstAssistantMessage.content.slice(0, 200).toLowerCase()
        
        const topicPatterns = [
          { pattern: /(python|javascript|java|code|programming|function|variable)/i, title: 'Code Discussion' },
          { pattern: /(recipe|cook|food|ingredient|dish)/i, title: 'Recipe Help' },
          { pattern: /(travel|trip|visit|destination|flight)/i, title: 'Travel Planning' },
          { pattern: /(health|medical|doctor|symptom|treatment)/i, title: 'Health Question' },
          { pattern: /(business|marketing|strategy|company|startup)/i, title: 'Business Strategy' },
          { pattern: /(learn|study|education|course|tutorial)/i, title: 'Learning Help' },
          { pattern: /(bug|error|fix|debug|issue)/i, title: 'Debug Issue' },
          { pattern: /(design|ui|ux|interface|layout)/i, title: 'Design Discussion' },
          { pattern: /(api|database|server|backend|frontend)/i, title: 'Tech Architecture' },
          { pattern: /(story|write|blog|article|content)/i, title: 'Writing Help' },
          { pattern: /(math|calculate|formula|equation|solve)/i, title: 'Math Problem' },
          { pattern: /(ai|machine learning|neural|model)/i, title: 'AI Discussion' },
        ]
        
        for (const { pattern, title: patternTitle } of topicPatterns) {
          if (pattern.test(userLower) || pattern.test(assistantStart)) {
            title = patternTitle
            break
          }
        }
        
        if (!title) {
          const importantWords = firstUserMessage.content
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => {
              const lower = word.toLowerCase()
              return word.length > 3 && 
                     !['what', 'how', 'when', 'where', 'which', 'would', 'could', 'should', 'please', 'help', 'need', 'want', 'tell', 'show', 'explain', 'about', 'with', 'from', 'have', 'make', 'give'].includes(lower)
            })
            .slice(0, 3)
          
          if (importantWords.length > 0) {
            title = importantWords
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')
          }
        }
      }
      
      autoUpdateTitle({
        threadId: threadId as Id<"threads">,
        title: title || 'General Chat',
      }).catch(error => {
        console.error('Failed to auto-update thread title:', error)
        processedThreadsRef.current.delete(threadId)
      })
    }
  }, [messages, threads, autoUpdateTitle, pathname, user, sessionId, threadId])
}
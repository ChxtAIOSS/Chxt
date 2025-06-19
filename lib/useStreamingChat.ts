// lib/useStreamingChat.ts
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { decryptApiKey } from './crypto'
import { useUser } from '@clerk/nextjs'
import { MODEL_PROVIDERS } from './constants'
import { useConnection } from '@/hooks/streaming/useConnection'
import { useAnimation } from '@/hooks/streaming/useAnimation'
import { useError } from '@/hooks/streaming/useError'
import { ChatMessage, DatabaseMessage } from './types'
import { savePrivateMessage, getPrivateMessages, updatePrivateMessage, clearPrivateChat } from './privateChat'

const KEEPALIVE_INTERVAL = 15000

export function useStreamingChat(threadId: string, isPrivateMode: boolean = false) {
  const { user } = useUser()
  const { createAbortController, disconnect } = useConnection()
  const { animationState, appendText, setTargetText, stopAnimation, resetAnimation, getTargetContent } = useAnimation()
  const { handleError } = useError()
  
  // Get conversation history from Convex (only for non-private mode)
  const messagesResult = useQuery(
    api.messages.listByThread, 
    threadId && !isPrivateMode ? { threadId } : 'skip'
  )
  const messages = useMemo(() => {
    return (messagesResult || []) as DatabaseMessage[]
  }, [messagesResult])
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingContent, setThinkingContent] = useState('')
  const currentThreadIdRef = useRef<string>(threadId)
  
  const createPlaceholder = useMutation(api.messages.createPlaceholder)
  const updateMessage = useMutation(api.messages.updateMessage)
  const deleteMessagesFromPoint = useMutation(api.messages.deleteMessagesFromPoint)
  
  const messageIdRef = useRef<Id<"messages"> | string | null>(null)
  const convexTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastConvexContent = useRef<string>('')
  
  // Add refs to prevent double streaming
  const streamingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Update current thread ID
  useEffect(() => {
    currentThreadIdRef.current = threadId
  }, [threadId])
  
  // Cleanup effect for private mode
  useEffect(() => {
    return () => {
      if (isPrivateMode && threadId) {
        // Clear private chat data when leaving
        clearPrivateChat(threadId)
      }
    }
  }, [isPrivateMode, threadId])
  
  // Build conversation history from Convex messages or localStorage
  const buildConversationHistory = useCallback((excludeStreamingMessages = true): ChatMessage[] => {
    let allMessages: DatabaseMessage[] = []
    
    if (isPrivateMode) {
      // Get messages from localStorage for private mode
      allMessages = getPrivateMessages(threadId)
    } else {
      // Get messages from Convex for normal mode
      allMessages = messages || []
    }
    
    if (allMessages.length === 0) return []
    
    return allMessages
      .filter(msg => {
        // Exclude streaming messages and thinking messages by default
        if (excludeStreamingMessages && msg.status === 'streaming') return false
        if (msg.metadata?.type === 'thinking') return false
        return true
      })
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(msg => ({
        role: msg.role as ChatMessage['role'],
        content: msg.content
      }))
  }, [messages, isPrivateMode, threadId])
  
  // IMPROVED: Better cleanup and reset when thread changes
  useEffect(() => {
    return () => {
      if (convexTimerRef.current) {
        clearTimeout(convexTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      streamingRef.current = false
      setIsThinking(false)
      setThinkingContent('')
      resetAnimation()
    }
  }, [threadId, resetAnimation])
  
  const updateConvex = useCallback(async () => {
    if (!messageIdRef.current || !getTargetContent() || isPrivateMode) return
    
    if (currentThreadIdRef.current !== threadId) {
      return
    }
    
    const content = getTargetContent()
    if (content === lastConvexContent.current) return
    
    try {
      await updateMessage({
        messageId: messageIdRef.current as Id<"messages">,
        content,
        status: 'streaming',
        metadata: {},
      })
      lastConvexContent.current = content
    } catch (error) {
      console.error('Convex update failed:', error)
    }
  }, [updateMessage, isPrivateMode, getTargetContent, threadId])

  const updatePrivateStorage = useCallback((content: string, status: 'streaming' | 'complete' = 'streaming') => {
    if (!isPrivateMode || !messageIdRef.current || !threadId) return
    
    updatePrivateMessage(threadId, messageIdRef.current.toString(), {
      content,
      status,
      metadata: status === 'complete' ? { completed: Date.now() } : {}
    })
  }, [isPrivateMode, threadId])

  // NEW: Create thinking message in chat
  const performThinkingInChat = useCallback(async (prompt: string, model: string) => {
    if (isThinking) {
      console.log('Already analyzing, skipping duplicate request')
      return ''
    }

    const provider = MODEL_PROVIDERS[model]
    if (!provider) {
      handleError(new Error(`Unknown model: ${model}`))
      return ''
    }

    setIsThinking(true)
    
    try {
      const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      
      // Create a thinking message
      const thinkingMessage: DatabaseMessage = {
        _id: crypto.randomUUID(),
        content: '🤔 **Thinking about your request...**\n\nAnalyzing what you need and how best to approach it.',
        role: 'assistant',
        createdAt: Date.now(),
        status: 'streaming',
        threadId,
        userId,
        _creationTime: Date.now(),
        metadata: { type: 'thinking', isThinking: true }
      }

      if (isPrivateMode) {
        savePrivateMessage(threadId, thinkingMessage)
      } else {
        await createPlaceholder({
          threadId,
          content: thinkingMessage.content,
          role: 'assistant',
          userId,
          createdAt: Date.now(),
          status: 'streaming',
          metadata: { type: 'thinking', isThinking: true }
        })
      }

      // Get API key (same logic as before)
      let apiKey: string | null = null
      let usePlatformKey = false

      const subscriptionResponse = await fetch('/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (subscriptionResponse.ok) {
        const { hasSubscription } = await subscriptionResponse.json()
        usePlatformKey = hasSubscription
      }

      if (usePlatformKey) {
        apiKey = 'platform-key-proxy'
      } else {
        const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}') as Record<string, { encryptedKey: string; iv: string }>
        if (!stored[provider]?.encryptedKey) {
          throw new Error(`Please add your ${provider} API key in Settings → API Keys or subscribe to use platform keys`)
        }

        const userIdForDecryption = user?.id || localStorage.getItem('sessionId') || 'anonymous'
        apiKey = await decryptApiKey(
          stored[provider].encryptedKey,
          stored[provider].iv,
          userIdForDecryption
        )
      }

      // Create analysis prompt
      const analysisPrompt = `Analyze this user request and think through how to approach it:

User Request: "${prompt}"

Please provide your thinking process:

1. **Understanding the Request**
   What exactly is the user asking for?

2. **Key Objectives** 
   What are their main goals or needs?

3. **Approach Strategy**
   How should I structure my response?

4. **Important Considerations**
   What key points, caveats, or context should I address?

5. **Response Plan**
   What will I focus on in my detailed answer?

Keep your analysis clear and well-structured. Be thorough but concise.`

      // Use the working analyze endpoint
      const response = await fetch('/api/thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: analysisPrompt,
          model,
          apiKey,
          usePlatformKey,
        }),
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`)
      }

      const result = await response.json()
      const analysis = result.content || 'Analysis completed.'
      
      // Update the thinking message with the full analysis
      const thinkingContent = `🤔 **My Thinking Process**

${analysis}

---
*Now I'll provide my detailed response based on this analysis...*`

      if (isPrivateMode) {
        updatePrivateMessage(threadId, thinkingMessage._id, {
          content: thinkingContent,
          status: 'complete',
          metadata: { type: 'thinking', isThinking: false, analysis: true }
        })
      } else {
        await updateMessage({
          messageId: thinkingMessage._id as Id<"messages">,
          content: thinkingContent,
          status: 'complete',
          metadata: { type: 'thinking', isThinking: false, analysis: true }
        })
      }
      
      return analysis

    } catch (error: unknown) {
      console.error('Analysis error:', error)
      handleError(error)
      return ''
    } finally {
      setIsThinking(false)
    }
  }, [user, handleError, createPlaceholder, updateMessage, threadId, isPrivateMode, isThinking])

  const streamMessage = useCallback(async (
    prompt: string,
    model: string,
    options: {
      messageId?: string,
      isRegeneration?: boolean
    } = {}
  ) => {
    // CRITICAL: Prevent duplicate streaming
    if (streamingRef.current || isStreaming) {
      console.log('Already streaming, skipping duplicate request')
      return
    }
    
    const provider = MODEL_PROVIDERS[model]
    if (!provider) {
      handleError(new Error(`Unknown model: ${model}`))
      return
    }
    
    streamingRef.current = true
    setIsStreaming(true)
    
    // CRITICAL: Reset animation state at the start of each new stream
    resetAnimation()
    lastConvexContent.current = ''
    messageIdRef.current = null
    
    // Abort any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = createAbortController()
    abortControllerRef.current = controller
    
    try {
      // Check subscription status first
      let apiKey: string | null = null
      let usePlatformKey = false
      
      // Check if user has a subscription
      const subscriptionResponse = await fetch('/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (subscriptionResponse.ok) {
        const { hasSubscription } = await subscriptionResponse.json()
        usePlatformKey = hasSubscription
      }
      
      if (usePlatformKey) {
        // Use platform keys through a proxy endpoint
        // The actual key never goes to the client
        apiKey = 'platform-key-proxy'
      } else {
        // Use user's own API keys
        const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}') as Record<string, { encryptedKey: string; iv: string }>
        if (!stored[provider]?.encryptedKey) {
          handleError(new Error(`Please add your ${provider} API key in Settings → API Keys or subscribe to use platform keys`))
          setIsStreaming(false)
          streamingRef.current = false
          return
        }
        
        const userIdForDecryption = user?.id || localStorage.getItem('sessionId') || 'anonymous'
        apiKey = await decryptApiKey(
          stored[provider].encryptedKey,
          stored[provider].iv,
          userIdForDecryption
        )
      }
      
      // Add a small delay to prevent React StrictMode double-firing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Check if we were aborted during the delay
      if (controller.signal.aborted) {
        streamingRef.current = false
        setIsStreaming(false)
        return
      }
      
      const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      
      let assistantId: Id<"messages"> | string | null = null
      
      if (options.messageId) {
        assistantId = options.messageId
        messageIdRef.current = assistantId
      } else {
        // Create assistant message placeholder
        if (isPrivateMode) {
          // Create a mock message for private mode
          const mockAssistantMessage: DatabaseMessage = {
            _id: crypto.randomUUID(),
            content: '',
            role: 'assistant',
            createdAt: Date.now(),
            status: 'streaming',
            threadId,
            userId,
            _creationTime: Date.now(),
            model,
          }
          savePrivateMessage(threadId, mockAssistantMessage)
          assistantId = mockAssistantMessage._id
          messageIdRef.current = assistantId
        } else {
          assistantId = await createPlaceholder({
            threadId,
            content: '',
            role: 'assistant',
            userId,
            model,
            createdAt: Date.now(),
            status: 'streaming',
          })
          messageIdRef.current = assistantId
        }
      }
      
      // ENHANCED: Build full conversation history including the new user message
      const conversationHistory = buildConversationHistory(true)
      
      // Add the current user prompt to the conversation
      const fullConversation: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: prompt }
      ]
      
      console.log('Sending conversation with', fullConversation.length, 'messages to AI')
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          messageId: assistantId,
          messages: fullConversation, // Send full conversation instead of just prompt
          model,
          apiKey,
          usePlatformKey,
        }),
        signal: controller.signal,
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Stream failed: ${response.status} - ${errorText}`)
      }
      
      if (!response.body) {
        throw new Error('No response body')
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      // Set up periodic updates for Convex (only if not private mode)
      if (!isPrivateMode) {
        convexTimerRef.current = setInterval(updateConvex, 500)
      }
      
      let keepAliveInterval: NodeJS.Timeout | null = null
      
      try {
        let hasReceivedData = false
        let lastDataTime = Date.now()
        
        keepAliveInterval = setInterval(() => {
          const timeSinceLastData = Date.now() - lastDataTime
          if (timeSinceLastData > 30000 && isStreaming) {
            throw new Error('Connection timeout - no data received')
          }
        }, KEEPALIVE_INTERVAL)
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          // Check if we're still on the same thread
          if (currentThreadIdRef.current !== threadId) {
            throw new Error('Thread changed')
          }
          
          hasReceivedData = true
          lastDataTime = Date.now()
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
            
            const data = trimmedLine.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const event = JSON.parse(data) as { type: string; text?: string; error?: string; usage?: Record<string, unknown> }
              
              if (event.type === 'text') {
                appendText(event.text || '')
                // Update private storage in real-time
                if (isPrivateMode) {
                  updatePrivateStorage(getTargetContent() + (event.text || ''))
                }
              } else if (event.type === 'finish') {
                if (convexTimerRef.current) {
                  clearInterval(convexTimerRef.current)
                  convexTimerRef.current = null
                }
                
                if (event.text) {
                  setTargetText(event.text)
                }
                
                stopAnimation()
                
                const finalContent = event.text || getTargetContent()
                
                if (isPrivateMode && messageIdRef.current) {
                  updatePrivateMessage(threadId, messageIdRef.current.toString(), {
                    content: finalContent,
                    status: 'complete',
                    metadata: { usage: event.usage },
                  })
                } else if (!isPrivateMode && messageIdRef.current) {
                  await updateMessage({
                    messageId: messageIdRef.current as Id<"messages">,
                    content: finalContent,
                    status: 'complete',
                    metadata: { usage: event.usage },
                  })
                }
                
                break
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Stream error')
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e
              console.warn('Invalid JSON in stream:', data)
            }
          }
        }
        
        if (!hasReceivedData) {
          throw new Error('No data received from stream')
        }
        
      } finally {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
        }
        reader.releaseLock()
        if (convexTimerRef.current) {
          clearInterval(convexTimerRef.current)
          convexTimerRef.current = null
        }
      }
      
    } catch (error: unknown) {
      const streamError = error as { code?: string; name?: string; message?: string }
      
      // Silently handle abort errors - this is expected behavior when user cancels
      if (streamError.name === 'AbortError') {
        console.log('Stream cancelled by user')
      } else if (streamError.message === 'Thread changed') {
        console.log('Thread changed, stream cancelled')
      } else {
        // Handle other errors normally
        console.error('Streaming error:', error)
        
        const isConnectionError = 
          streamError.code === 'ECONNRESET' || 
          streamError.message?.includes('fetch')
        
        const errorMessage = isConnectionError
          ? 'Connection lost. Please check your internet and try again.'
          : streamError.message || 'Failed to generate response'
        
        if (messageIdRef.current && currentThreadIdRef.current === threadId) {
          const errorContent = getTargetContent() || 'Failed to generate response. Please try again.'
          
          try {
            if (isPrivateMode) {
              updatePrivateMessage(threadId, messageIdRef.current.toString(), {
                content: errorContent,
                status: 'error',
                metadata: { 
                  error: errorMessage,
                  code: streamError.code || 'UNKNOWN',
                  timestamp: Date.now()
                },
              })
            } else {
              await updateMessage({
                messageId: messageIdRef.current as Id<"messages">,
                content: errorContent,
                status: 'error',
                metadata: { 
                  error: errorMessage,
                  code: streamError.code || 'UNKNOWN',
                  timestamp: Date.now()
                },
              })
            }
          } catch (updateError) {
            console.error('Failed to update error state:', updateError)
          }
        }
        
        handleError(error, { retryable: isConnectionError })
      }
    } finally {
      streamingRef.current = false
      setIsStreaming(false)
      disconnect()
      stopAnimation()
      
      if (convexTimerRef.current) {
        clearInterval(convexTimerRef.current)
        convexTimerRef.current = null
      }
    }
  }, [
    threadId, 
    user, 
    createPlaceholder, 
    updateMessage, 
    handleError, 
    updateConvex, 
    isStreaming,
    isPrivateMode,
    createAbortController,
    disconnect,
    resetAnimation,
    appendText,
    setTargetText,
    stopAnimation,
    getTargetContent,
    buildConversationHistory,
    updatePrivateStorage
  ])

  // Research message sender that handles full conversation history with proper typing
  const streamResearchMessage = useCallback(async (
    messages: ChatMessage[],
    model: string
  ) => {
    // CRITICAL: Prevent duplicate streaming
    if (streamingRef.current || isStreaming) {
      console.log('Already streaming research, skipping duplicate request')
      return
    }
    
    const provider = MODEL_PROVIDERS[model]
    if (!provider) {
      handleError(new Error(`Unknown model: ${model}`))
      return
    }
    
    streamingRef.current = true
    setIsStreaming(true)
    
    // CRITICAL: Reset animation state at the start
    resetAnimation()
    lastConvexContent.current = ''
    messageIdRef.current = null
    
    // Abort any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = createAbortController()
    abortControllerRef.current = controller
    
    try {
      // Get API key (same logic as regular streaming)
      let apiKey: string | null = null
      let usePlatformKey = false
      
      const subscriptionResponse = await fetch('/api/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (subscriptionResponse.ok) {
        const { hasSubscription } = await subscriptionResponse.json()
        usePlatformKey = hasSubscription
      }
      
      if (usePlatformKey) {
        apiKey = 'platform-key-proxy'
      } else {
        const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}') as Record<string, { encryptedKey: string; iv: string }>
        if (!stored[provider]?.encryptedKey) {
          handleError(new Error(`Please add your ${provider} API key in Settings → API Keys or subscribe to use platform keys`))
          setIsStreaming(false)
          streamingRef.current = false
          return
        }
        
        const userIdForDecryption = user?.id || localStorage.getItem('sessionId') || 'anonymous'
        apiKey = await decryptApiKey(
          stored[provider].encryptedKey,
          stored[provider].iv,
          userIdForDecryption
        )
      }
      
      // Small delay to prevent double-firing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      if (controller.signal.aborted) {
        streamingRef.current = false
        setIsStreaming(false)
        return
      }
      
      const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      
      // Create assistant message for research response
      let assistantId: Id<"messages"> | string
      
      if (isPrivateMode) {
        const mockAssistantMessage: DatabaseMessage = {
          _id: crypto.randomUUID(),
          content: '',
          role: 'assistant',
          createdAt: Date.now(),
          status: 'streaming',
          threadId,
          userId,
          _creationTime: Date.now(),
          model,
          metadata: { research: true }
        }
        savePrivateMessage(threadId, mockAssistantMessage)
        assistantId = mockAssistantMessage._id
      } else {
        assistantId = await createPlaceholder({
          threadId,
          content: '',
          role: 'assistant',
          userId,
          model,
          createdAt: Date.now(),
          status: 'streaming',
          metadata: { research: true }, // Mark as research response
        })
      }
      
      messageIdRef.current = assistantId
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          messageId: assistantId,
          messages, // Send full conversation history instead of single prompt
          model,
          apiKey,
          usePlatformKey,
        }),
        signal: controller.signal,
      })
      
      // Handle streaming response (same as regular streaming)
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Stream failed: ${response.status} - ${errorText}`)
      }
      
      if (!response.body) {
        throw new Error('No response body')
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      if (!isPrivateMode) {
        convexTimerRef.current = setInterval(updateConvex, 500)
      }
      
      let keepAliveInterval: NodeJS.Timeout | null = null
      
      try {
        let hasReceivedData = false
        let lastDataTime = Date.now()
        
        keepAliveInterval = setInterval(() => {
          const timeSinceLastData = Date.now() - lastDataTime
          if (timeSinceLastData > 30000 && isStreaming) {
            throw new Error('Connection timeout - no data received')
          }
        }, KEEPALIVE_INTERVAL)
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          if (currentThreadIdRef.current !== threadId) {
            throw new Error('Thread changed')
          }
          
          hasReceivedData = true
          lastDataTime = Date.now()
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
            
            const data = trimmedLine.slice(6)
            if (data === '[DONE]') continue
            
            try {
              const event = JSON.parse(data) as { type: string; text?: string; error?: string; usage?: Record<string, unknown> }
              
              if (event.type === 'text') {
                appendText(event.text || '')
                if (isPrivateMode) {
                  updatePrivateStorage(getTargetContent() + (event.text || ''))
                }
              } else if (event.type === 'finish') {
                if (convexTimerRef.current) {
                  clearInterval(convexTimerRef.current)
                  convexTimerRef.current = null
                }
                
                if (event.text) {
                  setTargetText(event.text)
                }
                
                stopAnimation()
                
                const finalContent = event.text || getTargetContent()
                
                if (isPrivateMode) {
                  updatePrivateMessage(threadId, assistantId.toString(), {
                    content: finalContent,
                    status: 'complete',
                    metadata: { usage: event.usage, research: true },
                  })
                } else {
                  await updateMessage({
                    messageId: assistantId as Id<"messages">,
                    content: finalContent,
                    status: 'complete',
                    metadata: { usage: event.usage, research: true },
                  })
                }
                
                break
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Stream error')
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) throw e
              console.warn('Invalid JSON in stream:', data)
            }
          }
        }
        
        if (!hasReceivedData) {
          throw new Error('No data received from stream')
        }
        
      } finally {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
        }
        reader.releaseLock()
        if (convexTimerRef.current) {
          clearInterval(convexTimerRef.current)
          convexTimerRef.current = null
        }
      }
      
    } catch (error: unknown) {
      const streamError = error as { code?: string; name?: string; message?: string }
      
      if (streamError.name === 'AbortError') {
        console.log('Research stream cancelled by user')
      } else if (streamError.message === 'Thread changed') {
        console.log('Thread changed, research stream cancelled')
      } else {
        console.error('Research streaming error:', error)
        handleError(error)
      }
    } finally {
      streamingRef.current = false
      setIsStreaming(false)
      disconnect()
      stopAnimation()
      
      if (convexTimerRef.current) {
        clearInterval(convexTimerRef.current)
        convexTimerRef.current = null
      }
    }
  }, [
    threadId, 
    user, 
    createPlaceholder, 
    updateMessage, 
    handleError, 
    updateConvex, 
    isStreaming,
    isPrivateMode,
    createAbortController,
    disconnect,
    resetAnimation,
    appendText,
    setTargetText,
    stopAnimation,
    getTargetContent,
    updatePrivateStorage
  ])

  const sendMessage = useCallback(async (prompt: string, model: string) => {
    // For private mode, save the user message first
    if (isPrivateMode) {
      const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      const userMessage: DatabaseMessage = {
        _id: crypto.randomUUID(),
        content: prompt,
        role: 'user',
        createdAt: Date.now(),
        status: 'complete',
        threadId,
        userId,
        _creationTime: Date.now(),
      }
      savePrivateMessage(threadId, userMessage)
    }
    
    await streamMessage(prompt, model)
  }, [streamMessage, isPrivateMode, threadId, user])

  const sendResearchMessage = useCallback(async (messages: ChatMessage[], model: string) => {
    await streamResearchMessage(messages, model)
  }, [streamResearchMessage])

  const performThinking = useCallback(async (prompt: string, model: string) => {
    return await performThinkingInChat(prompt, model)
  }, [performThinkingInChat])

  const regenerateMessage = useCallback(async (
    messageId: string, 
    prompt: string, 
    model: string
  ) => {
    if (isStreaming || isPrivateMode) return
    
    try {
      await deleteMessagesFromPoint({
        threadId,
        fromMessageId: messageId as Id<"messages">,
        includeFromMessage: true,
      })
      
      await streamMessage(prompt, model, { isRegeneration: true })
      
    } catch (error) {
      handleError(error)
    }
  }, [threadId, deleteMessagesFromPoint, streamMessage, handleError, isStreaming, isPrivateMode])

  const freezeStream = useCallback(() => {
    if (!isStreaming) return
    
    try {
      disconnect()
      stopAnimation()
      
      if (convexTimerRef.current) {
        clearInterval(convexTimerRef.current)
        convexTimerRef.current = null
      }
      
      const currentContent = animationState.animatedText || getTargetContent()
      if (currentContent && messageIdRef.current) {
        if (isPrivateMode) {
          updatePrivateMessage(threadId, messageIdRef.current.toString(), {
            content: currentContent,
            status: 'complete',
            metadata: { cancelled: true, timestamp: Date.now() },
          })
        } else {
          updateMessage({
            messageId: messageIdRef.current as Id<"messages">,
            content: currentContent,
            status: 'complete',
            metadata: { cancelled: true, timestamp: Date.now() },
          }).catch(error => {
            console.error('Failed to save cancelled message:', error)
          })
        }
      }
    } catch (error) {
      console.log('Error during stream cancellation:', error)
    } finally {
      streamingRef.current = false
      setIsStreaming(false)
      resetAnimation()
    }
  }, [
    isStreaming, 
    disconnect, 
    stopAnimation, 
    updateMessage, 
    isPrivateMode, 
    animationState.animatedText,
    getTargetContent,
    resetAnimation,
    threadId
  ])

  const stopThinking = useCallback(() => {
    setIsThinking(false)
    setThinkingContent('')
  }, [])

  return { 
    sendMessage, 
    sendResearchMessage,
    regenerateMessage, 
    isStreaming, 
    streamingContent: animationState.animatedText, 
    freezeStream,
    // Thinking exports
    performThinking,
    isThinking,
    thinkingContent,
    stopThinking
  }
}
// components/MessageList.tsx
"use client"

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { MarkdownRenderer } from './MarkdownRenderer'
import { MessageActions } from './MessageActions'
import { SearchResults } from './SearchResults'
import { FileAttachmentDisplay } from './FileAttachment'
import { ImageModal } from './ImageModal'
import { ImageGenerationLoading } from './ImageGenerationLoading'
import { useToast } from '@/components/Toast'
import { ChatMessage, SearchResult, SearchSession, DatabaseMessage } from '@/lib/types'
import { getPrivateMessages } from '@/lib/privateChat'
import Image from 'next/image'

interface MessageListProps {
  threadId: string
  streamingContent: string
  onRegenerateFromMessage?: (messageId: string, prompt: string, model: string) => void
  onEditUserMessage?: (messageId: string, newContent: string) => void
  onModifyMessage?: (messageId: string, newContent: string) => void
  isResearchMode?: boolean
  selectedModel?: string
  sendResearchMessage?: (messages: ChatMessage[], model: string) => Promise<void>
  isPrivateMode?: boolean
}

interface ParsedMessage {
  textContent: string
  files: Array<{
    name: string
    content: string
    size: number
  }>
  hasAttachments: boolean
}

// Enhanced message content parser
function parseMessageContent(content: string): ParsedMessage {
  const fileRegex = /\[File: ([^\]]+)\]\n([^]*?)(?=\n\[File:|$)/g
  const files: Array<{name: string, content: string, size: number}> = []
  let textContent = content
  
  let match
  while ((match = fileRegex.exec(content)) !== null) {
    const fileName = match[1]
    const fileContent = match[2].trim()
    files.push({
      name: fileName,
      content: fileContent,
      size: fileContent.length
    })
  }
  
  // Remove file content from display text but keep user's message
  if (files.length > 0) {
    textContent = content.replace(fileRegex, '').trim()
    // Remove extra newlines
    textContent = textContent.replace(/\n{3,}/g, '\n\n')
  }
  
  return { 
    textContent, 
    files, 
    hasAttachments: files.length > 0 
  }
}

// Enhanced image detection for better display
function isImageGenerationContent(content: string): boolean {
  return content.includes('🎨') && 
         (content.includes('Generated Image') || content.includes('Generating image'))
}

function isImageGenerating(content: string): boolean {
  return content.includes('🎨') && 
         content.includes('Generating image') && 
         !content.includes('![Generated Image]')
}

function parseImageContent(content: string) {
  const imageUrlMatch = content.match(/!\[Generated Image\]\(([^)]+)\)/)
  const promptMatch = content.match(/\*\*Prompt:\*\* "([^"]+)"/)
  const revisedPromptMatch = content.match(/\*\*DALL-E Enhanced Prompt:\*\* "([^"]+)"/)
  const timeMatch = content.match(/\*Generated with DALL-E 3 • ([^*]+)\*/)
  
  return {
    imageUrl: imageUrlMatch?.[1] || '',
    originalPrompt: promptMatch?.[1] || '',
    revisedPrompt: revisedPromptMatch?.[1] || '',
    generatedTime: timeMatch?.[1] || ''
  }
}

export function MessageList({ 
  threadId, 
  streamingContent, 
  onRegenerateFromMessage,
  onEditUserMessage,
  onModifyMessage,
  isResearchMode = false,
  selectedModel = 'claude-3.5-sonnet',
  sendResearchMessage,
  isPrivateMode = false
}: MessageListProps) {
  const messagesResult = useQuery(
    api.messages.listByThread, 
    threadId && !isPrivateMode ? { threadId } : 'skip'
  )
  const updateMessage = useMutation(api.messages.updateMessage)
  const createBranch = useMutation(api.threads.cloneToBranch)
  const { user } = useUser()
  const router = useRouter()
  const { show } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [isEditingSaving, setIsEditingSaving] = useState(false)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Image modal state
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; imageUrl: string; alt: string }>({
    isOpen: false,
    imageUrl: '',
    alt: ''
  })
  
  // Research mode state management with proper typing
  const [searchSessions, setSearchSessions] = useState<Map<string, SearchSession>>(new Map())
  
  // Track processed messages and previous thread for proper cleanup
  const processedMessageIds = useRef<Set<string>>(new Set())
  const previousThreadRef = useRef<string>(threadId)
  
  // FIXED: Track if we're currently in a search session to prevent showing old content
  const [isActivelySearching, setIsActivelySearching] = useState(false)
  
  // Add state to force re-renders for private mode when localStorage changes
  const [privateUpdateCounter, setPrivateUpdateCounter] = useState(0)
  
  // Listen for private message updates
  useEffect(() => {
    if (!isPrivateMode) return
    
    const handlePrivateUpdate = () => {
      setPrivateUpdateCounter(prev => prev + 1)
    }
    
    window.addEventListener('privateMessageUpdate', handlePrivateUpdate)
    
    return () => {
      window.removeEventListener('privateMessageUpdate', handlePrivateUpdate)
    }
  }, [isPrivateMode])
  
  // Get messages based on mode
  const messages = useMemo(() => {
    if (isPrivateMode) {
      return getPrivateMessages(threadId)
    }
    return (messagesResult || []) as DatabaseMessage[]
  }, [messagesResult, isPrivateMode, threadId])

  // Force re-render when private messages update
  useEffect(() => {
    // This effect runs when privateUpdateCounter changes
    // The dependency is intentionally included to trigger re-renders
  }, [privateUpdateCounter])
  
  // FIXED: Better reset when thread changes
  useEffect(() => {
    const currentThread = threadId
    if (currentThread !== previousThreadRef.current) {
      console.log('Thread changed from', previousThreadRef.current, 'to', currentThread)
      
      // More thorough cleanup when thread changes
      setSearchSessions(new Map())
      processedMessageIds.current.clear()
      setIsActivelySearching(false)
      previousThreadRef.current = currentThread
    }
  }, [threadId])
  
  // FIXED: Better effect for processing research mode messages
  useEffect(() => {
    // CRITICAL: Only run this effect when research mode is actually enabled
    if (!isResearchMode || !messages.length || !sendResearchMessage) {
      return // Exit early if research mode is disabled
    }
    
    const lastMessage = messages[messages.length - 1]
    
    // Enhanced checking to prevent duplicate processing and race conditions
    if (lastMessage && 
        lastMessage.role === 'user' && 
        lastMessage.status === 'complete' &&
        !processedMessageIds.current.has(lastMessage._id) &&
        !searchSessions.has(lastMessage._id)) {
      
      // Check if this message was created specifically for research mode
      const isResearchModeMessage = lastMessage.metadata?.isResearchMode === true
      
      // Only process if it's truly a research mode message
      if (isResearchModeMessage) {
        // Mark as processed immediately to prevent duplicates
        processedMessageIds.current.add(lastMessage._id)
        
        console.log('Starting research for new message:', lastMessage._id, lastMessage.content.slice(0, 50))
        
        // Set actively searching state
        setIsActivelySearching(true)
        
        // Initialize search session for this message with unique timestamp
        setSearchSessions(prev => {
          const newMap = new Map(prev)
          newMap.set(lastMessage._id, {
            query: lastMessage.content,
            results: [],
            isSearching: true,
            isComplete: false,
            timestamp: Date.now(), // Unique timestamp for each search
            hasTriggeredAI: false
          })
          return newMap
        })
      }
    }
  }, [messages, isResearchMode, sendResearchMessage, searchSessions, threadId]) // Added threadId to dependencies
  
  // IMPROVED: Better search completion with race condition prevention
  const handleSearchComplete = useCallback(async (messageId: string, results: SearchResult[]) => {
    if (!sendResearchMessage) return
    
    // Prevent race conditions by checking current state
    const currentSession = searchSessions.get(messageId)
    if (!currentSession || currentSession.hasTriggeredAI) {
      console.log('AI already triggered for message:', messageId)
      return
    }
    
    console.log('Search completed for message:', messageId, 'results:', results.length)
    
    // Mark as triggered BEFORE making the API call to prevent race conditions
    setSearchSessions(prev => {
      const newMap = new Map(prev)
      const session = newMap.get(messageId)
      if (session) {
        newMap.set(messageId, {
          ...session,
          results,
          isSearching: false,
          isComplete: true,
          hasTriggeredAI: true // Critical: Set this before API call
        })
      }
      return newMap
    })
    
    // Get the current messages at time of search completion
    const currentMessages = messages.filter(m => m._id !== 'streaming-temp')
    const userMessage = currentMessages.find(m => m._id === messageId)
    if (!userMessage) {
      console.log('User message not found for ID:', messageId)
      setIsActivelySearching(false)
      return
    }
    
    // Build enhanced conversation with search context
    const searchContext = results.map(result => 
      `Source: ${result.title}\nURL: ${result.url}\nContent: ${result.description}`
    ).join('\n\n')
    
    const messageIndex = currentMessages.findIndex(m => m._id === messageId)
    const conversationHistory = currentMessages.slice(0, messageIndex + 1).map(msg => ({
      role: msg.role as ChatMessage['role'],
      content: msg.content
    }))
    
    // Add search context to the conversation (hidden from user)
    const enhancedHistory: ChatMessage[] = [
      ...conversationHistory.slice(0, -1), // All messages before the current user message
      {
        role: 'system' as const,
        content: `Here are relevant search results for the user's query:\n\n${searchContext}\n\nUse this information to provide a comprehensive and accurate response.`
      },
      {
        role: 'user' as const,
        content: userMessage.content // Keep original user message unchanged
      }
    ]
    
    console.log('Sending enhanced conversation to AI, history length:', enhancedHistory.length)
    
    // Clear the actively searching state before starting AI response
    setIsActivelySearching(false)
    
    // Send enhanced conversation to AI
    try {
      await sendResearchMessage(enhancedHistory, selectedModel)
    } catch (error) {
      console.error('Failed to send research message:', error)
      // Reset the hasTriggeredAI flag on error so user can retry
      setSearchSessions(prev => {
        const newMap = new Map(prev)
        const session = newMap.get(messageId)
        if (session) {
          newMap.set(messageId, {
            ...session,
            hasTriggeredAI: false
          })
        }
        return newMap
      })
      setIsActivelySearching(false)
    }
  }, [messages, sendResearchMessage, selectedModel, searchSessions])
  
  // FIXED: Create the final message list with proper streaming content handling
  const allMessages = useMemo(() => {
    if (!messages) return []
    
    // CRITICAL: If we're actively searching, don't show any streaming content from previous sessions
    if (isActivelySearching) {
      return messages // Only show existing messages, no streaming content during search
    }
    
    // Find if we have a streaming message in the database
    const streamingMessageIndex = messages.findIndex(m => m.status === 'streaming')
    const hasStreamingMessage = streamingMessageIndex !== -1
    
    // If we have streaming content and not actively searching
    if (streamingContent && !isActivelySearching) {
      if (hasStreamingMessage) {
        // Update the existing streaming message with the latest content
        return messages.map((msg, index) => {
          if (index === streamingMessageIndex) {
            return { ...msg, content: streamingContent }
          }
          return msg
        })
      } else {
        // Only add a temporary message if we don't have one in the database yet
        const lastMessage = messages[messages.length - 1]
        const isLastMessageUser = lastMessage?.role === 'user'
        
        // Only add temporary streaming message if the last message was from user
        if (isLastMessageUser) {
          const streamingMessage: DatabaseMessage = {
            _id: 'streaming-temp' as Id<"messages">,
            content: streamingContent,
            role: 'assistant' as const,
            createdAt: Date.now(),
            status: 'streaming' as const,
            threadId,
            userId: 'system',
            _creationTime: Date.now(),
          }
          return [...messages, streamingMessage]
        }
      }
    }
    
    return messages
  }, [messages, streamingContent, threadId, isActivelySearching])
  
  useEffect(() => {
    if (streamingContent && autoScroll && !isActivelySearching) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingContent, autoScroll, isActivelySearching])
  
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setAutoScroll(isNearBottom)
  }, [])

  const handleCopyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }, [])

  // IMPROVED: Better regenerate handling with research mode detection
  const handleRegenerateMessage = useCallback((messageId: string) => {
    if (isPrivateMode) return // Disable regeneration in private mode
    
    const messageIndex = messages.findIndex(m => m._id === messageId)
    if (messageIndex === -1) return
    
    // Find the user message that triggered this assistant response
    let userMessage = null
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = messages[i]
        break
      }
    }
    
    if (userMessage && onRegenerateFromMessage) {
      const assistantMessage = messages[messageIndex]
      const model = assistantMessage.model || selectedModel
      
      // Check if original message was research mode
      const wasResearchMode = userMessage.metadata?.isResearchMode || 
                             assistantMessage.metadata?.research
      
      if (wasResearchMode && sendResearchMessage) {
        // Regenerate with research mode
        console.log('Regenerating with research mode for message:', messageId)
        
        // Clear existing search session for this user message
        setSearchSessions(prev => {
          const newMap = new Map(prev)
          newMap.delete(userMessage._id)
          return newMap
        })
        
        // Remove from processed to allow reprocessing
        processedMessageIds.current.delete(userMessage._id)
        
        // Delete the assistant message first
        onRegenerateFromMessage(messageId, userMessage.content, model)
        
        // Set actively searching state
        setIsActivelySearching(true)
        
        // Trigger research mode regeneration after a small delay
        setTimeout(() => {
          setSearchSessions(prev => {
            const newMap = new Map(prev)
            newMap.set(userMessage._id, {
              query: userMessage.content,
              results: [],
              isSearching: true,
              isComplete: false,
              timestamp: Date.now(),
              hasTriggeredAI: false
            })
            return newMap
          })
        }, 200)
      } else {
        // Normal regeneration
        onRegenerateFromMessage(messageId, userMessage.content, model)
      }
    }
  }, [messages, onRegenerateFromMessage, selectedModel, setSearchSessions, sendResearchMessage, isPrivateMode])

  const handleBranchMessage = useCallback(async (messageId: string) => {
    if (!threadId || isPrivateMode) return // Disable branching in private mode
    
    try {
      const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      
      // Call the backend to create the branch
      const result = await createBranch({
        threadId: threadId as Id<"threads">,
        messageId: messageId as Id<"messages">,
        sessionId: user?.id ? undefined : userId,
      })
      
      // Show success message
      show('success', 'Branch Created', `Created a new branch with ${result.messageCount} messages`, {
        actions: [
          {
            text: 'Open Branch',
            onClick: () => router.push(`/chat/${result.branchThreadId}`),
            style: 'primary'
          }
        ],
        duration: 6000
      })
      
    } catch (error) {
      console.error('Failed to create branch:', error)
      show('error', 'Branch Failed', 'Could not create branch. Please try again.')
    }
  }, [threadId, user, createBranch, show, router, isPrivateMode])

  const handleEditMessage = useCallback((messageId: string, content: string) => {
    if (isPrivateMode) return // Disable editing in private mode
    
    setEditingMessageId(messageId)
    setEditingContent(content)
    setTimeout(() => {
      editTextareaRef.current?.focus()
      editTextareaRef.current?.setSelectionRange(content.length, content.length)
    }, 50)
  }, [isPrivateMode])

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || isEditingSaving || !editingContent.trim() || isPrivateMode) return
    
    setIsEditingSaving(true)
    try {
      const editedMessage = messages.find(m => m._id === editingMessageId)
      
      if (editedMessage) {
        if (editedMessage.role === 'user') {
          if (onModifyMessage) {
            await onModifyMessage(editingMessageId, editingContent.trim())
          } else if (onEditUserMessage) {
            await onEditUserMessage(editingMessageId, editingContent.trim())
          }
        } else {
          await updateMessage({
            messageId: editingMessageId as Id<"messages">,
            content: editingContent.trim(),
            status: 'complete',
            metadata: { edited: true, editedAt: Date.now() },
          })
        }
      }
      
      setEditingMessageId(null)
      setEditingContent('')
    } catch (error) {
      console.error('Failed to update message:', error)
    } finally {
      setIsEditingSaving(false)
    }
  }, [
    editingMessageId, 
    editingContent, 
    messages, 
    updateMessage, 
    onEditUserMessage,
    onModifyMessage,
    isEditingSaving,
    isPrivateMode
  ])

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent('')
    setIsEditingSaving(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])
  
  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a chat to view messages</p>
      </div>
    )
  }
  
  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 min-h-0"
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="space-y-4 pb-4">
          {allMessages.map((message) => {
            const isUser = message.role === 'user'
            const isStreaming = message.status === 'streaming'
            const isEditing = editingMessageId === message._id
            const searchSession = searchSessions.get(message._id)
            
            // NEW: Check if this is a thinking message
            const isThinkingMessage = message.metadata?.type === 'thinking'
            
            // Skip rendering if this is a duplicate streaming message
            if (message._id === 'streaming-temp' && messages.some(m => m.status === 'streaming')) {
              return null
            }
            
            // Parse message content for files and attachments
            const { textContent, files, hasAttachments } = parseMessageContent(message.content)
            const isImageGeneration = isImageGenerationContent(message.content)
            
            return (
              <React.Fragment key={message._id}>
                {/* Regular message */}
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-animate group`}>
                  <div className={`${isUser ? 'max-w-[70%]' : 'max-w-[80%]'} min-w-0`}>
                    <div
                      className={`
                        ${isUser
                          ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                          : isThinkingMessage 
                            ? 'thinking-message text-gray-100'
                            : 'bg-white/[0.03] text-gray-100'
                        } 
                        rounded-2xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'} 
                        px-4 py-3 break-words overflow-hidden
                      `}
                    >
                      {isEditing ? (
                        <div className="w-full">
                          <div className="relative mb-4">
                            <div className="grid">
                              <div 
                                aria-hidden="true" 
                                className="bg-white/5 border border-white/10 p-3 leading-5 rounded-lg transition-colors whitespace-pre-wrap resize-none row-start-1 row-end-2 col-start-1 col-end-2 w-full pointer-events-none invisible"
                              >
                                {editingContent + ' '}
                              </div>
                              <textarea
                                ref={editTextareaRef}
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="bg-white/5 border border-white/10 p-3 leading-5 rounded-lg transition-colors hover:border-white/20 focus:border-white/30 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 whitespace-pre-wrap resize-none row-start-1 row-end-2 col-start-1 col-end-2 w-full"
                                placeholder="Edit message..."
                                disabled={isEditingSaving}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-gray-400 flex flex-row items-center gap-2 text-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true" className="shrink-0">
                                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,8,8,0,0,1,16,0v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z" />
                              </svg>
                              <div>
                                {onModifyMessage && isUser 
                                  ? 'Modifying this message will generate a new response' 
                                  : 'Editing this message will regenerate the response'
                                }
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={handleCancelEdit}
                                disabled={isEditingSaving}
                                className="inline-flex items-center justify-center relative shrink-0 select-none disabled:pointer-events-none disabled:opacity-50 text-gray-300 border border-white/10 overflow-hidden font-medium transition duration-100 hover:border-white/20 bg-transparent hover:bg-white/5 h-9 px-4 py-2 rounded-lg min-w-[5rem] active:scale-[0.985] whitespace-nowrap text-sm"
                                type="button"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={isEditingSaving || !editingContent.trim()}
                                className="inline-flex items-center justify-center relative shrink-0 select-none disabled:pointer-events-none disabled:opacity-50 bg-white text-gray-900 overflow-hidden font-medium transition duration-100 hover:bg-white/90 h-9 px-4 py-2 rounded-lg min-w-[5rem] active:scale-[0.985] whitespace-nowrap text-sm"
                                type="submit"
                              >
                                {isEditingSaving ? 'Saving...' : (onModifyMessage && isUser ? 'Modify' : 'Save')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isStreaming && message.content === '' ? (
                            <div className="flex space-x-1 py-2">
                              <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                              <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                              <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                          ) : isImageGenerating(message.content) ? (
                            // Show loading state for image generation
                            <ImageGenerationLoading 
                              prompt={message.content.replace('🎨 Generating image with DALL-E...', '').replace('Prompt: "', '').replace('"', '').trim()} 
                            />
                          ) : isImageGeneration ? (
                            // Enhanced compact image generation display
                            <div className="space-y-2">
                              {(() => {
                                const imageData = parseImageContent(message.content)
                                return (
                                  <>
                                    {/* Compact Header */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-md flex items-center justify-center">
                                        <span className="text-sm">🎨</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-white font-medium text-sm">Generated Image</div>
                                        <div className="text-gray-400 text-xs">
                                          DALL-E 3 {imageData.generatedTime && `• ${imageData.generatedTime}`}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Flexible Image Display */}
{imageData.imageUrl && (
  <div className="relative group">
    <div 
      className="relative rounded-xl overflow-hidden border border-white/8 shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-white/15 bg-gradient-to-br from-purple-500/3 to-pink-500/3 inline-block"
      onClick={() => setImageModal({
        isOpen: true,
        imageUrl: imageData.imageUrl,
        alt: 'Generated Image'
      })}
    >
      <Image 
        src={imageData.imageUrl} 
        alt="Generated Image" 
        className="block max-w-full h-auto rounded-xl"
        width={800}
        height={800}
        style={{ 
          minWidth: '200px',
          maxWidth: 'min(100%, 800px)',
          width: 'auto',
          height: 'auto'
        }}
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
      
      {/* Compact expand icon */}
      <div className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-300">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </div>

      {/* Compact click hint */}
      <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs">
        Click to enlarge
      </div>
    </div>
  </div>
)}
                                    
                                    {/* Compact Prompt Display */}
                                    {imageData.originalPrompt && (
                                      <div className="bg-white/3 rounded-lg p-2.5 border border-white/5 text-xs">
                                        <div className="text-purple-300/80 mb-1">Prompt</div>
                                        <div className="text-gray-300 leading-relaxed">&quot;{imageData.originalPrompt}&quot;</div>
                                        
                                        {imageData.revisedPrompt && imageData.revisedPrompt !== imageData.originalPrompt && (
                                          <div className="mt-2 pt-2 border-t border-white/5">
                                            <div className="text-purple-300/80 mb-1">DALL-E Enhanced</div>
                                            <div className="text-gray-300/80 leading-relaxed">&quot;{imageData.revisedPrompt}&quot;</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          ) : (
                            <div className="text-sm leading-relaxed">
                              {isUser ? (
                                <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                  {hasAttachments ? textContent || `Shared ${files.length} file${files.length > 1 ? 's' : ''}` : message.content}
                                </div>
                              ) : (
                                <MarkdownRenderer content={hasAttachments ? textContent : message.content} />
                              )}
                              {isStreaming && (
                                <span className="inline-block w-1 h-4 ml-1 bg-gray-400 animate-pulse align-text-bottom" />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Show file attachments */}
                    {hasAttachments && files.length > 0 && !isEditing && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-gray-500 font-medium">
                          {isUser ? 'Attached Files:' : 'Files in Message:'} ({files.length})
                        </div>
                        {files.map((file, index) => (
                          <FileAttachmentDisplay
                            key={`${message._id}-${index}`}
                            attachment={{
                              id: `${message._id}-${index}`,
                              name: file.name,
                              size: file.size,
                              type: 'text/plain',
                              content: file.content,
                              uploadedAt: message.createdAt
                            }}
                            showContent={true}
                          />
                        ))}
                      </div>
                    )}
                    
                    {!isEditing && !isStreaming && !isPrivateMode && (
                      <div className="mt-1">
                        <MessageActions
                          messageId={message._id}
                          content={message.content}
                          model={message.model}
                          isUser={isUser}
                          onCopy={handleCopyMessage}
                          onRegenerate={handleRegenerateMessage}
                          onBranch={handleBranchMessage}
                          onEdit={handleEditMessage}
                        />
                      </div>
                    )}
                    
                    {!isUser && !isStreaming && !isEditing && (
                      <span className="text-xs text-gray-500 px-1 mt-1 block">
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* FIXED: Show search results if they exist, regardless of current research mode state */}
                {searchSession && (searchSession.isComplete || searchSession.results.length > 0 || searchSession.isSearching) && (
                  <SearchResults 
                    query={searchSession.query}
                    isLoading={searchSession.isSearching}
                    results={searchSession.results}
                    isComplete={searchSession.isComplete}
                    onComplete={(results) => handleSearchComplete(message._id, results)}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
        <div ref={messagesEndRef} className="h-1" />
      </div>
      
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="fixed bottom-24 right-8 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg transition-all z-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        imageUrl={imageModal.imageUrl}
        alt={imageModal.alt}
        onClose={() => setImageModal({ isOpen: false, imageUrl: '', alt: '' })}
      />
    </div>
  )
}
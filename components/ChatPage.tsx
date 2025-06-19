// components/ChatPage.tsx
"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useStreamingChat } from '@/lib/useStreamingChat'
import { useImageGeneration } from '@/lib/useImageGeneration'
import { MessageList } from './MessageList'
import { ModelSelector } from '@/lib/dynamicComponents'
import { FileUpload, FileAttachment } from './FileUpload'
import { FileAttachmentDisplay } from './FileAttachment'
import { StreamingContext } from '@/contexts/StreamingContext'
import { useUser } from '@clerk/nextjs'

interface ChatPageProps {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
  isPrivateMode?: boolean
  setIsPrivateMode?: (isPrivate: boolean) => void
}

export function ChatPage({ 
  sidebarOpen = true, 
  setSidebarOpen, 
  isPrivateMode = false,
}: ChatPageProps) {
  const pathname = usePathname()
  const router = useRouter()
  const threadId = pathname?.split('/')[2] || ''
  const { user } = useUser()
  const [selectedModel, setSelectedModel] = useState('claude-3.5-sonnet')
  const [input, setInput] = useState('')
  const [isResearchMode, setIsResearchMode] = useState(false)
  const [isExtendedThinking] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [hasStartedConversation, setHasStartedConversation] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const plusMenuRef = useRef<HTMLDivElement>(null)
  const { setStreamingThread } = React.useContext(StreamingContext)
  const createThread = useMutation(api.threads.create)
  const createPlaceholder = useMutation(api.messages.createPlaceholder)
  
  const updateMessage = useMutation(api.messages.updateMessage)
  const deleteMessagesFromPoint = useMutation(api.messages.deleteMessagesFromPoint)
  const modifyMessageAndPrepareRegeneration = useMutation(api.messages.modifyMessageAndPrepareRegeneration)
  
  // Import the streaming chat hook with thinking functionality and private mode
  const { 
    sendMessage, 
    sendResearchMessage, 
    regenerateMessage, 
    isStreaming, 
    streamingContent, 
    freezeStream,
    performThinking,
    isThinking,
    stopThinking
  } = useStreamingChat(threadId, isPrivateMode)
  
  // Import image generation hook
  const { detectImageRequest, generateImage, isGenerating } = useImageGeneration(threadId)

  // Previous thread ID to detect changes
  const prevThreadIdRef = useRef<string>('')
  
  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Effect to handle thread changes and cleanup streaming
  useEffect(() => {
    if (prevThreadIdRef.current && prevThreadIdRef.current !== threadId) {
      // Thread changed, stop any ongoing streaming
      if (isStreaming) {
        freezeStream()
      }
      if (isThinking) {
        stopThinking()
      }
      // Clear attached files when changing threads
      setAttachedFiles([])
      setInput('')
    }
    prevThreadIdRef.current = threadId
  }, [threadId, isStreaming, isThinking, freezeStream, stopThinking])

  // Reset conversation started state when private mode changes
  useEffect(() => {
    if (!isPrivateMode) {
      setHasStartedConversation(false)
    }
  }, [isPrivateMode])
  
  // Set streaming state for current thread
  useEffect(() => {
    if (threadId) {
      setStreamingThread(threadId, isStreaming || isGenerating || isThinking)
    }
    return () => {
      if (threadId) {
        setStreamingThread(threadId, false)
      }
    }
  }, [threadId, isStreaming, isGenerating, isThinking, setStreamingThread])
  
  // Handle file drop processing
  const handleFileDrop = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      if (text.trim()) {
        const attachment: FileAttachment = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: text.trim(),
          uploadedAt: Date.now(),
        }
        setAttachedFiles(prev => [...prev, attachment])
      }
    } catch (error) {
      console.error('Error processing dropped file:', error)
    }
  }, [])
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide overlay if we're leaving the main container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      // Check if it's a text file
      const file = files[0]
      const isTextFile = (file: File): boolean => {
        const textTypes = ['text/', 'application/json', 'application/javascript']
        const textExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.xml', '.csv', '.json', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.sh', '.yml', '.yaml', '.toml', '.ini', '.conf', '.env']
        
        return textTypes.some(type => file.type.startsWith(type)) || 
               textExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      }
      
      if (isTextFile(file)) {
        handleFileDrop(file)
      }
    }
  }, [handleFileDrop])
  
  // Handle file attachment from upload modal
  const handleFileAttached = useCallback((attachment: FileAttachment) => {
    setAttachedFiles(prev => [...prev, attachment])
    setShowFileUpload(false)
  }, [])

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])
  
  // IMPROVED: Enhanced submit handling with inline thinking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming || isGenerating || isThinking) return
    
    let messageContent = input.trim()
    
    // Include file attachments in the message
    if (attachedFiles.length > 0) {
      const fileContents = attachedFiles.map(file => 
        `[File: ${file.name}]\n${file.content}`
      ).join('\n\n')
      
      if (messageContent) {
        messageContent = `${messageContent}\n\n${fileContents}`
      } else {
        messageContent = fileContents
      }
    }
    
    if (!messageContent) return
    
    // Mark conversation as started
    setHasStartedConversation(true)
    
    setInput('')
    setAttachedFiles([])
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    
    // Handle thread creation if needed (only for non-private mode)
    let currentThreadId = threadId
    if (!isPrivateMode && (!threadId || threadId === '/')) {
      const userId = user?.id || localStorage.getItem('sessionId') || crypto.randomUUID()

      if (!user?.id && !localStorage.getItem('sessionId')) {
        localStorage.setItem('sessionId', userId)
      }
      
      const newThreadId = await createThread({
        userId,
        title: 'New Chat',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      })
      
      currentThreadId = newThreadId
      router.push(`/chat/${newThreadId}`)
    }
    
    // Extended thinking mode - get analysis first (inline, no separate message)
    let analysis = ''
    if (isExtendedThinking) {
      analysis = await performThinking(messageContent, selectedModel)
    }
    
    // Check if this is an image generation request
    if (detectImageRequest(messageContent)) {
      try {
        await generateImage(messageContent)
      } catch (error) {
        console.error('Image generation failed:', error)
      }
      return
    }
    
    const userId = user?.id || localStorage.getItem('sessionId') || crypto.randomUUID()
    
    // Create user message for regular chat (only if not private mode)
    if (!isPrivateMode) {
      await createPlaceholder({
        threadId: currentThreadId,
        content: messageContent,
        role: 'user',
        userId,
        createdAt: Date.now(),
        status: 'complete',
        metadata: { 
          isResearchMode,
          hasAttachments: attachedFiles.length > 0,
          attachmentCount: attachedFiles.length,
          extendedThinking: isExtendedThinking,
          thinkingAnalysis: analysis // Store analysis in metadata
        },
      })
    }
    
    if (isResearchMode) {
      // Research mode: user message is shown, search will happen in MessageList
      console.log('Research mode: user message created, waiting for search...')
    } else {
      // Enhanced prompt with analysis if available
      let enhancedPrompt = messageContent
      if (analysis && isExtendedThinking) {
        enhancedPrompt = `User Request: ${messageContent}

My Analysis: ${analysis}

Based on this analysis, please provide a comprehensive response that addresses the user's actual needs and goals.`
      }

      if (currentThreadId === threadId) {
        await sendMessage(enhancedPrompt, selectedModel)
      } else {
        setTimeout(() => {
          sendMessage(enhancedPrompt, selectedModel)
        }, 100)
      }
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  const handleRegenerateFromMessage = useCallback(async (
    messageId: string, 
    prompt: string, 
    model: string
  ) => {
    if (isStreaming || isGenerating || isThinking) return
    await regenerateMessage(messageId, prompt, model)
  }, [isStreaming, isGenerating, isThinking, regenerateMessage])

  const handleEditUserMessage = useCallback(async (
    messageId: string, 
    newContent: string
  ) => {
    if (isStreaming || isGenerating || isThinking) return
    
    try {
      await updateMessage({
        messageId: messageId as Id<"messages">,
        content: newContent,
        status: 'complete',
        metadata: { edited: true, editedAt: Date.now() },
      })
      
      await deleteMessagesFromPoint({
        threadId: threadId,
        fromMessageId: messageId as Id<"messages">,
        includeFromMessage: false,
      })
      
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }, [isStreaming, isGenerating, isThinking, threadId, updateMessage, deleteMessagesFromPoint])

  const handleModifyMessage = useCallback(async (
    messageId: string, 
    newContent: string
  ) => {
    if (isStreaming || isGenerating || isThinking) return
    
    try {
      const result = await modifyMessageAndPrepareRegeneration({
        messageId: messageId as Id<"messages">,
        newContent: newContent,
      })
      
      if (result.modifiedMessage.role === 'user') {
        await regenerateMessage(
          result.modifiedMessage._idString, 
          result.modifiedMessage.content, 
          selectedModel
        )
      }
      
    } catch (error) {
      console.error('Failed to modify message:', error)
    }
  }, [isStreaming, isGenerating, isThinking, modifyMessageAndPrepareRegeneration, regenerateMessage, selectedModel])

  return (
    <div 
      className="flex-1 flex flex-col relative bg-black min-h-0 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Private Chat Indicator - Only show if not started conversation yet */}
      {isPrivateMode && !hasStartedConversation && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
          <div className="relative">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-purple-500/10 to-purple-500/5 rounded-3xl blur-xl animate-pulse"></div>
            
            {/* Main card */}
            <div 
              className="relative bg-gradient-to-br from-purple-900/20 via-purple-800/10 to-purple-700/20 backdrop-blur-2xl border border-purple-400/30 rounded-2xl px-8 py-6 shadow-2xl"
              style={{
                boxShadow: '0 25px 50px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {/* Floating particles */}
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-purple-400/60 rounded-full animate-ping"></div>
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-purple-300/40 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-purple-600/40 rounded-xl flex items-center justify-center border border-purple-400/20">
                    <svg className="w-6 h-6 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center border-2 border-purple-900/50">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="text-purple-100 font-semibold text-lg">Private Chat</div>
                  <div className="text-purple-300/90 text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                    This conversation is temporary and secure
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improved drag overlay positioned near input */}
      {isDragOver && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end justify-center pb-32">
          <div className="max-w-3xl w-full mx-4">
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-dashed border-purple-400/50 rounded-2xl p-8 text-center backdrop-blur-xl">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-2xl flex items-center justify-center animate-bounce">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" />
                </svg>
              </div>
              <div className="text-white text-xl font-semibold mb-2">Drop your file here</div>
              <div className="text-gray-300">Supports: TXT, MD, JSON, CSV, JS, TS, and more</div>
            </div>
          </div>
        </div>
      )}

      <header className="glass px-6 py-3 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <ModelSelector 
            selectedModel={selectedModel} 
            onModelChange={setSelectedModel} 
          />
        </div>
      </header>
            
      <div className="flex-1 overflow-hidden">
        <MessageList 
          threadId={threadId} 
          streamingContent={streamingContent}
          onRegenerateFromMessage={handleRegenerateFromMessage}
          onEditUserMessage={handleEditUserMessage}
          onModifyMessage={handleModifyMessage}
          isResearchMode={isResearchMode}
          selectedModel={selectedModel}
          sendResearchMessage={sendResearchMessage}
          isPrivateMode={isPrivateMode}
        />
      </div>

     
      
      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl max-w-lg w-full border border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Attach Text File</h2>
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <FileUpload 
                onFileAttached={handleFileAttached}
                disabled={isStreaming || isGenerating || isThinking}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        {/* Show attached files */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 max-w-3xl mx-auto">
            <div className="text-xs text-gray-500 mb-2 font-medium">
              Attached Files ({attachedFiles.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <FileAttachmentDisplay
                  key={file.id}
                  attachment={file}
                  onRemove={() => handleRemoveFile(file.id)}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Input Box - Original Colors */}
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col bg-white/[0.02] border border-white/10 mx-2 md:mx-0 items-stretch transition-all duration-200 relative shadow-[0_0.25rem_1.25rem_hsl(0_0%_0%/3.5%)] focus-within:shadow-[0_0.25rem_1.25rem_hsl(0_0%_0%/7.5%)] hover:border-white/20 focus-within:border-white/20 cursor-text z-10 rounded-2xl">
            <div className="flex flex-col gap-3.5 m-3.5">
              <div className="relative">
                <div aria-label="Write your prompt to Chxt" className="max-h-96 w-full overflow-y-auto break-words transition-opacity duration-200 min-h-[1.5rem]">
                  <textarea
                    ref={textareaRef}
                    placeholder="Reply to Chxt..."
                    className="w-full bg-transparent text-gray-100 focus:outline-none resize-none placeholder-gray-500 text-sm leading-relaxed border-none p-0 min-h-[1.5rem]"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming || isGenerating || isThinking}
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                  />
                </div>
              </div>
              
              <div className="flex gap-2.5 w-full items-center">
                <div className="relative flex-1 flex items-center gap-2 shrink min-w-0">
                  {/* Plus Menu */}
                  <div className="relative shrink-0" ref={plusMenuRef}>
                    <div>
                      <div className="flex items-center">
                        <div className="flex shrink-0">
                          <button
                            onClick={() => setShowPlusMenu(!showPlusMenu)}
                            className="inline-flex items-center justify-center relative shrink-0 select-none disabled:pointer-events-none disabled:opacity-50 border transition-all h-8 min-w-8 rounded-lg flex items-center px-[7.5px] group !pointer-events-auto !outline-offset-1 text-gray-400 border-white/10 active:scale-[0.98] hover:text-gray-200 hover:bg-white/5"
                            type="button"
                            disabled={isStreaming || isGenerating || isThinking}
                          >
                            <div className="flex flex-row items-center justify-center gap-1">
                              <div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                                  <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
                                </svg>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Plus Menu Dropdown */}
                    {showPlusMenu && (
                      <div className="absolute bottom-full mb-4 left-0 w-72 bg-black/80 backdrop-filter backdrop-blur-xl border border-white/10 transition-all duration-200 shadow-[0_0.25rem_1.25rem_hsl(0_0%_0%/3.5%)] hover:border-white/20 rounded-2xl z-50">
                        <div className="flex flex-col gap-2 m-3.5">
                          <button
                            onClick={() => {
                              setShowFileUpload(true)
                              setShowPlusMenu(false)
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-white/[0.04] rounded-xl transition-all duration-200 text-left group"
                          >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486z" />
                            </svg>
                            <div>
                              <div className="text-white text-sm font-medium">Upload File</div>
                              <div className="text-gray-500 text-xs">Attach documents, code, text files</div>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => {
                              setInput(prev => prev + "Generate an image of ")
                              setShowPlusMenu(false)
                              textareaRef.current?.focus()
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-white/[0.04] rounded-xl transition-all duration-200 text-left group"
                          >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <div>
                              <div className="text-white text-sm font-medium">Generate Image</div>
                              <div className="text-gray-500 text-xs">Create images with DALL-E</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Research Mode Toggle */}
                  <div className="flex shrink min-w-8 !shrink-0">
                    <button
                      onClick={() => setIsResearchMode(!isResearchMode)}
                      disabled={isStreaming || isGenerating || isThinking}
                      className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-xs flex items-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
                        isResearchMode 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30' 
                          : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border-white/10 hover:border-white/20'
                      }`}
                      type="button"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Research</span>
                      <span className="text-[10px] bg-current/20 px-1.5 py-0.5 rounded-md font-medium">
                        {isResearchMode ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* Extended Thinking Toggle - Better Design with Clock */}
                  <div className="flex shrink-0">
                    
                  </div>
                </div>

                {/* Enhanced Send Button - Larger & Prettier */}
                <div style={{ opacity: 1, transform: 'none' }}>
                  <div>
                    {(isStreaming || isGenerating || isThinking) ? (
                      <button 
                        onClick={() => {
                          if (isThinking) {
                            stopThinking()
                          } else {
                            freezeStream()
                          }
                        }}
                        className="inline-flex items-center justify-center relative shrink-0 select-none disabled:pointer-events-none disabled:opacity-50 bg-red-500/20 text-red-300 font-medium transition-all duration-200 hover:bg-red-500/30 hover:scale-105 active:scale-95 w-10 h-10 rounded-xl shadow-lg border border-red-500/30"
                        type="button"
                        aria-label="Stop generation"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                          <rect x="72" y="72" width="112" height="112" rx="12" />
                        </svg>
                      </button>
                    ) : (
                      <button 
                        onClick={handleSubmit}
                        disabled={(!input.trim() && attachedFiles.length === 0)}
                        className="inline-flex items-center justify-center relative shrink-0 select-none disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium transition-all duration-200 hover:from-blue-600 hover:to-purple-700 hover:scale-105 active:scale-95 w-10 h-10 rounded-xl shadow-lg hover:shadow-xl disabled:from-gray-600 disabled:to-gray-700"
                        type="button"
                        aria-label="Send message"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                          <path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
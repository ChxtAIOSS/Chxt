"use client"

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useToast } from '@/components/Toast'
import { EditThreadModal } from '@/components/EditThreadModal'
import { StreamingContext } from '@/contexts/StreamingContext'
import { useConfirm } from '@/hooks/useConfirm'

interface ThreadListProps {
  isPrivateMode?: boolean
}

export function ThreadList({ isPrivateMode = false }: ThreadListProps) {
  const { user } = useUser()
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null
  const threads = useQuery(api.threads.list, { 
    sessionId: user?.id ? undefined : sessionId || undefined 
  })
  const updateThreadTitle = useMutation(api.threads.updateTitle)
  const deleteThread = useMutation(api.threads.deleteThread)
  const router = useRouter()
  const pathname = usePathname()
  const { show: showToast } = useToast()
  const { streamingThreads } = React.useContext(StreamingContext)
  const { confirm, ConfirmDialog } = useConfirm()
  
  const [hoveredThread, setHoveredThread] = useState<string | null>(null)
  const [editingThread, setEditingThread] = useState<{ id: string; title: string } | null>(null)
  
  const currentThreadId = pathname?.startsWith('/chat/') 
    ? pathname.split('/')[2] 
    : null

  // Early return if in private mode
  if (isPrivateMode) {
    return (
      <>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-purple-300 font-medium">Private Mode</p>
          <p className="text-xs text-gray-500 mt-1">Your conversations are temporary</p>
          {currentThreadId && (
            <p className="text-xs text-gray-400 mt-2">Current chat is hidden while in private mode</p>
          )}
        </div>
        {ConfirmDialog}
      </>
    )
  }
  
  const handleEditName = (threadId: string, threadTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingThread({ id: threadId, title: threadTitle })
  }
  
  const handleSaveEdit = async (newTitle: string) => {
    if (!editingThread) return
    
    try {
      await updateThreadTitle({
        threadId: editingThread.id as Id<"threads">,
        title: newTitle,
        sessionId: user?.id ? undefined : sessionId || undefined,
      })
      showToast('success', 'Chat Renamed', 'The chat has been successfully renamed.')
      setEditingThread(null)
    } catch (error) {
      showToast('error', 'Rename Failed', 'Could not rename the chat. Please try again.')
      console.error('Failed to update thread title:', error)
    }
  }
  
  const handleDeleteChat = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    const confirmed = await confirm({
      type: 'danger',
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this chat? This action cannot be undone and all messages will be permanently lost.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    
    if (confirmed) {
      try {
        await deleteThread({ 
          threadId: threadId as Id<"threads">,
          sessionId: user?.id ? undefined : sessionId || undefined,
        })
        
        if (currentThreadId === threadId) {
          router.push('/')
        }
        
        showToast('success', 'Chat Deleted', 'The chat has been permanently deleted.', {
          actions: [
            { text: 'Dismiss', onClick: () => console.log('Dismiss'), style: 'secondary' }
          ]
        })
      } catch (error) {
        showToast('error', 'Delete Failed', 'Could not delete the chat. Please try again.')
        console.error('Failed to delete thread:', error)
      }
    }
  }
  
  if (!threads || threads.length === 0) {
    return (
      <>
        <div className="text-center py-8">
          <p className="text-xs text-gray-500">No chats yet</p>
        </div>
        {ConfirmDialog}
      </>
    )
  }
  
  return (
    <>
      <div className="space-y-4">
        <div>
          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Today</div>
          <div className="space-y-0.5 mt-1">
            {threads.map((thread: { 
              _id: string; 
              title: string; 
              parentThreadId?: string; 
              forkDepth?: number 
            }) => (
              <div
                key={thread._id}
                className="relative group"
                onMouseEnter={() => setHoveredThread(thread._id)}
                onMouseLeave={() => setHoveredThread(null)}
              >
                <button
                  onClick={() => router.push(`/chat/${thread._id}`)}
                  className={`chat-item w-full text-left px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    currentThreadId === thread._id ? 'active' : ''
                  } ${hoveredThread === thread._id ? 'pr-20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-200 truncate flex-1 flex items-center gap-2">
                      {/* Show branch indicator */}
                      {thread.parentThreadId && (
                        <div className="flex items-center gap-1 text-xs text-purple-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          {thread.forkDepth && thread.forkDepth > 1 && (
                            <span className="text-[10px]">L{thread.forkDepth}</span>
                          )}
                        </div>
                      )}
                      <span className="truncate">{thread.title}</span>
                    </div>
                    {streamingThreads.has(thread._id) && (
                      <div className="ml-2 flex items-center">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse animation-delay-200"></div>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse animation-delay-400"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
                
                {hoveredThread === thread._id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out">
                    <button
                      onClick={(e) => handleEditName(thread._id, thread.title, e)}
                      className="inline-flex items-center justify-center relative shrink-0 select-none text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-sm rounded-md h-7 w-7 transition-all duration-150 active:scale-95 group/edit"
                      title="Edit name"
                    >
                      <svg className="w-3.5 h-3.5 transition-transform group-hover/edit:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteChat(thread._id, e)}
                      className="inline-flex items-center justify-center relative shrink-0 select-none text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40 border backdrop-blur-sm rounded-md h-7 w-7 transition-all duration-150 active:scale-95 group/delete"
                      title="Delete chat"
                    >
                      <svg className="w-3.5 h-3.5 transition-transform group-hover/delete:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {editingThread && (
        <EditThreadModal
          isOpen={!!editingThread}
          threadName={editingThread.title}
          onSave={handleSaveEdit}
          onCancel={() => setEditingThread(null)}
        />
      )}
      
      {ConfirmDialog}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </>
  )
}
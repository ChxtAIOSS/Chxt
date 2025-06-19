// components/Layout.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ThreadList } from './ThreadList'
import { HomePage } from './HomePage'
import { ChatPage } from './ChatPage'
import ApiKeysPage from '@/app/ApiKeysPage'
import SettingsPage from '@/app/SettingsPage'
import { AuthModal } from '@/components/AuthModal'
import { ShareModal } from './ShareModal'
import { PrivateChatToggle } from './PrivateChatToggle'
import { useAutoThreadNaming } from '@/hooks/useAutoThreadNaming'
import { AccountDropdown } from './AccountDropdown'

const SIDEBAR_STATE_KEY = 'chxt_sidebar_open'

export function Layout() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useUser()
  const createThread = useMutation(api.threads.create)
  const deleteThread = useMutation(api.threads.deleteThread)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isPrivateMode, setIsPrivateMode] = useState(false)
  const [deletedThreadData, setDeletedThreadData] = useState<{title: string, url: string} | null>(null)
  
  // Initialize sidebar state from localStorage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDEBAR_STATE_KEY)
      return saved !== null ? saved === 'true' : true
    }
    return true
  })
  
  useAutoThreadNaming()
  
  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen))
  }, [sidebarOpen])
  
  // Check if we're on a chat page and get thread info
  const isOnChatPage = pathname?.startsWith('/chat/') && pathname !== '/chat/'
  const currentThreadId = isOnChatPage ? pathname?.split('/')[2] : null
  
  // Get current thread data for the title
  const currentThread = useQuery(
    api.threads.get, 
    currentThreadId ? { id: currentThreadId } : 'skip'
  )
  
  // Check if current thread has messages (only for non-private mode)
  const currentThreadMessages = useQuery(
    api.messages.listByThread, 
    currentThreadId && !isPrivateMode ? { threadId: currentThreadId } : 'skip'
  )
  const hasMessages = currentThreadMessages && currentThreadMessages.length > 0

  // Handle private mode toggle - DELETE thread when enabling, RECREATE when disabling
  const handlePrivateModeToggle = async (newPrivateMode: boolean) => {
    setIsPrivateMode(newPrivateMode)
    
    if (newPrivateMode && isOnChatPage && currentThreadId && currentThread) {
      // ENABLING private mode: Delete the current thread and store its data
      setDeletedThreadData({
        title: currentThread.title || 'New Chat',
        url: pathname || ''
      })
      
      try {
        await deleteThread({ 
          threadId: currentThreadId as Id<"threads">,
          sessionId: user?.id ? undefined : (typeof window !== 'undefined' ? localStorage.getItem('sessionId') : null) || undefined,
        })
      } catch (error) {
        console.error('Failed to delete thread when switching to private mode:', error)
      }
    } else if (!newPrivateMode && deletedThreadData && isOnChatPage) {
      // DISABLING private mode: Recreate the thread
      try {
        const userId = user?.id || localStorage.getItem('sessionId') || crypto.randomUUID()
        
        if (!user?.id && !localStorage.getItem('sessionId')) {
          localStorage.setItem('sessionId', userId)
        }
        
        const newThreadId = await createThread({
          userId,
          title: deletedThreadData.title,
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
        })
        
        // Navigate to the new thread to maintain the same URL structure
        router.push(`/chat/${newThreadId}`)
        
        // Clear the deleted thread data
        setDeletedThreadData(null)
      } catch (error) {
        console.error('Failed to recreate thread when disabling private mode:', error)
      }
    }
  }
  
  // Reset private mode when navigating away from chat
  useEffect(() => {
    if (!isOnChatPage && isPrivateMode) {
      setIsPrivateMode(false)
      setDeletedThreadData(null)
    }
  }, [isOnChatPage, isPrivateMode])
  
  // Generate share URL and title
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = currentThread?.title && currentThread.title !== 'New Chat' 
    ? `Check out "${currentThread.title}" on Chxt` 
    : 'Check out this chat on Chxt'
  
  const handleNewChat = async () => {
    const userId = user?.id || localStorage.getItem('sessionId') || crypto.randomUUID()
    
    if (!user?.id && !localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', userId)
    }
    
    const threadId = await createThread({
      userId,
      title: 'New Chat',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    })
    
    router.push(`/chat/${threadId}`)
  }

  const renderContent = () => {
    if (pathname === '/api-keys') {
      return <ApiKeysPage />
    } else if (pathname === '/settings') {
      return <SettingsPage />
    } else if (pathname?.startsWith('/chat/')) {
      return <ChatPage 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        isPrivateMode={isPrivateMode}
        setIsPrivateMode={setIsPrivateMode}
      />
    } else {
      return <HomePage />
    }
  }
  
  return (
    <div className="flex h-screen bg-background text-foreground relative">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} glass border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/')}
                className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg hover:shadow-purple-500/25 hover:scale-105 transition-all duration-200"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </button>
              <span className="font-semibold text-lg">Chxt</span>
            </div>
          </div>
          
          <button 
            onClick={handleNewChat}
            className="w-full btn-primary py-2.5 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 text-sm hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="p-4 pb-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-white/5 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:bg-white/8 transition-colors placeholder-gray-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <ThreadList />
        </div>
        
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 text-sm font-medium text-gray-300 hover:text-white"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97L2.46 14.6c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.31.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
            Settings
          </button>
        </div>
      </aside>
      
      <main className={`flex-1 flex flex-col bg-background relative transition-all duration-300`}>
        {/* Universal Sidebar Toggle Button - Always visible outside sidebar */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 hover:scale-105 glass border border-white/10 group relative"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className={`text-gray-400 hover:text-gray-200 transition-colors ${!sidebarOpen ? 'rotate-180' : ''}`}
            >
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="M9 3v18"></path>
            </svg>
            
            {/* Inline Tooltip */}
            <div 
              className={`absolute top-full mt-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${
                sidebarOpen 
                  ? 'left-1/2 -translate-x-1/2 whitespace-nowrap' 
                  : 'left-0 text-center'
              }`}
              style={{ minWidth: sidebarOpen ? 'auto' : '48px', lineHeight: '1.3' }}
            >
              {sidebarOpen ? 'Hide sidebar' : (
                <>
                  Show<br />sidebar
                </>
              )}
            </div>
          </button>
        </div>

        {/* Top right buttons container */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          {/* Private Chat Button - Only visible on chat pages and before first message */}
          {isOnChatPage && (
            <PrivateChatToggle 
              isPrivate={isPrivateMode}
              onToggle={handlePrivateModeToggle}
              disabled={hasMessages || false}
            />
          )}
          
          {/* Share Chat Button - Only visible on chat pages and not in private mode */}
          {isOnChatPage && !isPrivateMode && (
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-all duration-200 hover:scale-105 glass border border-white/10 group relative"
            >
              <svg 
                className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" 
                />
              </svg>
              
              {/* Inline Tooltip */}
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Share this chat
              </div>
            </button>
          )}
          
          {/* User Account or Sign In */}
          {user ? (
            <AccountDropdown />
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
            >
              Sign In
            </button>
          )}
        </div>
          
        {renderContent()}
      </main>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        chatUrl={shareUrl}
        chatTitle={shareTitle}
      />
    </div>
  )
}
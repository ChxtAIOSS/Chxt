"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface Session {
  user: {
    id: string
    email?: string
    name?: string
    imageUrl?: string
  } | null
  sessionId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  preferences: {
    theme: 'light' | 'dark' | 'system'
    model: string
    hidePersonalInfo: boolean
  }
}

interface SessionContextValue extends Session {
  updatePreferences: (prefs: Partial<Session['preferences']>) => void
  clearSession: () => void
  getUserId: () => string
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

const DEFAULT_PREFERENCES: Session['preferences'] = {
  theme: 'system',
  model: 'claude-3.5-sonnet',
  hidePersonalInfo: false,
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const migrateSession = useMutation(api.sessions.migrateSessionToUser)
  
  const [session, setSession] = useState<Session>({
    user: null,
    sessionId: null,
    isLoading: true,
    isAuthenticated: false,
    preferences: DEFAULT_PREFERENCES,
  })

  // Initialize session ID
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    let sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('sessionId', sessionId)
    }
    
    setSession(prev => ({ ...prev, sessionId }))
  }, [])

  // Sync with Clerk
  useEffect(() => {
    if (!isLoaded) return

    if (clerkUser) {
      setSession(prev => ({
        ...prev,
        user: {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          name: clerkUser.fullName || clerkUser.firstName || undefined,
          imageUrl: clerkUser.imageUrl,
        },
        isAuthenticated: true,
        isLoading: false,
      }))

      // Migrate anonymous session data
      const sessionId = localStorage.getItem('sessionId')
      if (sessionId) {
        const migrationKey = `migrated-${clerkUser.id}-${sessionId}`
        const hasMigrated = localStorage.getItem(migrationKey)
        
        if (!hasMigrated) {
          migrateSession({ sessionId, userId: clerkUser.id })
            .then(() => {
              localStorage.setItem(migrationKey, 'true')
            })
            .catch(console.error)
        }
      }

      // Load user preferences
      const savedPrefs = localStorage.getItem(`preferences-${clerkUser.id}`)
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs)
          setSession(prev => ({
            ...prev,
            preferences: { ...DEFAULT_PREFERENCES, ...prefs },
          }))
        } catch (error) {
          console.error('Failed to load preferences:', error)
        }
      }
    } else {
      setSession(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }))

      // Load anonymous preferences
      const savedPrefs = localStorage.getItem('preferences-anonymous')
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs)
          setSession(prev => ({
            ...prev,
            preferences: { ...DEFAULT_PREFERENCES, ...prefs },
          }))
        } catch (error) {
          console.error('Failed to load preferences:', error)
        }
      }
    }
  }, [clerkUser, isLoaded, migrateSession])

  const updatePreferences = useCallback((prefs: Partial<Session['preferences']>) => {
    setSession(prev => {
      const newPrefs = { ...prev.preferences, ...prefs }
      
      // Save to localStorage
      const key = prev.user?.id ? `preferences-${prev.user.id}` : 'preferences-anonymous'
      localStorage.setItem(key, JSON.stringify(newPrefs))
      
      return {
        ...prev,
        preferences: newPrefs,
      }
    })
  }, [])

  const clearSession = useCallback(() => {
    // Keep session ID for anonymous usage
    const sessionId = localStorage.getItem('sessionId')
    
    setSession({
      user: null,
      sessionId,
      isLoading: false,
      isAuthenticated: false,
      preferences: DEFAULT_PREFERENCES,
    })
    
    // Clear user preferences but keep anonymous ones
    if (session.user?.id) {
      localStorage.removeItem(`preferences-${session.user.id}`)
    }
  }, [session.user?.id])

  const getUserId = useCallback(() => {
    return session.user?.id || session.sessionId || 'anonymous'
  }, [session.user?.id, session.sessionId])

  return (
    <SessionContext.Provider
      value={{
        ...session,
        updatePreferences,
        clearSession,
        getUserId,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
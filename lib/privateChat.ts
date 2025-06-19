// lib/privateChat.ts - Update to dispatch events
import { DatabaseMessage } from './types'

const PRIVATE_CHAT_KEY = 'chxt_private_chat'

interface PrivateChatData {
  threadId: string
  messages: DatabaseMessage[]
  lastUpdated: number
}

// Helper function to dispatch custom event
function dispatchPrivateUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('privateMessageUpdate'))
  }
}

export function savePrivateMessage(threadId: string, message: DatabaseMessage) {
  try {
    const data: PrivateChatData = {
      threadId,
      messages: [message],
      lastUpdated: Date.now()
    }
    
    const existing = getPrivateMessages(threadId)
    if (existing.length > 0) {
      data.messages = [...existing, message]
    }
    
    localStorage.setItem(`${PRIVATE_CHAT_KEY}_${threadId}`, JSON.stringify(data))
    dispatchPrivateUpdate() // Dispatch event after saving
  } catch (error) {
    console.error('Failed to save private message:', error)
  }
}

export function getPrivateMessages(threadId: string): DatabaseMessage[] {
  try {
    const stored = localStorage.getItem(`${PRIVATE_CHAT_KEY}_${threadId}`)
    if (!stored) return []
    
    const data: PrivateChatData = JSON.parse(stored)
    return data.messages || []
  } catch (error) {
    console.error('Failed to get private messages:', error)
    return []
  }
}

export function updatePrivateMessage(threadId: string, messageId: string, updates: Partial<DatabaseMessage>) {
  try {
    const messages = getPrivateMessages(threadId)
    const updatedMessages = messages.map(msg => 
      msg._id === messageId ? { ...msg, ...updates } : msg
    )
    
    const data: PrivateChatData = {
      threadId,
      messages: updatedMessages,
      lastUpdated: Date.now()
    }
    
    localStorage.setItem(`${PRIVATE_CHAT_KEY}_${threadId}`, JSON.stringify(data))
    dispatchPrivateUpdate() // Dispatch event after updating
  } catch (error) {
    console.error('Failed to update private message:', error)
  }
}

export function clearPrivateChat(threadId: string) {
  try {
    localStorage.removeItem(`${PRIVATE_CHAT_KEY}_${threadId}`)
    dispatchPrivateUpdate() // Dispatch event after clearing
  } catch (error) {
    console.error('Failed to clear private chat:', error)
  }
}

export function clearAllPrivateChats() {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(PRIVATE_CHAT_KEY))
    keys.forEach(key => localStorage.removeItem(key))
    dispatchPrivateUpdate() // Dispatch event after clearing all
  } catch (error) {
    console.error('Failed to clear all private chats:', error)
  }
}
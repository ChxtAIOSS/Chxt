"use client"

import React, { useState, useRef, useEffect } from 'react'

interface EditMessageModalProps {
  isOpen: boolean
  content: string
  isUser?: boolean
  isSaving?: boolean
  onSave: (content: string) => void
  onCancel: () => void
  onModify?: boolean
}

export function EditMessageModal({ 
  isOpen, 
  content, 
  isUser = false, 
  isSaving = false, 
  onSave, 
  onCancel,
  onModify = false
}: EditMessageModalProps) {
  const [editedContent, setEditedContent] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditedContent(content)
  }, [content])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(content.length, content.length)
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isOpen, content])

  const handleSave = () => {
    if (editedContent.trim() && editedContent.trim() !== content.trim() && !isSaving) {
      onSave(editedContent.trim())
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  if (!isOpen) return null

  const getTitle = () => {
    if (isUser && onModify) return 'Modify Message'
    if (isUser) return 'Edit Message'
    return 'Edit Response'
  }

  const getButtonText = () => {
    if (isSaving) return 'Saving...'
    if (isUser && onModify) return 'Modify & Regenerate'
    return 'Save'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isUser ? 'bg-purple-600' : 'bg-gray-700'
            }`}>
              {isUser ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">{getTitle()}</h2>
          </div>
        </div>
        
        <div className="p-6">
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="w-full min-h-[120px] max-h-[400px] bg-white/5 rounded-xl p-4 text-white placeholder-gray-400 border border-white/10 focus:border-purple-500 focus:outline-none resize-none transition-all disabled:opacity-50"
            placeholder="Enter your message..."
          />
          <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
            <span>Ctrl + Enter to save, Escape to cancel</span>
            <span>{editedContent.length} characters</span>
          </div>
          
          {isUser && onModify && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400">
                ⚠️ Modifying this message will generate a new response
              </p>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editedContent.trim() || editedContent.trim() === content.trim() || isSaving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSaving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  )
}
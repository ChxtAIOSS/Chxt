"use client"

import React, { useState, useRef, useEffect } from 'react'

interface EditThreadModalProps {
  isOpen: boolean
  threadName: string
  onSave: (newName: string) => void
  onCancel: () => void
}

export function EditThreadModal({ isOpen, threadName, onSave, onCancel }: EditThreadModalProps) {
  const [editedName, setEditedName] = useState(threadName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditedName(threadName)
  }, [threadName])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  const handleSave = () => {
    if (editedName.trim() && editedName.trim() !== threadName) {
      onSave(editedName.trim())
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-white/10">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Rename Chat</h2>
        </div>
        
        <div className="p-6">
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-white/5 rounded-lg p-3 text-white placeholder-gray-400 border border-white/10 focus:border-purple-500 focus:outline-none"
            placeholder="Enter chat name..."
            maxLength={100}
          />
          <p className="text-xs text-gray-400 mt-2">
            Press Enter to save, Escape to cancel
          </p>
        </div>
        
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editedName.trim() || editedName.trim() === threadName}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
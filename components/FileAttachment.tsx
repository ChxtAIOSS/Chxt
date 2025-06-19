// components/FileAttachment.tsx
"use client"

import React from 'react'
import { FileAttachment } from './FileUpload'

interface FileAttachmentDisplayProps {
  attachment: FileAttachment
  onRemove?: () => void
  showContent?: boolean
  compact?: boolean
}

function getFileIcon(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  
  const iconMap: Record<string, string> = {
    'txt': '📄', 'md': '📝', 'markdown': '📝', 'csv': '📊', 'json': '🔧',
    'js': '⚡', 'jsx': '⚡', 'ts': '⚡', 'tsx': '⚡', 'css': '🎨',
    'html': '🌐', 'htm': '🌐', 'xml': '📋', 'sql': '🗄️', 'log': '📜',
    'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️', 'h': '⚙️',
    'php': '🐘', 'rb': '💎', 'go': '🐹', 'rs': '🦀', 'sh': '💻',
    'yml': '⚙️', 'yaml': '⚙️', 'toml': '🔧', 'ini': '⚙️', 'conf': '⚙️', 'env': '🔐'
  }
  
  return iconMap[ext] || '📄'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FileAttachmentDisplay({ 
  attachment, 
  onRemove, 
  showContent = false, 
  compact = false 
}: FileAttachmentDisplayProps) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-sm">
        <span className="text-lg">{getFileIcon(attachment.name)}</span>
        <span className="text-white font-medium truncate max-w-[200px]">{attachment.name}</span>
        <span className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
          >
            <svg className="w-3 h-3 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center text-lg">
            {getFileIcon(attachment.name)}
          </div>
          <div className="min-w-0">
            <div className="text-white font-medium truncate">{attachment.name}</div>
            <div className="text-gray-400 text-xs">
              {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {showContent && (
        <div className="border-t border-white/10 p-4 bg-black/20">
          <div className="text-xs text-gray-400 mb-2">File Content Preview:</div>
          <div className="max-h-40 overflow-y-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
              {attachment.content.slice(0, 500)}
              {attachment.content.length > 500 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
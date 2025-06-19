// components/FileUpload.tsx
"use client"

import React, { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/Toast'

// File types and utilities
const SUPPORTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'text/javascript': ['.js'],
  'text/typescript': ['.ts'],
  'text/jsx': ['.jsx'],
  'text/tsx': ['.tsx'],
  'text/css': ['.css'],
  'text/html': ['.html', '.htm'],
  'text/xml': ['.xml'],
  'application/sql': ['.sql'],
  'text/log': ['.log'],
  'application/x-python': ['.py'],
  'text/java': ['.java'],
  'text/cpp': ['.cpp', '.c', '.h'],
  'text/php': ['.php'],
  'text/ruby': ['.rb'],
  'text/go': ['.go'],
  'text/rust': ['.rs'],
  'application/x-sh': ['.sh'],
  'application/x-yaml': ['.yml', '.yaml'],
  'application/toml': ['.toml'],
  'text/ini': ['.ini', '.conf'],
  'application/x-env': ['.env'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function isTextFile(file: File): boolean {
  if (Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
    return true
  }
  
  const fileName = file.name.toLowerCase()
  const allExtensions = Object.values(SUPPORTED_FILE_TYPES).flat()
  return allExtensions.some(ext => fileName.endsWith(ext))
}

export interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  content: string
  uploadedAt: number
}

interface FileUploadProps {
  onFileAttached: (attachment: FileAttachment) => void
  disabled?: boolean
}

export function FileUpload({ onFileAttached, disabled = false }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { show } = useToast()
  
  const handleFile = useCallback(async (file: File) => {
    if (!file) return
    
    if (!isTextFile(file)) {
      show('error', 'Unsupported File Type', 
        'Only text files are supported. Please upload .txt, .md, .js, .py, .json, .csv, or other text-based files.')
      return
    }
    
    if (file.size > MAX_FILE_SIZE) {
      show('error', 'File Too Large', 
        `File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit.`)
      return
    }
    
    setIsUploading(true)
    
    try {
      const text = await file.text()
      
      if (!text.trim()) {
        show('warning', 'Empty File', 'The selected file appears to be empty.')
        return
      }
      
      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
        content: text.trim(),
        uploadedAt: Date.now(),
      }
      
      onFileAttached(attachment)
      show('success', 'File Attached', `Successfully attached ${file.name}`)
      
    } catch (error) {
      console.error('File processing error:', error)
      show('error', 'Upload Failed', 
        error instanceof Error ? error.message : 'Failed to process file')
    } finally {
      setIsUploading(false)
    }
  }, [onFileAttached, show])
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFile])
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])
  
  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])
  
  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])
  
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.sql,.log,.py,.java,.cpp,.c,.h,.php,.rb,.go,.rs,.sh,.yml,.yaml,.toml,.ini,.conf,.env"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${dragActive 
            ? 'border-purple-400 bg-purple-400/5 scale-[1.02]' 
            : 'border-white/20 hover:border-purple-400/50 hover:bg-white/[0.02]'
          }
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
        onClick={!disabled && !isUploading ? triggerFileSelect : undefined}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={!disabled && !isUploading ? handleDrop : undefined}
      >
        {/* Background gradient effect */}
        <div className={`
          absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
          bg-gradient-to-br from-purple-500/10 to-blue-500/10
          ${dragActive ? 'opacity-100' : ''}
        `} />
        
        {isUploading ? (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-white font-medium">Processing file...</div>
            <div className="text-sm text-gray-400">Extracting text content</div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${dragActive 
                ? 'bg-gradient-to-br from-purple-500/30 to-blue-500/30 scale-110' 
                : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'
              }
            `}>
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <div className="text-white font-medium text-lg">
                {dragActive ? 'Drop your file here' : 'Upload a text file'}
              </div>
              <div className="text-gray-400 text-sm">
                Drag & drop or click to select • Max 10MB
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <span className="text-xs text-gray-400">Supported:</span>
              <div className="flex items-center gap-1 text-xs">
                <span>📄 TXT</span>
                <span>📝 MD</span>
                <span>⚡ JS/TS</span>
                <span>🔧 JSON</span>
                <span>📊 CSV</span>
                <span className="text-gray-500">+more</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
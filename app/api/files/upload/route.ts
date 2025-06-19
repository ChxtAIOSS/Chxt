// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Supported file types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp'
]

const SUPPORTED_TEXT_TYPES = [
  'text/plain',
  'application/octet-stream',
  'text/csv',
  'text/markdown',
  'text/xml',
  'application/json',
  'text/javascript',
  'text/css',
  'text/html'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function isTextFile(file: File): boolean {
  if (SUPPORTED_TEXT_TYPES.includes(file.type)) {
    return true
  }
  
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.xml', '.sql', '.log', '.py', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.go', '.rs', '.sh', '.yml', '.yaml', '.toml', '.ini', '.conf', '.env']
  const fileName = file.name.toLowerCase()
  
  return textExtensions.some(ext => fileName.endsWith(ext))
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB.' 
      }, { status: 400 })
    }
    
    // Handle text files
    if (isTextFile(file)) {
      try {
        const extractedText = await file.text()
        
        if (!extractedText.trim()) {
          return NextResponse.json({ 
            error: 'The text file appears to be empty.' 
          }, { status: 400 })
        }
        
        return NextResponse.json({
          success: true,
          extractedText: extractedText.trim(),
          confidence: 100,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'text/plain',
          method: 'direct_text_read'
        })
        
      } catch {
        return NextResponse.json({ 
          error: 'Failed to read text file.' 
        }, { status: 400 })
      }
    }
    
    // For images, return message about OCR being temporarily unavailable
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Image OCR is temporarily unavailable. Please upload a text file instead, or try again later.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: `Unsupported file type: ${file.type}. Please upload a text file or image.` 
    }, { status: 400 })
    
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ 
      error: 'Failed to process file' 
    }, { status: 500 })
  }
}
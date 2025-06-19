// components/MarkdownRenderer.tsx
"use client"

import React, { memo, useCallback, useState, useEffect } from 'react'
import { marked } from 'marked'
import { Highlight, themes } from 'prism-react-renderer'
import markedKatex from 'marked-katex-extension'

// Import KaTeX CSS
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
}

// Custom copy button component
const CopyButton = memo(({ code }: { code: string }) => {
  const [copyState, setCopyState] = useState<'idle' | 'success'>('idle')

  const handleCopy = useCallback(async () => {
    try {
      setCopyState('success')
      await navigator.clipboard.writeText(code)
      setTimeout(() => setCopyState('idle'), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
      setCopyState('idle')
    }
  }, [code])

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 ${
        copyState === 'success' ? 'text-green-300 bg-green-500/20' : 'text-white/70 hover:text-white'
      }`}
      title="Copy code"
    >
      <div className="relative w-4 h-4">
        <svg 
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${
            copyState === 'success' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        
        <svg 
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${
            copyState === 'success' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </button>
  )
})

CopyButton.displayName = 'CopyButton'

// Custom renderer for code blocks
const CodeBlock = memo(({ language, children }: { language: string, children: string }) => {
  const cleanCode = children.replace(/\n$/, '')
  
  return (
    <div className="relative group my-8">
      <div className="flex items-center justify-between bg-gray-800/50 px-4 py-3 rounded-t-lg border-b border-gray-700/50">
        <span className="text-xs text-gray-400 font-mono font-semibold uppercase tracking-wide">
          {language || 'text'}
        </span>
        <CopyButton code={cleanCode} />
      </div>
      <div className="bg-[#1a1a1a] rounded-b-lg overflow-hidden">
        <Highlight
          theme={themes.vsDark}
          code={cleanCode}
          language={language || 'text'}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre 
              className={className} 
              style={{
                ...style,
                margin: 0,
                padding: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                backgroundColor: '#1a1a1a',
              }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
})

CodeBlock.displayName = 'CodeBlock'

// Configure marked with only universally supported options
marked.setOptions({
  breaks: true,              
  gfm: true,                 
})

// Add KaTeX extension for math support
marked.use(markedKatex({
  throwOnError: false,  // Don't throw on math errors
  displayMode: false,   // Use inline mode by default
}))

// Create a minimal renderer that ONLY handles styling, not structure
const renderer = new marked.Renderer()

// Only override code blocks for syntax highlighting
renderer.code = function({ text, lang }: { text: string; lang?: string }) {
  const language = lang || ''
  return `<code-block language="${language}">${text}</code-block>`
}

// Use the custom renderer
marked.use({ renderer })

export const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
  const [renderedElements, setRenderedElements] = useState<React.ReactElement[]>([])

  useEffect(() => {
    const renderContent = async () => {
      try {
        console.log('Raw content:', content)
        
        // Use marked with full markdown and math support
        const html = await marked(content)
        console.log('Marked HTML:', html)
        
        // Split by code blocks and process each part
        const parts = html.split(/<code-block language="([^"]*)">([\s\S]*?)<\/code-block>/g)
        const elements: React.ReactElement[] = []
        
        for (let i = 0; i < parts.length; i += 3) {
          // Regular HTML content with FIXED styling that overrides CSS conflicts
          if (parts[i]) {
            elements.push(
              <div 
                key={`html-${i}`}
                dangerouslySetInnerHTML={{ __html: parts[i] }}
                style={{
                  // Use inline styles to override CSS conflicts
                  color: '#e5e7eb',
                  lineHeight: '1.6',
                }}
                className="markdown-content-wrapper"
              />
            )
          }
          
          // Code block
          if (parts[i + 1] !== undefined && parts[i + 2] !== undefined) {
            const language = parts[i + 1]
            const code = parts[i + 2]
            elements.push(
              <CodeBlock key={`code-${i}`} language={language}>
                {code}
              </CodeBlock>
            )
          }
        }
        
        setRenderedElements(elements)
      } catch (error) {
        console.error('Error rendering markdown:', error)
        // Fallback to plain text with line breaks
        setRenderedElements([
          <div key="fallback" className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-gray-200 leading-relaxed tracking-wide">
            {content}
          </div>
        ])
      }
    }

    renderContent()
  }, [content])

  return (
    <div className="markdown-content space-y-4">
      {renderedElements}
    </div>
  )
})

MarkdownRenderer.displayName = 'MarkdownRenderer'
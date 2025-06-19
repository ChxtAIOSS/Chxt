"use client"

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { SearchResult } from '@/lib/types'

interface SearchResponse {
  success: boolean
  originalQuery: string
  optimizedQuery: string
  results: SearchResult[]
  count: number
  timestamp: string
  error?: string
}

interface SearchResultsProps {
  query: string
  isLoading: boolean
  results?: SearchResult[]
  isComplete?: boolean
  onComplete: (results: SearchResult[]) => void
}

const LoadingPulse = ({ index }: { index: number }) => (
  <div 
    className="w-[280px] flex-shrink-0 rounded-xl border border-white/5 bg-white/[0.015] overflow-hidden"
    style={{
      animation: `fadeInUp 0.5s ease-out ${index * 80}ms both`
    }}
  >
    <div className="p-3">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg animate-pulse"></div>
        <div className="flex-1">
          <div className="h-3.5 bg-white/5 rounded mb-1.5 animate-pulse"></div>
          <div className="h-2.5 bg-white/5 rounded w-2/3 animate-pulse"></div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 bg-white/5 rounded animate-pulse"></div>
        <div className="h-2.5 bg-white/5 rounded w-4/5 animate-pulse"></div>
        <div className="h-2.5 bg-white/5 rounded w-3/5 animate-pulse"></div>
      </div>
    </div>
  </div>
)

const ResultCard = ({ result, index, isVisible }: { result: SearchResult; index: number; isVisible: boolean }) => (
  <div
    className={`w-[280px] flex-shrink-0 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 group cursor-pointer ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
    }`}
    style={{
      transitionDelay: isVisible ? `${index * 100}ms` : '0ms'
    }}
  >
    <div className="p-3">
      <div className="mb-2.5 flex items-start gap-2.5">
        <div className="relative flex min-h-8 min-w-8 items-center justify-center overflow-hidden rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors duration-200">
          {result.favicon ? (
            <Image 
              alt="" 
              className="h-5 w-5 object-contain" 
              src={result.favicon}
              width={20}
              height={20}
              onError={() => {}}
            />
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium text-white mb-1 leading-snug group-hover:text-gray-100 transition-colors duration-200">{result.title}</h3>
          <a 
            href={result.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-400 hover:text-purple-300 flex items-center gap-1 text-xs hover:underline transition-colors duration-200 group/link"
          >
            <span className="truncate">
              {(() => {
                try {
                  return new URL(result.url).hostname
                } catch {
                  return result.url
                }
              })()}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover/link:opacity-100 transition-opacity duration-200">
              <path d="M15 3h6v6"></path>
              <path d="M10 14 21 3"></path>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            </svg>
          </a>
        </div>
      </div>
      <p className="text-gray-300 group-hover:text-gray-200 line-clamp-3 text-xs leading-relaxed transition-colors duration-200">{result.description}</p>
    </div>
  </div>
)

export function SearchResults({ query, isLoading, results = [], isComplete = false, onComplete }: SearchResultsProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'complete' | 'error'>('idle')
  const [optimizedQuery, setOptimizedQuery] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  
  // Real search function using Brave API
  const performSearch = useCallback(async (searchQuery: string) => {
    const abortController = new AbortController()
    
    setSearchState('searching')
    setError('')
    setSearchResults([])
    setShowResults(false)
    
    try {
      console.log('Starting search for:', searchQuery)
      
      if (!searchQuery || searchQuery.trim().length === 0) {
        throw new Error('Search query cannot be empty')
      }

      const requestBody = {
        query: searchQuery.trim(),
        count: 8
      }
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      })

      if (!response.ok) {
        let errorMessage = `Search failed: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.details || errorData.error || errorMessage
        } catch {
          const errorText = await response.text().catch(() => '')
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data: SearchResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Search failed')
      }

      console.log('Search completed successfully:', {
        originalQuery: data.originalQuery,
        optimizedQuery: data.optimizedQuery,
        resultCount: data.results.length
      })

      setOptimizedQuery(data.optimizedQuery)
      setSearchResults(data.results)
      setSearchState('complete')

      // Show results with a slight delay for smooth transition
      setTimeout(() => {
        setShowResults(true)
      }, 200)

      // Trigger completion callback after results are shown
      setTimeout(() => {
        onComplete(data.results)
      }, 200 + data.results.length * 100 + 300)

    } catch (error: unknown) {
      const searchError = error as { name?: string; message?: string }
      
      if (searchError.name === 'AbortError') {
        console.log('Search aborted for:', searchQuery)
        return
      }

      console.error('Search failed:', error)
      const errorMessage = searchError.message || 'Search failed. Please try again.'
      setError(errorMessage)
      setSearchState('error')
      
      onComplete([])
    }

    return () => {
      abortController.abort()
    }
  }, [onComplete])

  // Start search when loading begins
  useEffect(() => {
    if (isLoading && query) {
      performSearch(query)
    }
  }, [isLoading, query, performSearch])

  // Handle external completion
  useEffect(() => {
    if (isComplete) {
      setSearchState('complete')
      setShowResults(true)
    }
  }, [isComplete])

  // Use external results if provided
  useEffect(() => {
    if (results.length > 0) {
      setSearchResults(results)
      setShowResults(true)
    }
  }, [results])

  if (!query) {
    return null
  }

  const displayResults = searchResults.length > 0 ? searchResults : results
  const showLoading = searchState === 'searching'
  const showCompleted = searchState === 'complete' || isComplete
  const showError = searchState === 'error'

  return (
    <div className="mb-4 transition-all duration-300 ease-out">
      {/* Apple-style Search Header */}
      <div className="mb-3">
        <div className="group inline-flex items-center gap-2.5 px-3 py-2 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            {showLoading ? (
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 border border-blue-400/30 rounded-full"></div>
                <div className="absolute inset-0 border-t border-blue-400 rounded-full animate-spin"></div>
              </div>
            ) : showError ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            )}
          </div>
          <span className="text-sm font-medium text-gray-300">Web Search</span>
          <div className={`px-2 py-0.5 border rounded-full transition-all duration-200 ${
            showError 
              ? 'bg-red-500/10 border-red-500/20' 
              : showCompleted
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-blue-500/10 border-blue-500/20'
          }`}>
            <span className={`text-xs font-medium transition-colors duration-200 ${
              showError ? 'text-red-300' : showCompleted ? 'text-green-300' : 'text-blue-300'
            }`}>
              {showLoading ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  Searching...
                </span>
              ) : showError ? (
                'Failed'
              ) : (
                `${displayResults.length} ${displayResults.length === 1 ? 'Result' : 'Results'}`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Apple-style Query Badge */}
      {(optimizedQuery || !showLoading) && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <span className="text-xs font-medium text-purple-300 line-clamp-1">
              {optimizedQuery || query}
            </span>
          </div>
        </div>
      )}

      {/* Apple-style Error Message */}
      {showError && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="text-sm font-medium">Search Failed</span>
          </div>
          <p className="text-xs text-red-200 mt-1 ml-6">{error}</p>
          <button 
            onClick={() => performSearch(query)}
            className="mt-2 ml-6 text-xs text-red-300 hover:text-red-200 underline transition-colors duration-200"
          >
            Try again
          </button>
        </div>
      )}

      {/* Apple-style Search Results Grid */}
      <div className="relative overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {/* Clean Apple-style loading animation */}
          {showLoading && Array.from({ length: 6 }).map((_, index) => (
            <LoadingPulse key={`skeleton-${query}-${index}`} index={index} />
          ))}

          {/* Clean Apple-style results */}
          {!showLoading && displayResults.map((result, index) => (
            <ResultCard
              key={`${query}-${result.id}`}
              result={result}
              index={index}
              isVisible={showResults}
            />
          ))}
        </div>

        {/* Apple-style no results message */}
        {!showLoading && !showError && displayResults.length === 0 && (
          <div className="text-center py-8 opacity-0 animate-fadeIn">
            <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No search results found</p>
            <p className="text-gray-500 text-xs mt-1">Try refining your search query</p>
          </div>
        )}
      </div>

      {/* Apple-style completion indicator */}
      {showCompleted && !showError && displayResults.length > 0 && (
        <div className="mt-3 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full opacity-0 animate-fadeIn">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-green-300">
              Search completed
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out 0.3s both;
        }
        
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Apple-style scrollbar */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }

        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  )
}
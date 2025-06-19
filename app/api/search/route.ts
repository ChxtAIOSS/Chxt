// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search'

// In-memory cache and rate limiting with proper types
const searchCache = new Map<string, { data: BraveSearchResult[]; timestamp: number }>()
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
// ADD: Request deduplication map with proper type
const pendingRequests = new Map<string, Promise<BraveSearchResult[]>>()

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_MINUTE = 30

interface BraveSearchResult {
  id: string
  title: string
  url: string
  description: string
  favicon?: string
}

interface BraveApiResponse {
  web?: {
    results?: Array<{
      title: string
      url: string
      description: string
      favicon?: string
    }>
  }
}

async function optimizeSearchQuery(userQuery: string): Promise<string> {
  try {
    let optimized = userQuery
      .toLowerCase()
      .trim()
      .replace(/^(what|how|why|when|where|who|which|can you|could you|would you|please|tell me about|explain)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .replace(/\s+/g, ' ')
      .substring(0, 100)
      .trim()

    if (optimized.length < 3) {
      optimized = userQuery.trim()
    }

    console.log(`Query optimization: "${userQuery}" -> "${optimized}"`)
    return optimized

  } catch (error) {
    console.error('Failed to optimize search query:', error)
    return userQuery.trim()
  }
}

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'default'
  return ip
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const userRateLimit = rateLimitMap.get(key)

  if (!userRateLimit || now > userRateLimit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (userRateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    return true
  }

  userRateLimit.count++
  return false
}

async function searchBrave(query: string, count: number = 10): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error('Brave Search API key not configured. Please add BRAVE_SEARCH_API_KEY to your environment variables.')
  }

  const cacheKey = `${query}-${count}`
  
  // Check cache first
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached results for:', query)
    return cached.data
  }

  // CRITICAL: Check if this exact request is already pending
  if (pendingRequests.has(cacheKey)) {
    console.log('Request already pending, waiting for existing request:', query)
    return await pendingRequests.get(cacheKey)!
  }

  // Create the request promise and store it
  const requestPromise = (async () => {
    try {
      const url = new URL(BRAVE_SEARCH_URL)
      url.searchParams.set('q', query)
      url.searchParams.set('count', Math.min(count, 20).toString())
      url.searchParams.set('text_decorations', 'false')
      url.searchParams.set('search_lang', 'en')
      url.searchParams.set('country', 'US')
      url.searchParams.set('spellcheck', 'true')

      console.log('Making Brave API request for:', query)

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1100))

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('Brave API Error:', response.status, errorText)
        
        if (response.status === 429) {
          throw new Error('Search API rate limit exceeded. Please wait a moment and try again.')
        }
        
        throw new Error(`Brave Search API error: ${response.status} - ${errorText}`)
      }

      const data: BraveApiResponse = await response.json()
      console.log('Brave API Response received')
      
      const results = (data.web?.results || []).map((result, index) => ({
        id: `result-${index}-${Date.now()}`,
        title: result.title || 'Untitled',
        url: result.url || '',
        description: result.description || 'No description available',
        favicon: result.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${new URL(result.url || 'https://example.com').hostname}`
      }))

      // Cache the results
      searchCache.set(cacheKey, { data: results, timestamp: Date.now() })
      console.log(`Found ${results.length} results`)
      
      return results
    } finally {
      // CRITICAL: Always remove the pending request when done
      pendingRequests.delete(cacheKey)
    }
  })()

  // Store the pending request
  pendingRequests.set(cacheKey, requestPromise)
  
  return await requestPromise
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please wait a moment and try again.',
          success: false,
          timestamp: new Date().toISOString()
        },
        { status: 429 }
      )
    }

    const contentLength = request.headers.get('content-length')
    if (!contentLength || contentLength === '0') {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

    const body = await request.json().catch((error) => {
      console.error('JSON parsing error:', error)
      throw new Error('Invalid JSON in request body')
    })

    const { query, count = 8 } = body

    console.log('Search request received:', { query, count, timestamp: new Date().toISOString() })

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 }
      )
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      )
    }

    const optimizedQuery = await optimizeSearchQuery(query)
    console.log('Optimized query:', optimizedQuery)

    const results = await searchBrave(optimizedQuery, Math.min(count, 20))

    const response = {
      success: true,
      originalQuery: query,
      optimizedQuery,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    }

    console.log('Search completed successfully:', {
      originalQuery: query,
      optimizedQuery,
      resultCount: results.length,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Search API error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: errorMessage,
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const count = parseInt(searchParams.get('count') || '8')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter (q) is required' },
        { status: 400 }
      )
    }

    const mockRequest = new Request(request.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': JSON.stringify({ query, count }).length.toString(),
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'x-real-ip': request.headers.get('x-real-ip') || '',
      },
      body: JSON.stringify({ query, count })
    })

    return POST(mockRequest as NextRequest)

  } catch (error) {
    console.error('Search GET error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
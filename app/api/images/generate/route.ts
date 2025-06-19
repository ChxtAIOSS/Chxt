// app/api/images/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = await request.json()
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Get user's OpenAI API key from request headers
    const userApiKey = request.headers.get('x-api-key')
    if (!userApiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key required. Please add your OpenAI API key in Settings → API Keys to generate images.' 
      }, { status: 400 })
    }

    // Make request to OpenAI DALL-E API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.trim(),
        n: 1,
        size,
        quality,
        style,
        response_format: 'url'
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('DALL-E API Error:', response.status, errorData)
      
      if (response.status === 400) {
        return NextResponse.json({ 
          error: errorData.error?.message || 'Invalid request to image generation API' 
        }, { status: 400 })
      }
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid OpenAI API key. Please check your API key in Settings.' 
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to generate image' 
      }, { status: 500 })
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      imageUrl: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt,
      originalPrompt: prompt
    })

  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
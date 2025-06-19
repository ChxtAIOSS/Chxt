import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ProviderSchema = z.enum(['OpenAI', 'Anthropic', 'Google', 'DeepSeek'])

const VerifyRequestSchema = z.object({
  provider: ProviderSchema,
  apiKey: z.string().min(1),
})

const verifyProviders = {
  OpenAI: async (apiKey: string) => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  },
  
  Anthropic: async (apiKey: string) => {
    try {
      // Use the Messages API with minimal payload to verify the key
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      })
      // 200 = valid request, 400 = valid key but bad request params, 401 = invalid key
      return response.status === 200 || response.status === 400
    } catch {
      return false
    }
  },
  
  Google: async (apiKey: string) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      )
      return response.ok
    } catch {
      return false
    }
  },
  
  DeepSeek: async (apiKey: string) => {
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      })
      return response.status !== 401
    } catch {
      return false
    }
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, apiKey } = VerifyRequestSchema.parse(body)
    
    const isValid = await verifyProviders[provider](apiKey)
    
    return NextResponse.json({
      valid: isValid,
      provider,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Verification failed', valid: false },
      { status: 500 }
    )
  }
}
// app/api/chat/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, apiKey, usePlatformKey } = await request.json()

    if (!prompt || !model) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let actualApiKey = apiKey
    
    // Handle platform key proxy if needed
    if (usePlatformKey && apiKey === 'platform-key-proxy') {
      const platformKeys = {
        'claude-3.5-sonnet': process.env.ANTHROPIC_API_KEY,
        'claude-3-haiku': process.env.ANTHROPIC_API_KEY,
        'gpt-4': process.env.OPENAI_API_KEY,
        'gpt-4-turbo': process.env.OPENAI_API_KEY,
      }
      actualApiKey = platformKeys[model as keyof typeof platformKeys]
    }

    if (!actualApiKey) {
      throw new Error('No API key available')
    }

    let content = ''

    // Call the appropriate AI service based on model
    if (model.startsWith('claude')) {
      content = await callAnthropicAnalysis(prompt, model, actualApiKey)
    } else if (model.startsWith('gpt')) {
      content = await callOpenAIAnalysis(prompt, model, actualApiKey)
    } else {
      throw new Error(`Unsupported model for analysis: ${model}`)
    }

    return NextResponse.json({ content })

  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json(
      { error: 'Analysis failed' }, 
      { status: 500 }
    )
  }
}

async function callAnthropicAnalysis(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const result = await response.json()
  return result.content?.[0]?.text || ''
}

async function callOpenAIAnalysis(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const result = await response.json()
  return result.choices?.[0]?.message?.content || ''
}
// lib/useImageGeneration.ts
import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { decryptApiKey } from './crypto'
import { useUser } from '@clerk/nextjs'

export function useImageGeneration(threadId: string) {
  const { user } = useUser()
  const [isGenerating, setIsGenerating] = useState(false)
  const createPlaceholder = useMutation(api.messages.createPlaceholder)
  const updateMessage = useMutation(api.messages.updateMessage)
  
  const detectImageRequest = useCallback((prompt: string): boolean => {
    const imageKeywords = [
      'generate an image',
      'create an image',
      'make an image',
      'draw',
      'paint',
      'sketch',
      'illustrate',
      'show me a picture',
      'create a picture',
      'generate a picture',
      'make a drawing',
      'create artwork',
      'design an image',
      'dall-e',
      'dalle',
      'generate image',
      'create image',
      'make picture',
      'draw me',
      'paint me',
      'show me an image',
      'visualize',
      'render an image'
    ]
    
    const lowerPrompt = prompt.toLowerCase()
    return imageKeywords.some(keyword => lowerPrompt.includes(keyword))
  }, [])
  
  const generateImage = useCallback(async (prompt: string) => {
    if (isGenerating) {
      console.log('Already generating an image, skipping...')
      return null
    }
    
    setIsGenerating(true)
    console.log('Starting image generation for prompt:', prompt)
    
    let assistantId: Id<"messages"> | null = null
    
    try {
      const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      
      // Create user message
      console.log('Creating user message...')
      await createPlaceholder({
        threadId,
        content: prompt,
        role: 'user',
        userId,
        createdAt: Date.now(),
        status: 'complete',
      })
      
      // Create assistant message placeholder with better loading content
      console.log('Creating assistant placeholder...')
      assistantId = await createPlaceholder({
        threadId,
        content: `🎨 Generating image with DALL-E...
Prompt: "${prompt}"`,
        role: 'assistant',
        userId,
        createdAt: Date.now(),
        status: 'streaming',
        metadata: { type: 'image_generation', originalPrompt: prompt }
      })
      
      // Get user's OpenAI API key
      console.log('Getting OpenAI API key...')
      const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}')
      
      if (!stored.OpenAI?.encryptedKey) {
        throw new Error('OpenAI API key not found. Please add your OpenAI API key in Settings → API Keys to generate images.')
      }
      
      const userIdForDecryption = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      const apiKey = await decryptApiKey(
        stored.OpenAI.encryptedKey,
        stored.OpenAI.iv,
        userIdForDecryption
      )
      
      console.log('API key retrieved, making image generation request...')
      
      // Make image generation request
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          prompt,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        })
      })
      
      console.log('Image generation response status:', response.status)
      const result = await response.json()
      console.log('Image generation result:', result)
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate image')
      }
      
      // Update message with generated image using improved format
      const imageContent = `🎨 Generated Image

![Generated Image](${result.imageUrl})

**Prompt:** "${prompt}"
${result.revisedPrompt ? `**DALL-E Enhanced Prompt:** "${result.revisedPrompt}"` : ''}

*Generated with DALL-E 3 • ${new Date().toLocaleTimeString()}*`
      
      console.log('Updating message with generated image...')
      await updateMessage({
        messageId: assistantId,
        content: imageContent,
        status: 'complete',
        metadata: { 
          type: 'image_generation',
          imageUrl: result.imageUrl,
          originalPrompt: prompt,
          revisedPrompt: result.revisedPrompt
        }
      })
      
      console.log('Image generation completed successfully!')
      return result
      
    } catch (error) {
      console.error('Image generation error:', error)
      
      // Update the assistant message with error if we have an ID
      if (assistantId) {
        const errorMessage = `Sorry, I couldn't generate an image. ${error instanceof Error ? error.message : 'Please try again.'}`
        
        console.log('Updating message with error...')
        try {
          await updateMessage({
            messageId: assistantId,
            content: errorMessage,
            status: 'complete',
            metadata: { 
              type: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          })
        } catch (updateError) {
          console.error('Failed to update error message:', updateError)
        }
      }
      
      throw error
      
    } finally {
      setIsGenerating(false)
    }
  }, [threadId, user, createPlaceholder, updateMessage, isGenerating])
  
  return {
    detectImageRequest,
    generateImage,
    isGenerating
  }
}
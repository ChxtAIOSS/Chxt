"use client"

import React from 'react'
import { MODEL_PROVIDERS } from '@/lib/constants'

interface ModelDisplayProps {
  model: string
  className?: string
}

const PROVIDER_ICONS = {
  'OpenAI': '/icons/openai.svg',
  'Anthropic': '/icons/anthropic.svg', 
  'Google': '/icons/gemini.svg',
  'DeepSeek': '/icons/deepseek.svg',
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Anthropic models
  'claude-sonnet-4': 'Claude 4 Sonnet',
  'claude-4-sonnet': 'Claude 4 Sonnet', 
  'claude-opus-4': 'Claude 4 Opus',
  'claude-3.7-sonnet': 'Claude 3.7 Sonnet',
  'claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3.5-haiku': 'Claude 3.5 Haiku',
  
  // OpenAI models
  'gpt-4.1': 'GPT 4.1',
  'gpt-4.1-mini': 'GPT 4.1-mini',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o mini',
  'o4': 'o4',
  'o4-mini': 'o4 mini',
  
  // Google models
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  
  // DeepSeek models
  'deepseek-r1': 'DeepSeek R1',
  'deepseek-v3': 'DeepSeek V3',
  'deepseek-coder': 'DeepSeek Coder',
}

// Subtle, elegant colors that fit the dark theme
// Just replace the Anthropic entry in PROVIDER_STYLES:
const PROVIDER_STYLES = {
    'OpenAI': {
      color: '#10B981', // Elegant emerald
      iconFilter: 'brightness(0) saturate(100%) invert(64%) sepia(46%) saturate(1980%) hue-rotate(117deg) brightness(91%) contrast(85%)'
    },
    'Anthropic': {
      color: '#DC8B6B', // Elegant warm coral - much softer and sophisticated 
      iconFilter: 'brightness(0) saturate(100%) invert(69%) sepia(23%) saturate(1976%) hue-rotate(327deg) brightness(95%) contrast(88%)'
    },
    'Google': {
      color: '#3B82F6', // Sophisticated blue  
      iconFilter: 'brightness(0) saturate(100%) invert(42%) sepia(96%) saturate(1815%) hue-rotate(213deg) brightness(97%) contrast(94%)'
    },
    'DeepSeek': {
      color: '#8B5CF6', // Elegant purple
      iconFilter: 'brightness(0) saturate(100%) invert(56%) sepia(81%) saturate(2618%) hue-rotate(244deg) brightness(97%) contrast(96%)'
    },
  }

export function ModelDisplay({ model, className = "" }: ModelDisplayProps) {
  const provider = MODEL_PROVIDERS[model]
  const displayName = MODEL_DISPLAY_NAMES[model] || model
  const iconPath = provider ? PROVIDER_ICONS[provider as keyof typeof PROVIDER_ICONS] : null
  const providerStyle = provider ? PROVIDER_STYLES[provider as keyof typeof PROVIDER_STYLES] : null

  if (!provider || !iconPath || !providerStyle) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium ${className}`}>
        <div className="w-3.5 h-3.5 bg-gray-600/50 rounded-sm flex items-center justify-center text-[8px] text-gray-300 font-bold">
          {model.charAt(0).toUpperCase()}
        </div>
        <span>{displayName}</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-200 ${className}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={iconPath} 
          alt={provider} 
          className="w-3.5 h-3.5 object-contain transition-all duration-200 opacity-80 hover:opacity-100"
          style={{ filter: providerStyle.iconFilter }}
        />
      </div>
      <span 
        className="transition-colors duration-200"
        style={{ color: providerStyle.color }}
      >
        {displayName}
      </span>
    </div>
  )
}
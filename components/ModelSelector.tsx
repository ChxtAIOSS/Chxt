// components/ModelSelector.tsx

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import * as React from 'react'
import { decryptApiKey } from '@/lib/crypto'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'


const LAST_MODEL_KEY = 'chxt_last_model'
const AVAILABLE_MODELS_KEY = 'chxt_available_models'
const MODELS_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface APIKeyData {
  encryptedKey: string;
  iv: string;
}

interface CachedModels {
  [provider: string]: {
    models: string[];
    timestamp: number;
  };
}

interface Model {
  id: string
  name: string
  provider: string
  description: string
  color: string
  isMain?: boolean
}

interface ExtendedModel extends Model {
  available: boolean
  requiresSubscription: boolean
}

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const models: Model[] = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Latest model', color: 'from-purple-500 to-purple-600', isMain: true },
  { id: 'gpt-4.1', name: 'GPT 4.1', provider: 'OpenAI', description: 'Latest OpenAI model', color: 'from-green-500 to-emerald-600', isMain: true },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Lightning fast', color: 'from-blue-500 to-blue-600', isMain: true },
  
  { id: 'gpt-4.1-mini', name: 'GPT 4.1-mini', provider: 'OpenAI', description: 'Faster and efficient', color: 'from-green-500 to-emerald-600' },
  { id: 'gpt-4o', name: 'GPT 4o', provider: 'OpenAI', description: 'Multimodal capabilities', color: 'from-green-500 to-emerald-600' },
  { id: 'gpt-4o-mini', name: 'GPT 4o-mini', provider: 'OpenAI', description: 'Budget friendly', color: 'from-green-500 to-emerald-600' },
  { id: 'o4', name: 'o4', provider: 'OpenAI', description: 'Most capable', color: 'from-green-500 to-emerald-600' },
  { id: 'o4-mini', name: 'o4-mini', provider: 'OpenAI', description: 'Fast & capable', color: 'from-green-500 to-emerald-600' },
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic', description: 'Most powerful reasoning', color: 'from-purple-500 to-purple-600' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Best for coding', color: 'from-purple-500 to-purple-600' },
  { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Fast responses', color: 'from-purple-500 to-purple-600' },
  { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'Anthropic', description: 'Balanced performance', color: 'from-purple-500 to-purple-600' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Advanced reasoning', color: 'from-blue-500 to-blue-600' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Previous gen fast', color: 'from-blue-500 to-blue-600' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', description: 'Flagship reasoning', color: 'from-orange-500 to-red-600' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', description: 'Cost effective', color: 'from-orange-500 to-red-600' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'DeepSeek', description: 'Specialized for code', color: 'from-orange-500 to-red-600' },
]

// Fetch available models from providers
async function fetchAvailableModels(provider: string, apiKey: string): Promise<string[]> {
  try {
    switch (provider) {
      case 'OpenAI':
        const openaiRes = await fetch('/api/models/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        })
        return await openaiRes.json()
      
      // Add other providers as needed
      default:
        return []
    }
  } catch {
    return []
  }
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [availableModels, setAvailableModels] = useState<Model[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()
  const subscription = useQuery(api.subscriptions.getUserSubscription)

  // Save last used model
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(LAST_MODEL_KEY, selectedModel)
    }
  }, [selectedModel])

  // Update available models based on API keys and fetch from providers
  const updateAvailableModels = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}') as Record<string, APIKeyData>
    const cached = JSON.parse(localStorage.getItem(AVAILABLE_MODELS_KEY) || '{}') as CachedModels
    const now = Date.now()
    const userId = user?.id || localStorage.getItem('sessionId') || 'anonymous'
    
    // First set static models
    const available = models.filter(model => stored[model.provider]?.encryptedKey)
    setAvailableModels(available)
    
    // Then fetch dynamic models if cache expired
    for (const [provider, data] of Object.entries(stored)) {
      if (!data?.encryptedKey) continue
      
      // Check cache
      if (cached[provider]?.timestamp && now - cached[provider].timestamp < MODELS_CACHE_DURATION) {
        continue
      }
      
      // Decrypt and fetch
      try {
        const apiKey = await decryptApiKey(
          data.encryptedKey, 
          data.iv, 
          userId
        )
        const dynamicModels = await fetchAvailableModels(provider, apiKey)
        
        // Update cache
        cached[provider] = {
          models: dynamicModels,
          timestamp: now
        }
      } catch (e) {
        console.error(`Failed to fetch ${provider} models:`, e)
      }
    }
    
    localStorage.setItem(AVAILABLE_MODELS_KEY, JSON.stringify(cached))
    
    // Set initial model if needed
    if (!available.some(m => m.id === selectedModel) && available.length > 0) {
      const lastUsed = localStorage.getItem(LAST_MODEL_KEY)
      const initialModel = available.find(m => m.id === lastUsed) || available[0]
      onModelChange(initialModel.id)
    }
  }, [selectedModel, onModelChange, user])

  useEffect(() => {
    updateAvailableModels()
    const interval = setInterval(updateAvailableModels, 1000)
    const handleStorageChange = () => updateAvailableModels()
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [updateAvailableModels])

  // Click outside & escape handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Filter & sort models with strict subscription check
  const displayModels = useMemo(() => {
    let filtered = models // Use all models now
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      )
    }
    
    // Categorize models based on availability
    return filtered.map(model => {
      const hasApiKey = availableModels.some(m => m.id === model.id)
      // CRITICAL FIX: Check for actual PRO subscription, not just active account
      const hasProSubscription = subscription?.hasSubscription === true && subscription?.tier === 'pro'
      
      return {
        ...model,
        available: hasApiKey || hasProSubscription,
        requiresSubscription: !hasApiKey && !hasProSubscription,
      }
    }).sort((a, b) => {
      // Sort by availability first
      if (a.available && !b.available) return -1
      if (!a.available && b.available) return 1
      
      // Then by last used/selected
      const lastUsed = localStorage.getItem(LAST_MODEL_KEY)
      if (a.id === lastUsed) return -1
      if (b.id === lastUsed) return 1
      if (a.id === selectedModel) return -1
      if (b.id === selectedModel) return 1
      if (a.isMain && !b.isMain) return -1
      if (!a.isMain && b.isMain) return 1
      return 0
    })
  }, [availableModels, searchQuery, selectedModel, subscription])

  const featuredModels = displayModels.filter(m => m.isMain || m.id === selectedModel).slice(0, 4)
  const currentModel = models.find(m => m.id === selectedModel) || availableModels[0] || models[0]

  const ModelIcon = ({ provider, isInButton = false }: { provider: string, isInButton?: boolean }) => {
    const iconSize = 18 // Base size for dropdown
    const openaiSize = 23 // 25% bigger for OpenAI (18 * 1.25 = 22.5, rounded to 23)
    
    // Use inline SVGs for all providers to ensure white color and avoid request issues
    switch (provider) {
      case 'Google':
        return (
          <svg 
            fill="white" 
            fillRule="evenodd" 
            height={iconSize} 
            width={iconSize} 
            viewBox="0 0 24 24" 
            style={{ flex: 'none', lineHeight: 1 }}
          >
            <title>Gemini</title>
            <path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12" />
          </svg>
        )
      
      case 'OpenAI':
        return (
          <svg 
            fill="white" 
            fillRule="evenodd" 
            height={isInButton ? iconSize : openaiSize} 
            width={isInButton ? iconSize : openaiSize} 
            viewBox="0 0 24 24" 
            style={{ flex: 'none', lineHeight: 1 }}
          >
            <title>OpenAI</title>
            <path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z" />
          </svg>
        )
      
      case 'Anthropic':
        return (
          <svg 
            fill="white" 
            fillRule="evenodd" 
            height={iconSize} 
            width={iconSize} 
            viewBox="0 0 24 24" 
            style={{ flex: 'none', lineHeight: 1 }}
          >
            <title>Anthropic</title>
            <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
          </svg>
        )
      
      case 'DeepSeek':
        return (
          <svg 
            fill="white" 
            fillRule="evenodd" 
            height={iconSize} 
            width={iconSize} 
            viewBox="0 0 24 24" 
            style={{ flex: 'none', lineHeight: 1 }}
          >
            <title>DeepSeek</title>
            <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
          </svg>
        )
      
      default:
        // Fallback for any other providers
        return (
          <div className="w-full h-full bg-gray-500 rounded-sm flex items-center justify-center text-xs text-white">
            {provider.charAt(0)}
          </div>
        )
    }
  }

  // Lock icon component for unavailable models
  const LockIcon = () => (
    <svg 
      className="w-4 h-4 text-gray-500 flex-shrink-0" 
      fill="currentColor" 
      viewBox="0 0 20 20"
    >
      <path 
        fillRule="evenodd" 
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
        clipRule="evenodd" 
      />
    </svg>
  )

  const ModelItem = ({ model }: { model: ExtendedModel }) => (
    <button
      onPointerDown={() => {
        if (model.available) {
          onModelChange(model.id)
          setIsOpen(false)
          setSearchQuery('')
        } else if (model.requiresSubscription) {
          // Redirect to settings/subscription
          window.location.href = '/settings'
        }
      }}
      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
        model.id === selectedModel 
          ? 'bg-purple-500/20 border-l-2 border-purple-500 pl-2.5' 
          : model.available
          ? 'hover:bg-white/[0.03] hover:translate-x-0.5 border-l-2 border-transparent'
          : 'opacity-40 cursor-not-allowed border-l-2 border-transparent bg-gray-900/20'
      }`}
      disabled={!model.available}
    >
      <div className={`w-9 h-9 bg-gradient-to-br ${
        model.available 
          ? (model.provider === 'DeepSeek' ? 'from-slate-700 to-slate-800' : model.color)
          : 'from-gray-700 to-gray-800'
      } rounded-md flex items-center justify-center flex-shrink-0 ${
        !model.available ? 'opacity-50' : ''
      }`}>
        <div className={!model.available ? 'opacity-50' : ''}>
          <ModelIcon provider={model.provider} />
        </div>
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className={`text-sm font-medium flex items-center gap-2 ${
          model.available ? 'text-white' : 'text-gray-500'
        }`}>
          <span className="truncate">{model.name}</span>
        </div>
        <div className={`text-xs ${
          model.available ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {model.requiresSubscription ? 'Requires API key or Pro subscription' : model.description}
        </div>
      </div>
      {model.requiresSubscription && (
        <div className="flex-shrink-0">
          <LockIcon />
        </div>
      )}
    </button>
  )

  // Show loading state if no models available - FIXED: Proper alignment
  if (availableModels.length === 0 && !(subscription?.hasSubscription === true && subscription?.tier === 'pro')) {
    return (
      <div className="flex items-center h-10 text-sm text-gray-400 font-medium">
        No API keys configured
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onPointerDown={() => {
          setIsOpen(!isOpen)
          if (!isOpen) setShowMore(false)
        }}
        className="flex items-center space-x-2.5 bg-[#282828] hover:bg-[#303030] rounded-xl px-3.5 py-2 text-sm transition-all border border-white/10"
      >
        <div className={`w-7 h-7 bg-gradient-to-br ${currentModel?.provider === 'DeepSeek' ? 'from-slate-700 to-slate-800' : currentModel?.color} rounded-md flex items-center justify-center flex-shrink-0`}>
          <ModelIcon provider={currentModel?.provider || 'OpenAI'} isInButton={true} />
        </div>
        <span className="text-gray-200 font-medium">{currentModel?.name}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <div 
        className={`absolute top-full left-50 transform -translate-x-1/2 mt-2 transition-all duration-150 ${
          isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
        }`}
        style={{ 
          left: '50%',
          width: '320px',
          zIndex: 9999,
          backgroundColor: 'rgba(5, 5, 5, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Search */}
        <div className="border-b border-white/5 p-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 focus:bg-white/8 transition-all pl-10 pr-3 py-2"
            />
          </div>
        </div>

        {/* Models List */}
        <div 
          className="overflow-y-auto models-list" 
          style={{ 
            height: '280px', // Fixed height for consistent UI
            scrollbarWidth: 'none',
            scrollBehavior: 'smooth'
          }}
        >
          <style>{`.models-list::-webkit-scrollbar { display: none; }`}</style>
          
          {displayModels.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">No models found</div>
            </div>
          ) : (
            <div className="py-2">
              {!searchQuery && (
                <>
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {(subscription?.hasSubscription === true && subscription?.tier === 'pro') ? 'All Models' : 'Available Models'}
                  </div>
                  <div className="px-2 space-y-1">
                    {/* Always show first 3 featured models */}
                    {featuredModels.slice(0, 3).map(model => <ModelItem key={model.id} model={model as ExtendedModel} />)}
                    
                    {/* Show 4th slot: either the button or all remaining models */}
                    {!showMore && displayModels.length > 3 ? (
                      <div 
                        className="transition-opacity duration-200 ease-in-out"
                        style={{ opacity: showMore ? 0 : 1 }}
                      >
                        <button
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            setShowMore(true)
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 transition-all text-sm text-gray-300 hover:text-white"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                          </svg>
                          <span>Show {displayModels.length - 3} more models</span>
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="transition-opacity duration-200 ease-in-out space-y-1"
                        style={{ opacity: showMore ? 1 : 0 }}
                      >
                        {/* Show all remaining models when expanded */}
                        {displayModels.slice(3).map(model => <ModelItem key={model.id} model={model as ExtendedModel} />)}
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {searchQuery && (
                <div className="px-2 space-y-1">
                  {displayModels.map(model => <ModelItem key={model.id} model={model as ExtendedModel} />)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {(subscription?.hasSubscription === true && subscription?.tier === 'pro') ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pro subscription active
                </span>
              ) : (
                'Using your API keys'
              )}
            </span>
            {!(subscription?.hasSubscription === true && subscription?.tier === 'pro') && (
              <button
                onClick={() => window.location.href = '/settings'}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelSelector
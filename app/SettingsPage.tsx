// app/SettingsPage.tsx
"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  useUser()
  const { show } = useToast()
  const router = useRouter()
  const subscription = useQuery(api.subscriptions.getUserSubscription)
  const [isLoading, setIsLoading] = useState(false)
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Load saved system prompt from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chxt_system_prompt')
    if (saved) {
      setCustomSystemPrompt(saved)
    }
  }, [])

  // Check connected API keys
  useEffect(() => {
    const checkConnectedProviders = () => {
      const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}')
      const providers = Object.keys(stored).filter(provider => stored[provider]?.encryptedKey)
      setConnectedProviders(providers)
    }

    checkConnectedProviders()
    
    // Check periodically for updates
    const interval = setInterval(checkConnectedProviders, 1000)
    return () => clearInterval(interval)
  }, [])
  
  const handleUpgradeClick = () => {
    setShowUpgradeModal(true)
  }

  const handleConfirmUpgrade = async () => {
    setIsLoading(true)
    setShowUpgradeModal(false)
    
    try {
      // In production, this would redirect to Stripe Checkout
      show('info', 'Coming Soon', 'Subscription checkout will be available soon. For now, enjoy the free tier!', {
        duration: 5000,
      })
      
    } catch {
      show('error', 'Error', 'Failed to open subscription management. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    
    try {
      // In production, this would redirect to Stripe customer portal
      show('info', 'Coming Soon', 'Subscription management will be available soon!', {
        duration: 3000,
      })
      
    } catch {
      show('error', 'Error', 'Failed to open subscription management. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSystemPrompt = () => {
    localStorage.setItem('chxt_system_prompt', customSystemPrompt)
    setIsEditingPrompt(false)
    show('success', 'System Prompt Saved', 'Your custom system prompt has been saved successfully.')
  }

  const handleClearSystemPrompt = () => {
    setCustomSystemPrompt('')
    localStorage.removeItem('chxt_system_prompt')
    setIsEditingPrompt(false)
    show('success', 'System Prompt Cleared', 'Custom system prompt has been removed.')
  }

  const handleNavigateToApiKeys = () => {
    router.push('/api-keys')
  }
  
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }
  
  const getUsagePercentage = () => {
    if (!subscription || subscription.tokenLimit === -1) return 0
    return Math.min(100, (subscription.tokensUsed / subscription.tokenLimit) * 100)
  }

  const isProActive = subscription?.tier === 'pro' && subscription?.status === 'active'

  // Provider icons mapping
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'OpenAI':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z" />
          </svg>
        )
      case 'Anthropic':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
          </svg>
        )
      case 'Google':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12" />
          </svg>
        )
      case 'DeepSeek':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588z" />
          </svg>
        )
      default:
        return (
          <div className="w-4 h-4 bg-gray-500 rounded-sm flex items-center justify-center text-xs text-white font-bold">
            {provider.charAt(0)}
          </div>
        )
    }
  }
  
  return (
    <>
      <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Header - 20% smaller */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Settings
            </h1>
            <p className="text-gray-400 text-sm lg:text-base">Manage your account, preferences, and subscription</p>
          </div>
          
          {/* Subscription Section - 20% smaller */}
          <div className="glass rounded-xl lg:rounded-2xl p-4 lg:p-6 mb-4 lg:mb-6 border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-white">Subscription</h2>
                <p className="text-gray-400 text-xs lg:text-sm">Manage your plan and usage</p>
              </div>
            </div>
            
            {subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-xs font-medium">Current Plan</span>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        subscription.tier === 'pro' 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {subscription.tier === 'pro' ? 'Pro' : 'Free'}
                      </div>
                    </div>
                    <p className="text-lg lg:text-xl font-bold text-white capitalize">{subscription.tier} Plan</p>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-xs font-medium">Status</span>
                      <div className={`w-2 h-2 rounded-full ${
                        subscription.status === 'active' ? 'bg-green-400' : 
                        subscription.status === 'trialing' ? 'bg-blue-400' : 
                        'bg-yellow-400'
                      }`} />
                    </div>
                    <p className={`text-lg lg:text-xl font-bold capitalize ${
                      subscription.status === 'active' ? 'text-green-400' : 
                      subscription.status === 'trialing' ? 'text-blue-400' : 
                      'text-yellow-400'
                    }`}>
                      {subscription.status}
                    </p>
                  </div>
                </div>
                
                {/* Usage Bar */}
                {subscription.tier !== 'enterprise' && (
                  <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-400 font-medium text-xs lg:text-sm">
                        {subscription.tier === 'pro' ? 'Daily Usage' : 'Monthly Usage'}
                      </span>
                      <span className="text-white font-mono text-xs">
                        {formatNumber(subscription.tokensUsed)} / {formatNumber(subscription.tokenLimit)} tokens
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                        style={{ width: `${getUsagePercentage()}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getUsagePercentage() > 80 ? '⚠️ High usage - consider upgrading' : 'Usage tracking'}
                    </p>
                  </div>
                )}
                
                {/* Action Button */}
                <div className="pt-2">
                  {isProActive ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={isLoading}
                      className="w-full btn-primary py-2.5 lg:py-3 rounded-lg lg:rounded-xl font-semibold flex items-center justify-center gap-2 text-sm lg:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066z" />
                          </svg>
                          Manage Subscription
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleUpgradeClick}
                      disabled={isLoading}
                      className="w-full btn-primary py-2.5 lg:py-3 rounded-lg lg:rounded-xl font-semibold flex items-center justify-center gap-2 text-sm lg:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Upgrade to Pro
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 lg:py-8">
                <div className="w-10 h-10 lg:w-12 lg:h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 lg:mb-4" />
                <p className="text-gray-400 text-sm lg:text-base">Loading subscription details...</p>
              </div>
            )}
          </div>

          {/* API Keys Section - 20% smaller */}
          <div className="glass rounded-xl lg:rounded-2xl p-4 lg:p-6 mb-4 lg:mb-6 border border-white/10 hover:border-white/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg lg:text-xl font-bold text-white">API Keys</h3>
                <p className="text-gray-400 text-xs lg:text-sm">Manage your AI provider connections</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  connectedProviders.length > 0
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {connectedProviders.length} Connected
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 mb-4">
              {/* Status Overview */}
              <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/5">
                <h4 className="text-sm lg:text-base font-semibold text-white mb-3">Connected Providers</h4>
                
                {connectedProviders.length > 0 ? (
                  <div className="space-y-2">
                    {connectedProviders.map((provider) => (
                      <div key={provider} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-md flex items-center justify-center text-white">
                          {getProviderIcon(provider)}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium text-xs">{provider}</div>
                          <div className="text-green-400 text-xs flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            Active
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-8 h-8 bg-gray-600/50 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-xs">No API keys configured</p>
                    <p className="text-gray-500 text-xs mt-0.5">Connect your AI providers to get started</p>
                  </div>
                )}
              </div>

              {/* Quick Info */}
              <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/5">
                <h4 className="text-sm lg:text-base font-semibold text-white mb-3">Supported Providers</h4>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {['OpenAI', 'Anthropic', 'Google', 'DeepSeek'].map((provider) => {
                    const isConnected = connectedProviders.includes(provider)
                    return (
                      <div key={provider} className={`flex items-center gap-1.5 p-1.5 rounded-md transition-all ${
                        isConnected ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-500/5 border border-gray-500/10'
                      }`}>
                        <div className={`w-5 h-5 rounded-sm flex items-center justify-center ${
                          isConnected ? 'text-green-400' : 'text-gray-500'
                        }`}>
                          {getProviderIcon(provider)}
                        </div>
                        <span className={`text-xs font-medium ${
                          isConnected ? 'text-green-300' : 'text-gray-400'
                        }`}>
                          {provider}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleNavigateToApiKeys}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 group-hover:shadow-xl text-sm lg:text-base"
            >
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span>Manage API Keys</span>
              <svg className="w-3 h-3 lg:w-4 lg:h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Security Notice */}
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2">
              <div className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-blue-300 font-medium text-xs mb-0.5">Secure Storage</p>
                <p className="text-blue-200 text-xs">Your API keys are encrypted and stored locally on your device. They never leave your browser unencrypted.</p>
              </div>
            </div>
          </div>

          {/* Custom System Prompt - 20% smaller */}
          <div className="glass rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-4 lg:mb-6">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg lg:text-xl font-bold text-white">Custom System Prompt</h3>
                <p className="text-gray-400 text-xs lg:text-sm">Customize how the AI assistant behaves and responds</p>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-4">
              <div className="bg-white/5 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm lg:text-base font-semibold text-white">System Instructions</h4>
                  <button
                    onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                    className="px-2 lg:px-3 py-1 lg:py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-md transition-colors text-xs font-medium"
                  >
                    {isEditingPrompt ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                
                {isEditingPrompt ? (
                  <div className="space-y-3">
                    <textarea
                      value={customSystemPrompt}
                      onChange={(e) => setCustomSystemPrompt(e.target.value)}
                      placeholder="Enter your custom system prompt here... For example: 'You are a helpful coding assistant. Always provide code examples and explain your reasoning.'"
                      className="w-full h-24 lg:h-32 bg-white/5 border border-white/10 rounded-lg p-2.5 lg:p-3 text-white placeholder-gray-400 focus:border-purple-500/50 focus:outline-none resize-none text-xs lg:text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveSystemPrompt}
                        className="px-3 lg:px-4 py-1.5 lg:py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium text-xs lg:text-sm"
                      >
                        Save Prompt
                      </button>
                      <button
                        onClick={handleClearSystemPrompt}
                        className="px-3 lg:px-4 py-1.5 lg:py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-md transition-colors font-medium text-xs lg:text-sm"
                      >
                        Clear Prompt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/50 rounded-lg p-2.5 lg:p-3 border border-gray-700/50">
                    {customSystemPrompt ? (
                      <p className="text-gray-300 whitespace-pre-wrap text-xs lg:text-sm">{customSystemPrompt}</p>
                    ) : (
                      <p className="text-gray-500 italic text-xs lg:text-sm">No custom system prompt set. The AI will use default behavior.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg lg:rounded-xl p-3 lg:p-4">
                <div className="flex gap-2">
                  <div className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400 flex-shrink-0">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-blue-300 font-semibold mb-1 text-xs lg:text-sm">Tips for System Prompts</h5>
                    <ul className="text-blue-200 text-xs space-y-0.5">
                      <li>• Be specific about the tone and style you want</li>
                      <li>• Include any expertise areas or specializations</li>
                      <li>• Mention preferred response formats (bullet points, explanations, etc.)</li>
                      <li>• Add any constraints or guidelines for behavior</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowUpgradeModal(false)}
          />
          
                      <div className="relative rounded-2xl p-6 w-full max-w-2xl border border-white/20" style={{ background: '#0d0d0e', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Upgrade to Pro</h2>
                <p className="text-gray-400">Choose the plan that fits your needs</p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Free Plan */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h4 className="text-xl font-bold text-white mb-3">Free</h4>
                <div className="text-3xl font-bold text-white mb-4">$0<span className="text-lg text-gray-400">/month</span></div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300">Use your own API keys</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-500">No platform API keys</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-500">Limited features</span>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-5 border-2 border-purple-500/50 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
                
                <h4 className="text-xl font-bold text-white mb-3 mt-2">Pro</h4>
                <div className="text-3xl font-bold text-white mb-4">$9<span className="text-lg text-gray-400">/month</span></div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white">5,000 daily tokens</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white">Platform API keys included</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white">Priority support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-white">Advanced features</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-lg transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={isLoading}
                className="flex-2 btn-primary py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Upgrade to Pro
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-gray-400 text-sm mt-4">
              Cancel anytime • No long-term commitment • Instant activation
            </p>
          </div>
        </div>
      )}
    </>
  )
}
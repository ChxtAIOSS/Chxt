// components/ImageGenerationLoading.tsx
"use client"

import React from 'react'

interface ImageGenerationLoadingProps {
  prompt?: string
}

export function ImageGenerationLoading({ prompt }: ImageGenerationLoadingProps) {
  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" style={{ animationDuration: '1.5s' }}></div>
          <span className="text-lg relative z-10">🎨</span>
        </div>
        <div className="flex-1">
          <div className="text-white font-medium text-sm">Creating with DALL-E 3</div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Generating image...</span>
          </div>
        </div>
      </div>

      {/* Elegant Loading Canvas */}
      <div className="relative">
        <div className="aspect-square max-w-sm rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-white/8 relative">
          {/* Animated background */}
          <div className="absolute inset-0">
            {/* Floating orbs */}
            <div className="absolute top-1/3 left-1/3 w-20 h-20 bg-purple-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '3s', animationDelay: '0s' }}></div>
            <div className="absolute bottom-1/3 right-1/3 w-24 h-24 bg-pink-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '1.5s' }}></div>
            
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `
                radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
              animation: 'gridMove 10s linear infinite'
            }}></div>
          </div>
          
          {/* Center loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Main spinner */}
              <div className="w-10 h-10 border-2 border-purple-500/20 rounded-full animate-spin" style={{ borderTopColor: 'rgba(168, 85, 247, 0.6)' }}></div>
              {/* Inner glow */}
              <div className="absolute inset-0 w-10 h-10 border-2 border-transparent rounded-full animate-ping" style={{ borderTopColor: 'rgba(168, 85, 247, 0.3)', animationDuration: '2s' }}></div>
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            </div>
          </div>

          {/* Sweeping light effect */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent"
            style={{
              animation: 'sweep 3s ease-in-out infinite',
              transform: 'translateX(-100%) skewX(-15deg)'
            }}
          ></div>
          
          {/* Corner accent */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-pink-400/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      </div>

      {/* Compact Prompt Display */}
      {prompt && (
        <div className="bg-white/3 rounded-lg p-2.5 border border-white/5">
          <div className="text-xs text-purple-300/80 mb-1">Prompt</div>
          <div className="text-xs text-gray-300 leading-relaxed">&quot;{prompt}&quot;</div>
        </div>
      )}

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(24px, 24px); }
        }
        
        @keyframes sweep {
          0% { transform: translateX(-100%) skewX(-15deg); }
          50% { transform: translateX(100%) skewX(-15deg); }
          100% { transform: translateX(100%) skewX(-15deg); }
        }
      `}</style>
    </div>
  )
}
// components/ConfirmModal.tsx
"use client"

import { useEffect, useState } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
      // Start animation after a small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
      // Wait for exit animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false)
        document.body.style.overflow = 'unset'
      }, 400)
      return () => clearTimeout(timer)
    }
    
    return () => { 
      document.body.style.overflow = 'unset' 
    }
  }, [isOpen])

  const handleConfirm = () => {
    onConfirm()
  }

  const handleCancel = () => {
    onCancel()
  }

  if (!isVisible) return null

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'from-red-500 to-red-600'
      case 'warning': return 'from-orange-500 to-amber-600'
      case 'info': return 'from-blue-500 to-blue-600'
      default: return 'from-orange-500 to-amber-600'
    }
  }

  const getButtonStyle = () => {
    switch (type) {
      case 'danger':
        return {
          gradient: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
          shadow: 'shadow-lg hover:shadow-red-500/25',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }
      case 'warning':
        return {
          gradient: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700',
          shadow: 'shadow-lg hover:shadow-orange-500/25',
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }
      case 'info':
        return {
          gradient: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
          shadow: 'shadow-lg hover:shadow-blue-500/25',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }
      default:
        return {
          gradient: 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700',
          shadow: 'shadow-lg hover:shadow-orange-500/25',
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
    }
  }

  const buttonStyle = getButtonStyle()

  return (
    <>
      {/* Overlay with fluid animation */}
      <div 
        className={`fixed inset-0 z-[9999] transition-all duration-500 ease-out ${
          isAnimating 
            ? 'opacity-100' 
            : 'opacity-0'
        }`}
        style={{
          background: `rgba(0, 0, 0, ${isAnimating ? '0.75' : '0'})`,
          backdropFilter: `blur(${isAnimating ? '12px' : '0px'})`,
          WebkitBackdropFilter: `blur(${isAnimating ? '12px' : '0px'})`,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={handleCancel}
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className={`absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-br ${getIconColor()} rounded-full transition-all duration-700 ease-out ${
              isAnimating ? 'opacity-20 scale-100' : 'opacity-0 scale-75'
            }`}
            style={{ 
              filter: 'blur(80px)',
              transitionDelay: '0.1s'
            }}
          />
          <div 
            className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full transition-all duration-700 ease-out ${
              isAnimating ? 'opacity-15 scale-100' : 'opacity-0 scale-75'
            }`}
            style={{ 
              filter: 'blur(100px)',
              transitionDelay: '0.2s'
            }}
          />
        </div>

        {/* Modal with spring animation */}
        <div 
          className={`fixed top-1/2 left-1/2 w-full max-w-md mx-4 transition-all duration-600 ${
            isAnimating 
              ? 'opacity-100 scale-100 -translate-x-1/2 -translate-y-1/2' 
              : 'opacity-0 scale-75 -translate-x-1/2 -translate-y-1/2'
          }`}
          style={{
            transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transitionDelay: isAnimating ? '0.1s' : '0s'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            {/* Glass container with enhanced animation */}
            <div 
              className={`relative rounded-3xl p-8 border border-white/10 overflow-hidden transition-all duration-500 ${
                isAnimating ? 'border-white/20' : 'border-white/5'
              }`}
              style={{
                background: 'rgba(15, 15, 17, 0.85)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                boxShadow: isAnimating ? `
                  0 32px 64px rgba(0, 0, 0, 0.8),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  0 0 80px rgba(168, 85, 247, 0.1)
                ` : `
                  0 8px 32px rgba(0, 0, 0, 0.4),
                  0 0 0 1px rgba(255, 255, 255, 0.02),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Subtle gradient overlay */}
              <div 
                className={`absolute inset-0 rounded-3xl transition-opacity duration-500 ${
                  isAnimating ? 'opacity-30' : 'opacity-10'
                }`}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)'
                }}
              />

              <div className="relative z-10">
                {/* Icon with staggered animation */}
                <div className="flex justify-center mb-6">
                  <div 
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getIconColor()} flex items-center justify-center shadow-2xl transition-all duration-500 ${
                      isAnimating 
                        ? 'opacity-100 scale-100 rotate-0' 
                        : 'opacity-0 scale-50 -rotate-12'
                    }`}
                    style={{
                      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: isAnimating ? '0.2s' : '0s'
                    }}
                  >
                    <div className={`transition-all duration-300 ${isAnimating ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: isAnimating ? '0.4s' : '0s' }}>
                      {getIcon()}
                    </div>
                  </div>
                </div>

                {/* Content with staggered animation */}
                <div className="text-center mb-8">
                  <h3 
                    className={`text-xl font-bold text-white mb-3 tracking-tight transition-all duration-500 ${
                      isAnimating 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-4'
                    }`}
                    style={{
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: isAnimating ? '0.3s' : '0s'
                    }}
                  >
                    {title}
                  </h3>
                  <p 
                    className={`text-gray-300 leading-relaxed text-sm transition-all duration-500 ${
                      isAnimating 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-4'
                    }`}
                    style={{
                      transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transitionDelay: isAnimating ? '0.4s' : '0s'
                    }}
                  >
                    {message}
                  </p>
                </div>

                {/* Buttons with staggered animation */}
                <div 
                  className={`flex gap-3 transition-all duration-500 ${
                    isAnimating 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-4'
                  }`}
                  style={{
                    transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transitionDelay: isAnimating ? '0.5s' : '0s'
                  }}
                >
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-gray-300 border border-white/10 transition-all duration-200 hover:bg-white/5 hover:border-white/20 hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${buttonStyle.gradient} ${buttonStyle.shadow}`}
                    style={{
                      boxShadow: buttonStyle.boxShadow
                    }}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
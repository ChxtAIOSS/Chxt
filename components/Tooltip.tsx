// components/Tooltip.tsx
"use client"

import React, { useState, useRef, useCallback } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  delay?: number
  disabled?: boolean
}

export function Tooltip({ content, children, delay = 120, disabled = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = useCallback(() => {
    if (disabled) return
    
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      // Small delay for smooth animation
      setTimeout(() => setIsAnimating(true), 10)
    }, delay)
  }, [delay, disabled])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setIsAnimating(false)
    leaveTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 200) // Match CSS transition duration
  }, [])

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div 
          className={`
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
            px-3 py-2 min-w-max max-w-xs
            text-xs font-medium text-white whitespace-nowrap
            pointer-events-none z-50
            transition-all duration-200 ease-out
            ${isAnimating 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-1 scale-95'
            }
          `}
          style={{
            background: 'rgba(10, 10, 12, 0.95)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '0.75rem',
            boxShadow: `
              0 20px 40px rgba(0, 0, 0, 0.8),
              0 0 0 1px rgba(255, 255, 255, 0.02),
              inset 0 1px 0 rgba(255, 255, 255, 0.06)
            `
          }}
        >
          {content}
          
          {/* Arrow */}
          <div 
            className={`
              absolute top-full left-1/2 transform -translate-x-1/2
              transition-all duration-200 ease-out
              ${isAnimating ? 'opacity-100' : 'opacity-0'}
            `}
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(10, 10, 12, 0.95)',
              filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2))'
            }}
          />
        </div>
      )}
    </div>
  )
}
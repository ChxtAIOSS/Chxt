"use client"

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ImageModalProps {
  isOpen: boolean
  imageUrl: string
  alt: string
  onClose: () => void
}

export function ImageModal(props: ImageModalProps) {
  const { isOpen, imageUrl, alt, onClose } = props
  const [mounted, setMounted] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    setImageLoaded(false)
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) {
    return null
  }

  return createPortal(
    React.createElement('div', {
      className: 'fixed inset-0 z-[9999] flex items-center justify-center p-4'
    },
      // Backdrop
      React.createElement('div', {
        className: 'absolute inset-0 bg-black/90 backdrop-blur-xl',
        onClick: onClose
      }),
      
      // Loading state - only show when image is not loaded
      !imageLoaded && React.createElement('div', {
        className: 'relative z-10 flex flex-col items-center justify-center'
      },
        // Animated loading spinner
        React.createElement('div', {
          className: 'relative mb-6'
        },
          React.createElement('div', {
            className: 'w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin'
          }),
          React.createElement('div', {
            className: 'absolute inset-0 w-20 h-20 border-4 border-transparent border-r-pink-500/50 rounded-full animate-spin',
            style: { animationDirection: 'reverse', animationDuration: '3s' }
          })
        ),
        // Loading text
        React.createElement('div', {
          className: 'text-white text-xl font-medium mb-2'
        }, 'Loading Image...'),
        React.createElement('div', {
          className: 'text-gray-400 text-sm'
        }, 'Please wait while the image loads'),
        // Animated dots
        React.createElement('div', {
          className: 'flex space-x-1 mt-4'
        },
          React.createElement('div', {
            className: 'w-2 h-2 bg-purple-500 rounded-full animate-bounce',
            style: { animationDelay: '0ms' }
          }),
          React.createElement('div', {
            className: 'w-2 h-2 bg-purple-500 rounded-full animate-bounce',
            style: { animationDelay: '150ms' }
          }),
          React.createElement('div', {
            className: 'w-2 h-2 bg-purple-500 rounded-full animate-bounce',
            style: { animationDelay: '300ms' }
          })
        )
      ),
      
      // Main modal content - only show when image is loaded
      imageLoaded && React.createElement('div', {
        className: 'relative max-w-7xl max-h-[90vh] w-full z-10 animate-in fade-in zoom-in duration-300'
      },
        // Close button - only visible when image is loaded
        React.createElement('button', {
          onClick: onClose,
          className: 'absolute -top-14 right-0 z-20 w-12 h-12 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 border border-white/20',
          type: 'button'
        },
          React.createElement('svg', {
            className: 'w-6 h-6',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M6 18L18 6M6 6l12 12'
            })
          )
        ),
        
        // Image container with enhanced styling
        React.createElement('div', {
          className: 'relative bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl shadow-black/50'
        },
          React.createElement('img', {
            src: imageUrl,
            alt: alt,
            className: 'w-full h-full object-contain',
            style: { maxHeight: '80vh' }
          })
        ),

        // Download button - only visible when image is loaded
        React.createElement('div', {
          className: 'absolute -bottom-16 left-0 right-0 flex justify-center'
        },
          React.createElement('a', {
            href: imageUrl,
            download: 'generated-image.png',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'group px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all duration-200 flex items-center gap-3 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 border border-purple-400/30'
          },
            React.createElement('svg', {
              className: 'w-5 h-5 group-hover:animate-bounce',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            },
              React.createElement('path', {
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: 2,
                d: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              })
            ),
            React.createElement('span', {
              className: 'font-medium'
            }, 'Download Image')
          )
        )
      ),
      
      // Hidden image for loading detection
      React.createElement('img', {
        src: imageUrl,
        alt: '',
        className: 'absolute invisible w-0 h-0 pointer-events-none',
        onLoad: () => setImageLoaded(true),
        onError: () => setImageLoaded(true) // Show modal even if image fails to load
      })
    ),
    document.body
  )
}
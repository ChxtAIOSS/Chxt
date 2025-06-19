import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { marked } from 'marked'

export interface AnimationState {
  animatedText: string
  isAnimating: boolean
  currentIndex: number
}

interface InternalAnimationState {
  targetContent: string
  displayedLength: number
  lastBlockEnd: number
  isInCodeBlock: boolean
  frameId: number | null
}

export function useAnimation() {
  const [animationState, setAnimationState] = useState<AnimationState>({
    animatedText: '',
    isAnimating: false,
    currentIndex: 0,
  })

  const animationRef = useRef<InternalAnimationState>({
    targetContent: '',
    displayedLength: 0,
    lastBlockEnd: 0,
    isInCodeBlock: false,
    frameId: null,
  })

  const parseContent = useCallback((content: string) => {
    try {
      const tokens = marked.lexer(content)
      let inCodeBlock = false
      let lastCodeBlockEnd = 0
      
      for (const token of tokens) {
        if (token.type === 'code') {
          inCodeBlock = true
          lastCodeBlockEnd = content.indexOf(token.text) + token.text.length
        }
      }
      
      return { inCodeBlock, lastCodeBlockEnd }
    } catch {
      return { inCodeBlock: false, lastCodeBlockEnd: 0 }
    }
  }, [])

  const animate = useCallback(() => {
    const state = animationRef.current
    
    const performAnimation = () => {
      const { targetContent, displayedLength } = state
      
      if (displayedLength >= targetContent.length) {
        state.frameId = null
        setAnimationState({
          animatedText: targetContent,
          isAnimating: false,
          currentIndex: targetContent.length,
        })
        return
      }
      
      const { inCodeBlock } = parseContent(targetContent.slice(0, displayedLength + 100))
      state.isInCodeBlock = inCodeBlock
      
      const remaining = targetContent.length - displayedLength
      const buffer = targetContent.length - displayedLength
      
      let charsPerFrame: number
      
      if (state.isInCodeBlock) {
        charsPerFrame = Math.min(Math.max(5, Math.ceil(buffer / 30)), 20)
      } else if (buffer > 1000) {
        charsPerFrame = Math.min(Math.ceil(buffer / 20), 50)
      } else if (buffer > 100) {
        charsPerFrame = Math.min(Math.ceil(buffer / 40), 8)
      } else {
        charsPerFrame = Math.min(Math.max(2, Math.ceil(remaining / 30)), 5)
      }
      
      state.displayedLength = Math.min(
        displayedLength + charsPerFrame,
        targetContent.length
      )
      
      flushSync(() => {
        setAnimationState({
          animatedText: targetContent.slice(0, state.displayedLength),
          isAnimating: true,
          currentIndex: state.displayedLength,
        })
      })
      
      state.frameId = requestAnimationFrame(performAnimation)
    }
    
    if (!state.frameId) {
      performAnimation()
    }
  }, [parseContent])

  const appendText = useCallback((text: string) => {
    animationRef.current.targetContent += text
    animate()
  }, [animate])

  const setTargetText = useCallback((text: string) => {
    animationRef.current.targetContent = text
    animate()
  }, [animate])

  const stopAnimation = useCallback(() => {
    if (animationRef.current.frameId) {
      cancelAnimationFrame(animationRef.current.frameId)
      animationRef.current.frameId = null
    }
    
    setAnimationState({
      animatedText: animationRef.current.targetContent,
      isAnimating: false,
      currentIndex: animationRef.current.targetContent.length,
    })
  }, [])

  const resetAnimation = useCallback(() => {
    if (animationRef.current.frameId) {
      cancelAnimationFrame(animationRef.current.frameId)
    }
    
    animationRef.current = {
      targetContent: '',
      displayedLength: 0,
      lastBlockEnd: 0,
      isInCodeBlock: false,
      frameId: null,
    }
    
    setAnimationState({
      animatedText: '',
      isAnimating: false,
      currentIndex: 0,
    })
  }, [])

  return {
    animationState,
    appendText,
    setTargetText,
    stopAnimation,
    resetAnimation,
    getTargetContent: () => animationRef.current.targetContent,
    getDisplayedLength: () => animationRef.current.displayedLength,
  }
}
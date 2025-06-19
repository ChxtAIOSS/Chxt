import { useState, useCallback } from 'react'

type ActionState = 'idle' | 'loading' | 'success'

export function useActionStates() {
  const [copyState, setCopyState] = useState<ActionState>('idle')
  const [regenerateState, setRegenerateState] = useState<ActionState>('idle')
  const [branchState, setBranchState] = useState<'idle' | 'active'>('idle')

  const triggerCopy = useCallback((callback?: () => void) => {
    setCopyState('success')
    callback?.()
    setTimeout(() => setCopyState('idle'), 2000)
  }, [])

  const triggerRegenerate = useCallback((callback?: () => void) => {
    setRegenerateState('loading')
    callback?.()
    setTimeout(() => {
      setRegenerateState('success')
      setTimeout(() => setRegenerateState('idle'), 2000)
    }, 1500)
  }, [])

  const triggerBranch = useCallback((callback?: () => void) => {
    setBranchState('active')
    callback?.()
    setTimeout(() => setBranchState('idle'), 1200)
  }, [])

  return {
    copyState,
    regenerateState,
    branchState,
    triggerCopy,
    triggerRegenerate,
    triggerBranch,
  }
}
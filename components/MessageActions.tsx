// components/MessageActions.tsx
"use client"

import React, { memo, useCallback } from 'react'
import { ModelDisplay } from './ModelDisplay'
import { CopyIcon, CheckIcon, EditIcon, RegenerateIcon, SpinnerIcon, BranchIcon } from './ActionIcons'
import { Tooltip } from './Tooltip'
import { useActionStates } from '@/hooks/useActionStates'

interface MessageActionsProps {
  messageId: string
  content: string
  model?: string
  isUser?: boolean
  onRegenerate?: (messageId: string) => void
  onCopy?: (content: string) => void
  onBranch?: (messageId: string) => void
  onEdit?: (messageId: string, content: string) => void
}

interface ActionButtonProps {
  onClick: () => void
  state: string
  disabled?: boolean
  children: React.ReactNode
}

const ActionButton = memo(({ onClick, state, disabled, children }: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`action-btn ${state !== 'idle' ? state : ''}`}
    style={{ 
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden'
    }}
  >
    {children}
  </button>
))

ActionButton.displayName = 'ActionButton'

export const MessageActions = memo(({ 
  messageId, 
  content, 
  model,
  isUser = false,
  onRegenerate, 
  onCopy, 
  onBranch,
  onEdit
}: MessageActionsProps) => {
  const { copyState, regenerateState, branchState, triggerCopy, triggerRegenerate, triggerBranch } = useActionStates()

  const handleCopy = useCallback(() => triggerCopy(() => onCopy?.(content)), [content, onCopy, triggerCopy])
  const handleRegenerate = useCallback(() => triggerRegenerate(() => onRegenerate?.(messageId)), [messageId, onRegenerate, triggerRegenerate])
  const handleBranch = useCallback(() => triggerBranch(() => onBranch?.(messageId)), [messageId, onBranch, triggerBranch])
  const handleEdit = useCallback(() => onEdit?.(messageId, content), [messageId, content, onEdit])

  return (
    <div className="flex items-center gap-2 mt-2 transition-opacity">
      {!isUser && model && <ModelDisplay model={model} />}
      
      <div className="flex items-center gap-1 ml-auto">
        <Tooltip content="Copy message" disabled={copyState === 'loading'}>
          <ActionButton onClick={handleCopy} state={copyState}>
            <div className="icon-container">
              <span className={copyState === 'success' ? 'icon-fade-out' : 'icon-fade-in'}>
                <CopyIcon className="w-4 h-4" />
              </span>
              <span className={copyState === 'success' ? 'icon-fade-in' : 'icon-fade-out'}>
                <CheckIcon className="w-4 h-4" />
              </span>
            </div>
          </ActionButton>
        </Tooltip>

        {isUser && (
          <Tooltip content="Edit message">
            <ActionButton onClick={handleEdit} state="idle">
              <EditIcon className="w-4 h-4" />
            </ActionButton>
          </Tooltip>
        )}

        {!isUser && (
          <>
            <Tooltip 
              content={regenerateState === 'loading' ? 'Regenerating...' : 'Regenerate response'}
              disabled={regenerateState === 'loading'}
            >
              <ActionButton 
                onClick={handleRegenerate} 
                state={regenerateState}
                disabled={regenerateState === 'loading'}
              >
                <div className="icon-container">
                  {regenerateState === 'loading' ? (
                    <SpinnerIcon className="w-4 h-4" />
                  ) : regenerateState === 'success' ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <RegenerateIcon className="w-4 h-4" />
                  )}
                </div>
              </ActionButton>
            </Tooltip>

            <Tooltip content="Create branch from this point">
              <ActionButton onClick={handleBranch} state={branchState}>
                <BranchIcon className="w-4 h-4" animated={branchState === 'active'} />
              </ActionButton>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  )
})

MessageActions.displayName = 'MessageActions'
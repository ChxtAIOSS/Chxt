"use client"

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { encryptApiKey } from '@/lib/crypto'
import { verifyApiKey } from '@/lib/api-verifier'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/hooks/useConfirm'
import styles from '@/components/ApiKeysPage.module.css'

const PROVIDERS = [
  { name: 'OpenAI', models: 'GPT-4o, DALL-E 3, Whisper', placeholder: 'sk-...' },
  { name: 'Anthropic', models: 'Claude 3.5 Sonnet, Opus, Haiku', placeholder: 'sk-ant-...' },
  { name: 'Google', models: 'Gemini 2.0 Flash, Pro, Ultra', placeholder: 'AIza...' },
  { name: 'DeepSeek', models: 'V3, Coder, Math specialist', placeholder: 'sk-...' },
]

export default function ApiKeysPage() {
  const { user } = useUser()
  const router = useRouter()
  const { show } = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}')
    Object.keys(stored).forEach(provider => {
      if (stored[provider]?.encryptedKey) {
        setKeys(prev => ({ ...prev, [provider]: '••••••••' }))
      }
    })
  }, [])
  
  const handleSaveKey = async (provider: string) => {
    const apiKey = keys[provider]
    if (!apiKey || apiKey === '••••••••') return
    
    setLoading(prev => ({ ...prev, [provider]: true }))
    
    try {
      if (!(await verifyApiKey(provider, apiKey))) {
        show('error', 'Invalid API Key', `The provided ${provider} API key is invalid.`)
        return
      }
      
      const encryptionKey = user?.id || localStorage.getItem('sessionId') || 'anonymous'
      const { encrypted, iv } = await encryptApiKey(apiKey, encryptionKey)
      
      const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}')
      stored[provider] = { encryptedKey: encrypted, iv, createdAt: Date.now(), verified: true }
      localStorage.setItem('chxt_api_keys', JSON.stringify(stored))
      
      setKeys(prev => ({ ...prev, [provider]: '••••••••' }))
      show('success', 'API Key Updated', `${provider} API key updated successfully.`)
    } catch (error) {
      show('error', 'Error', error instanceof Error ? error.message : 'Unknown error')
    }
    
    setLoading(prev => ({ ...prev, [provider]: false }))
  }
  
  const handleDeleteKey = async (provider: string) => {
    if (await confirm({
      type: 'danger',
      title: `Delete ${provider} API Key`,
      message: `Delete your ${provider} API key? You'll need to add it again to use ${provider} models.`,
      confirmText: 'Delete'
    })) {
      const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}')
      delete stored[provider]
      localStorage.setItem('chxt_api_keys', JSON.stringify(stored))
      setKeys(prev => ({ ...prev, [provider]: '' }))
      show('success', 'Key Deleted', `${provider} API key deleted.`)
    }
  }
  
  const isConnected = (provider: string) => {
    const stored = JSON.parse(localStorage.getItem('chxt_api_keys') || '{}')
    return !!stored[provider]?.encryptedKey
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.headerActions}>
          <button onClick={() => router.push('/settings')} className={styles.backButton}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </button>
          <div className={styles.actionButtons}>
            <button onClick={() => show('info', 'Import', 'Import functionality coming soon.')} className={styles.importExportBtn}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import
            </button>
            <button onClick={() => show('info', 'Export', 'Export functionality coming soon.')} className={styles.importExportBtn}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Export
            </button>
          </div>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Connect Your AI Models</h1>
          <p className={styles.subtitle}>Securely add API keys to unlock multiple AI providers</p>
        </div>
        
        <div className={styles.grid}>
          {PROVIDERS.map((provider) => (
            <div key={provider.name} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardInfo}>
                  <h3>{provider.name}</h3>
                  <p>{provider.models}</p>
                </div>
                {isConnected(provider.name) && <span className={styles.activeBadge}>Active</span>}
              </div>
              
              <input 
                type="password"
                placeholder={provider.placeholder}
                value={keys[provider.name] || ''}
                onChange={(e) => setKeys(prev => ({ ...prev, [provider.name]: e.target.value }))}
                className={styles.input}
              />
              
              <div className={styles.cardActions}>
                <div className={styles.status}>
                  {isConnected(provider.name) ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Connected
                    </>
                  ) : (
                    <>
                      <div className="w-3.5 h-3.5 border border-gray-500 rounded-full"></div>
                      Not connected
                    </>
                  )}
                </div>
                
                <div className={styles.actions}>
                  {isConnected(provider.name) ? (
                    <>
                      <button onClick={() => handleSaveKey(provider.name)} disabled={loading[provider.name]} className={`${styles.btn} ${styles.btnPrimary}`}>
                        {loading[provider.name] ? 'Saving...' : 'Update'}
                      </button>
                      <button onClick={() => handleDeleteKey(provider.name)} className={`${styles.btn} ${styles.btnDanger}`}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleSaveKey(provider.name)} disabled={loading[provider.name] || !keys[provider.name]} className={`${styles.btn} ${styles.btnPrimary}`}>
                      {loading[provider.name] ? 'Verifying...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className={styles.footer}>
          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          Privately stored and 100% secure
        </div>
      </div>
      
      {ConfirmDialog}
    </div>
  )
}
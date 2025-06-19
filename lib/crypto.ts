/**
 * Client-side encryption using Web Crypto API
 * Keys NEVER leave the client unencrypted
 */

// Generate a key from user's password/id
export async function generateKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  // Use a default salt if environment variable is not set
  const salt = process.env.NEXT_PUBLIC_ENCRYPTION_SALT || 'chxt-default-salt-2024'
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('chxt-api-keys'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt API key
export async function encryptApiKey(apiKey: string, userId: string): Promise<{
  encrypted: string
  iv: string
}> {
  try {
    const key = await generateKey(userId)
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(apiKey)
    )
    
    return {
      encrypted: btoa(new Uint8Array(encrypted).reduce((data, byte) => data + String.fromCharCode(byte), '')),
      iv: btoa(iv.reduce((data, byte) => data + String.fromCharCode(byte), ''))
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Decrypt API key
export async function decryptApiKey(
  encryptedData: string,
  iv: string,
  userId: string
): Promise<string> {
  try {
    const key = await generateKey(userId)
    const decoder = new TextDecoder()
    
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0))
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encryptedBuffer
    )
    
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption error:', error)
    console.error('UserId used for decryption:', userId)
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
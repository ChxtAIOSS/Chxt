export async function verifyApiKey(provider: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    })
    
    if (!response.ok) {
      return false
    }
    
    const result = await response.json()
    return result.valid === true
  } catch (error) {
    console.error(`Error verifying ${provider} key:`, error)
    return false
  }
}
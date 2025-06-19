interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIListModelsResponse {
  object: string;
  data: OpenAIModel[];
}

export async function POST(request: Request) {
  const { apiKey } = await request.json()
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    
    if (!response.ok) throw new Error('Failed to fetch models')
    
    const data = await response.json() as OpenAIListModelsResponse
    const chatModels = data.data
      .filter(m => m.id.includes('gpt') || m.id.includes('o1'))
      .map(m => m.id)
      .sort()
    
    return Response.json(chatModels)
  } catch {
    return Response.json([])
  }
} 
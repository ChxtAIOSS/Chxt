// app/api/messages/count/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const threadId = searchParams.get('threadId')
  
  if (!threadId) {
    return NextResponse.json({ count: 0 })
  }
  
  // In a real implementation, you would query your database
  // For now, we'll return 0 to trigger title generation on first message
  return NextResponse.json({ count: 0 })
}
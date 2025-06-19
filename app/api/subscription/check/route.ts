// app/api/subscription/check/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ hasSubscription: false })
    }
    
    // In production, check against your database
    // For now, return false to use user's own keys
    const hasSubscription = false // TODO: Check actual subscription status
    
    return NextResponse.json({ hasSubscription })
    
  } catch {
    return NextResponse.json({ hasSubscription: false })
  }
}
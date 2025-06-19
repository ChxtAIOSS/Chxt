"use client"

import dynamic from 'next/dynamic'
import { ConvexClientProvider } from './ConvexClientProvider'
import { SessionProvider } from '@/contexts/SessionProvider'

const App = dynamic(() => import('./App'), {
  ssr: false,
})

export default function Page() {
  return (
    <ConvexClientProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ConvexClientProvider>
  )
}
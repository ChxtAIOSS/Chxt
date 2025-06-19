// app/ClientApp.tsx
"use client"

import { ConvexClientProvider } from './ConvexClientProvider'
import App from './App'

export default function ClientApp() {
  return (
    <ConvexClientProvider>
      <App />
    </ConvexClientProvider>
  )
}
import dynamic from 'next/dynamic'

export const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false })
export const ModelSelector = dynamic(() => import('@/components/ModelSelector'), { ssr: false })
export const ToastProvider = dynamic(() => import('@/components/Toast'), { ssr: false })
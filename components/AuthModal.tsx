"use client"

import { useState, useEffect } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import styles from './AuthModal.module.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

const socialProviders = [
  { name: 'Google', strategy: 'oauth_google' as const, icon: (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )},
  { name: 'GitHub', strategy: 'oauth_github' as const, icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  )}
]

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const updateForm = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => 
    setFormData(prev => ({ ...prev, [field]: e.target.value }))

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const { email, password, firstName, lastName } = formData
    
    if (!email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email'
    
    if (!password) newErrors.password = 'Password is required'
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    
    if (isSignUp) {
      if (!firstName) newErrors.firstName = 'First name is required'
      if (!lastName) newErrors.lastName = 'Last name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setIsLoading(true)
    const { email, password, firstName, lastName } = formData
    
    try {
      if (isSignUp && signUpLoaded && signUp) {
        const result = await signUp.create({ emailAddress: email, password, firstName, lastName })
        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          onClose()
        }
      } else if (!isSignUp && signInLoaded && signIn) {
        const result = await signIn.create({ identifier: email, password })
        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId })
          onClose()
        }
      }
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Something went wrong' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialAuth = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!signInLoaded || !signIn) return
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      })
    } catch (error) {
      console.error('Social auth error:', error)
    }
  }

  if (!isOpen) return null

  const FormInput = ({ field, type = 'text', placeholder }: { field: string, type?: string, placeholder: string }) => (
    <div className={styles.formGroup}>
      <label htmlFor={field} className={styles.formLabel}>
        {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
      </label>
      <input
        id={field}
        type={type}
        value={formData[field as keyof typeof formData]}
        onChange={updateForm(field)}
        className={`${styles.formInput} ${errors[field] ? styles.error : ''}`}
        placeholder={placeholder}
      />
      {errors[field] && <span className={styles.formError}>{errors[field]}</span>}
    </div>
  )

  return (
    <div className={styles.authOverlay}>
      <div className={styles.orbContainer}>
        {[1, 2, 3].map(i => <div key={i} className={`${styles.orb} ${styles[`orb${i}`]}`}></div>)}
      </div>
      
      <div className={styles.particleGrid}></div>
      
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <button onPointerDown={onClose} className={styles.authClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          <div className={styles.authHeader}>
            <div className={styles.authLogo}>
              <div className={styles.logoIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <h1 className={styles.authTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <p className={styles.authSubtitle}>
              {isSignUp ? 'Join thousands of users already using our platform' : 'Sign in to your account to continue'}
            </p>
          </div>

          <div className={styles.authSocial}>
            {socialProviders.map(({ name, strategy, icon }) => (
              <button
                key={strategy}
                type="button"
                onPointerDown={() => handleSocialAuth(strategy)}
                className={styles.socialButton}
              >
                {icon}
                Continue with {name}
              </button>
            ))}
          </div>

          <div className={styles.authDivider}><span>or</span></div>

          <form onSubmit={handleSubmit} className={styles.authForm}>
            {isSignUp && (
              <div className={styles.formRow}>
                <FormInput field="firstName" placeholder="John" />
                <FormInput field="lastName" placeholder="Doe" />
              </div>
            )}
            
            <FormInput field="email" type="email" placeholder="john@example.com" />
            <FormInput field="password" type="password" placeholder="••••••••" />

            {errors.submit && <div className={styles.formErrorMessage}>{errors.submit}</div>}

            <button type="submit" disabled={isLoading} className={styles.authSubmit}>
              {isLoading ? <div className={styles.loadingSpinner}></div> : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className={styles.authSwitch}>
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <button
              type="button"
              onPointerDown={() => setIsSignUp(!isSignUp)}
              className={styles.authSwitchButton}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
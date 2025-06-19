"use client"

import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import styles from './AccountDropdown.module.css'

export function AccountDropdown() {
  const { user, isSignedIn } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  if (!isSignedIn || !user) return null

  const initials = user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || 'U'
  const displayName = user.fullName || user.firstName || 'User'
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress

  const handleManageAccount = () => {
    setIsOpen(false)
    openUserProfile()
  }

  const handleHelp = () => {
    setIsOpen(false)
    // Add your help/support URL here
    window.open('https://x.com/inveeest', '_blank')
  }

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut()
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      {/* Profile Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.profileButton} ${isOpen ? styles.profileButtonActive : ''}`}
      >
        <div className={styles.avatar}>
          {user.imageUrl ? (
            <Image 
              src={user.imageUrl} 
              alt="Profile" 
              width={32}
              height={32}
              className={styles.avatarImage}
            />
          ) : (
            <span className={styles.avatarText}>{initials}</span>
          )}
        </div>
        
        <svg 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7"
            stroke="currentColor"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ''}`}>
        <div className={styles.dropdownContent}>
          {/* User Info */}
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {user.imageUrl ? (
                <Image 
                  src={user.imageUrl} 
                  alt="Profile" 
                  width={40}
                  height={40}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.userAvatarText}>{initials}</span>
              )}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userEmail}>{email}</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className={styles.menuItems}>
            <button onClick={handleManageAccount} className={styles.menuItem}>
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor"/>
              </svg>
              <span>Manage Account</span>
            </button>
            
            <button onClick={handleHelp} className={styles.menuItem}>
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor"/>
              </svg>
              <span>Help & Support</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className={styles.signOutSection}>
            <button onClick={handleSignOut} className={styles.signOutButton}>
              <svg className={styles.menuIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor"/>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
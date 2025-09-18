"use client"

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { TimeoutAlert } from '@/components/auth/timeout-alert'
import { setTokenExpiryHandler } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  handleTokenExpiry: () => void
  login: (token: string, tokenType?: string, email?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false)

  const handleTokenExpiry = useCallback(() => {
    setIsAuthenticated(false)
    setShowTimeoutAlert(true)
  }, [])

  // Check authentication status on mount and register token expiry handler
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const authStatus = localStorage.getItem('isAuthenticated') === 'true'
    setIsAuthenticated(token && authStatus ? true : false)

    // Register the token expiry handler with the API utility
    setTokenExpiryHandler(handleTokenExpiry)
  }, [handleTokenExpiry])

  const login = useCallback((token: string, tokenType = 'bearer', email?: string) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('token_type', tokenType)
    localStorage.setItem('isAuthenticated', 'true')
    if (email) {
      localStorage.setItem('userEmail', email)
    }
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_type')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userEmail')
    setIsAuthenticated(false)
  }, [])

  const closeTimeoutAlert = useCallback(() => {
    setShowTimeoutAlert(false)
  }, [])

  const contextValue: AuthContextType = {
    isAuthenticated,
    handleTokenExpiry,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <TimeoutAlert 
        isVisible={showTimeoutAlert} 
        onClose={closeTimeoutAlert}
        redirectDelay={5}
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
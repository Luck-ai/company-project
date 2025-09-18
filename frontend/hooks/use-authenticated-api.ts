"use client"

import { useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/components/auth/auth-provider'

export function useAuthenticatedApi() {
  const { handleTokenExpiry } = useAuth()

  const authenticatedFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    try {
      const response = await apiFetch(path, options)
      
      // If we get a 401, the token expiry handler should already be triggered
      // by the apiFetch function, so we just need to throw an error here
      if (response.status === 401) {
        throw new Error('Authentication failed - session expired')
      }
      
      return response
    } catch (error) {
      // If there's a network error or other issue, still check if it might be auth-related
      if (error instanceof Error && error.message.includes('401')) {
        handleTokenExpiry()
      }
      throw error
    }
  }, [handleTokenExpiry])

  return { authenticatedFetch }
}
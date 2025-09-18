"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, X } from 'lucide-react'

interface TimeoutAlertProps {
  isVisible: boolean
  onClose?: () => void
  redirectDelay?: number // Delay in seconds before auto-redirect
}

export function TimeoutAlert({ 
  isVisible, 
  onClose, 
  redirectDelay = 5 
}: TimeoutAlertProps) {
  const router = useRouter()
  const [countdown, setCountdown] = React.useState(redirectDelay)

  React.useEffect(() => {
    if (!isVisible) return

    // Clear any existing auth data
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_type')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userEmail')

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, router])

  const handleLoginNow = () => {
    if (onClose) onClose()
    router.push('/login')
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md">
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
          <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <AlertTitle className="text-orange-800 dark:text-orange-200">
                Session Expired
              </AlertTitle>
              <AlertDescription className="mt-2 text-orange-700 dark:text-orange-300">
                Your session has timed out for security reasons. You will be redirected to the login page in {countdown} seconds.
              </AlertDescription>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleLoginNow}
              className="bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              Login Now
            </Button>
          </div>
        </Alert>
      </div>
    </div>
  )
}
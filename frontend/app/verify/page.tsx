"use client"

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'pending'|'success'|'error'>('pending')
  const [message, setMessage] = useState('Verifying...')

  const runVerify = async () => {
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    if (!token || !email) {
      setStatus('error')
      setMessage('Missing token or email')
      return
    }

    try {
      const res = await apiFetch(`/users/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setStatus('error')
        setMessage(err.detail || err.message || 'Verification failed')
        return
      }
      const data = await res.json()
      setStatus('success')
      setMessage(data.detail || 'Email verified')
      setTimeout(() => router.push('/login'), 1500)
    } catch (e) {
      setStatus('error')
      setMessage('Verification failed. Please try again later.')
    }
  }

  useEffect(() => {
    runVerify()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center auth-hero p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email verification</CardTitle>
          <CardDescription>Confirm your email to finish setting up your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className={`text-base ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-green-600' : 'text-foreground'}`}>{message}</p>
            <div className="flex gap-2 justify-end">
              {status === 'error' ? (
                <>
                  <Button variant="ghost" onClick={runVerify}>Retry</Button>
                  <Link href="/signup"><Button>Create account</Button></Link>
                </>
              ) : status === 'success' ? (
                <Link href="/login"><Button>Go to sign in</Button></Link>
              ) : (
                <Button variant="ghost">Verifying...</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifySent() {
  return (
  <div className="min-h-screen flex items-center justify-center auth-hero p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>We sent a verification link to your email address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-base">Thanks for signing up! We've sent a verification email to the address you provided. Click the link in the email to activate your account.</p>
            <p className="text-sm text-muted-foreground">Didn't receive the email? Check your spam folder.</p>
            <div className="flex gap-2 justify-end">
              <Link href="/login">
                <Button variant="ghost">Back to sign in</Button>
              </Link>
              <Link href="/signup">
                <Button>Create another account</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

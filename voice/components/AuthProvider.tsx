'use client'

import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth-client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [redirectTo, setRedirectTo] = useState('/')

  useEffect(() => {
    setRedirectTo(typeof window !== 'undefined' ? window.location.origin + '/' : '/')
  }, [])

  const onSessionChange = () => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth')) {
      router.replace('/')
    } else {
      router.reload()
    }
  }

  return (
    <NeonAuthUIProvider
      authClient={authClient as any}
      navigate={(path) => router.push(path)}
      replace={(path) => router.replace(path)}
      onSessionChange={onSessionChange}
      Link={Link as any}
      redirectTo={redirectTo}
      emailOTP
      credentials={{ forgotPassword: true }}
      social={{ providers: ['google'] }}
    >
      {children}
    </NeonAuthUIProvider>
  )
}

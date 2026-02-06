import { AuthView } from '@neondatabase/auth/react/ui'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

/**
 * Auth pages: /auth/sign-in, /auth/sign-up, /auth/forgot-password, etc.
 */
export default function AuthPage() {
  const router = useRouter()
  const path = (router.query.path as string[] | undefined) ?? []
  const pathname = path[0] ?? 'sign-in'
  const [redirectTo, setRedirectTo] = useState('/')

  useEffect(() => {
    setRedirectTo(typeof window !== 'undefined' ? window.location.origin + '/' : '/')
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background, #f5f5f5)' }}>
      <AuthView pathname={pathname} redirectTo={redirectTo} />
    </div>
  )
}

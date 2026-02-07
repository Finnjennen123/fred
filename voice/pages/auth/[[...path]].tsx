import { useRouter } from 'next/router'
import { useEffect } from 'react'

// Auth disabled — redirect to home
export default function AuthPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return null
}

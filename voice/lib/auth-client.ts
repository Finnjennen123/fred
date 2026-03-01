import { createAuthClient } from '@neondatabase/auth/next'

/**
 * Auth client for Neon Auth. Uses NEON_AUTH_BASE_URL (server) and
 * NEXT_PUBLIC_NEON_AUTH_URL (client) from env. Use in client components
 * for sign-in, sign-up, useSession(), etc.
 */
export const authClient = createAuthClient()

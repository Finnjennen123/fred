import { NextRequest, NextResponse } from 'next/server'
/**
 * Auth is temporarily disabled.
 *
 * This project previously used Neon Auth middleware to protect all non-API routes.
 * For now we allow all users to access the site without signing in.
 */

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Keep matcher for future re-enablement; middleware is currently a no-op.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

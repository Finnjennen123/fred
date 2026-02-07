import { NextResponse } from 'next/server'

// Auth disabled — return empty session for any auth API call
const stub = async () => NextResponse.json({ user: null }, { status: 200 })

export const GET = stub
export const POST = stub

// app/api/logout/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ status: 'logged out' })

  // __session cookie устгах
  res.cookies.set('__session', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  // user_role cookie устгах
  res.cookies.set('user_role', '', {
    maxAge: 0,
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  return res
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Custom-claim role-г аюулгүй унших
type Role = 'student' | 'moderator' | 'teacher' | 'admin'
function readRole(decoded: DecodedIdToken): Role {
  const r = (decoded as DecodedIdToken & { role?: unknown }).role
  return (typeof r === 'string' && (['student', 'moderator', 'teacher', 'admin'] as const).includes(r as Role))
    ? (r as Role)
    : 'student'
}

// Error → string
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { token?: unknown }
    const token = typeof body.token === 'string' ? body.token : undefined

    if (!token) {
      return NextResponse.json({ error: 'Token not provided' }, { status: 400 })
    }

    // ID Token-г шалгах
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid
    const userRole = readRole(decodedToken)

    // Firestore-с хэрэглэгчийн профайл авах
    const userDoc = await adminFirestore.collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    // Session cookie (7 хоног) - ✅ verify-session-тэй нэгтгэсэн
    const expiresInMs = 60 * 60 * 24 * 7 * 1000
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn: expiresInMs })

    const res = NextResponse.json({
      success: true,
      uid,
      role: userRole,
      profile: userData || {}
    }, { status: 200 })

    // __session cookie
    res.cookies.set('__session', sessionCookie, {
      maxAge: Math.floor(expiresInMs / 1000), // seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    })

    return res
  } catch (e: unknown) {
    console.error('Login API Error:', errMsg(e))
    return NextResponse.json(
      { error: errMsg(e) || 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST бус хүсэлтийг блоклох
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
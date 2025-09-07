// app/api/auth/verify-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 7 хоног (миллисекунд)
const EXPIRES_IN = 7 * 24 * 60 * 60 * 1000

type Role = 'student' | 'moderator' | 'teacher' | 'admin'
function readRole(decoded: DecodedIdToken): Role {
  const r = (decoded as DecodedIdToken & { role?: unknown }).role
  return (typeof r === 'string' && (['student','moderator','teacher','admin'] as const).includes(r as Role))
    ? (r as Role)
    : 'student'
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

export async function POST(req: NextRequest) {
  try {
    // 0) Bearer ID token ирсэн эсэхийг шалгана (signin/bootstrap)
    const authz = req.headers.get('authorization') || req.headers.get('Authorization')
    let idToken = ''
    if (authz?.startsWith('Bearer ')) {
      idToken = authz.slice('Bearer '.length).trim()
    } else {
      // fallback: body.idToken
      const body = await req.json().catch(() => null) as { idToken?: unknown } | null
      if (typeof body?.idToken === 'string') idToken = body.idToken
    }

    if (idToken) {
      // ID token-ээ баталгаажуулж session cookie үүсгэнэ
      const decoded = await adminAuth.verifyIdToken(idToken, true)
      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: EXPIRES_IN })

      const res = NextResponse.json(
        { user: { uid: decoded.uid, role: readRole(decoded) }, set: 'session' },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
      res.cookies.set({
        name: '__session',
        value: sessionCookie,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: EXPIRES_IN / 1000,
      })
      return res
    }

    // 1) Session cookie байгаа эсэх
    const sessionCookie = req.cookies.get('__session')?.value
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
      return NextResponse.json(
        { user: { uid: decoded.uid, role: readRole(decoded) } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 2) Cookie ч үгүй, token ч үгүй → signed-out гэж үзээд 204 (хоосон бие)
    {
      const res = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
      res.cookies.set({
        name: '__session',
        value: '',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0),
      })
      return res
    }
  } catch (e: unknown) {
    console.error('verify-session error:', errMsg(e))
    const res = NextResponse.json(
      { error: 'Invalid or expired session.', details: errMsg(e) },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
    // Алдаа гарвал cookie-г цэвэрлээд буцаана
    res.cookies.set({
      name: '__session',
      value: '',
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
    })
    return res
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

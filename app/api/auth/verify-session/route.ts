import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    // Session cookie-г шалгах нь гол зорилго
    const sessionCookie = req.cookies.get('__session')?.value
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      // ✅ ЗАСВАРЛАСАН: Клиент талыг дахин нэвтрүүлэх custom token үүсгэв.
      const customToken = await adminAuth.createCustomToken(decoded.uid);

      return NextResponse.json(
        { 
          user: { uid: decoded.uid, role: readRole(decoded) },
          customToken: customToken // ✅ Custom token-г хариуд нэмэв.
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // ID token-г шалгах (энгийн нэвтрэлт)
    const body = await req.json().catch(() => null) as { token?: unknown } | null
    const idToken = typeof body?.token === 'string' ? body.token : undefined
    if(idToken) {
        const decoded = await adminAuth.verifyIdToken(idToken, true);
        const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 хоног
        const newSessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        const res = NextResponse.json({ user: { uid: decoded.uid, role: readRole(decoded) } });
        res.cookies.set('__session', newSessionCookie, {
            maxAge: expiresIn / 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', sameSite: 'lax',
        });
        return res;
    }

    // Cookie ч үгүй, token ч үгүй бол 204 буцаана.
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

  } catch (e: unknown) {
    console.error('verify-session error:', errMsg(e))
    const res = NextResponse.json(
      { error: 'Invalid or expired session.', details: errMsg(e) },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
    res.cookies.set({
      name: '__session', value: '', path: '/', httpOnly: true,
      secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: new Date(0),
    })
    return res
  }
}
// app/api/auth/verify-session/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'

type Role = 'student' | 'moderator' | 'teacher' | 'admin'

function readRole(value: unknown): Role {
  return value === 'admin' || value === 'teacher' || value === 'moderator' ? value : 'student'
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('__session')?.value
    if (!sessionCookie) {
      // Нэвтрээгүй
      return new NextResponse(null, { status: 204 })
    }

    // ID/Session cookie-г баталгаажуулна (хүчингүй/эргүүлсэн эсэхийг шалгах бол 2-р параметрийг true байлга)
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)

    const uid = decoded.uid
    const role = readRole((decoded as Record<string, unknown>).role)

    // Клиент автоматаар дахин нэвтрүүлэхийн тулд custom token үүсгэнэ
    const customToken = await adminAuth.createCustomToken(uid, { role })

    // ✅ Нэмэлтээр role-ыг давхар буцааж middleware-тэй нийцүүлэв (backward compatible)
    return NextResponse.json({ customToken, role })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Verify session failed'
    // Token дууссан/хүчингүй бол 204 буцааж cookie-гээ цэвэрлэнэ
    if (msg.includes('expired') || msg.includes('revoked') || msg.includes('invalid')) {
      const res = new NextResponse(null, { status: 204 })
      res.cookies.set('__session', '', { maxAge: 0, path: '/' })
      return res
    }
    console.error('Verify Session Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
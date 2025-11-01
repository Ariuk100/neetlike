// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- CSRF / CORS helpers (локал, давхардсан логикийг эвдэхгүйгээр) ----
const PROD_ALLOWED_ORIGINS = ['https://physx.mn', 'https://www.physx.mn'] as const
const DEV_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const

function allowedOrigins(): readonly string[] {
  return process.env.NODE_ENV === 'production'
    ? PROD_ALLOWED_ORIGINS
    : [...PROD_ALLOWED_ORIGINS, ...DEV_ALLOWED_ORIGINS]
}
function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && allowedOrigins().includes(origin)
}
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' }
  if (isAllowedOrigin(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
    headers['Access-Control-Allow-Headers'] = 'content-type'
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  }
  return headers
}

// Custom-claim role-г аюулгүй унших (одоогийн логикийг хадгална)
type Role = 'student' | 'moderator' | 'teacher' | 'admin'
function readRole(decoded: DecodedIdToken): Role {
  const r = (decoded as DecodedIdToken & { role?: unknown }).role
  return (typeof r === 'string' && (['student', 'moderator', 'teacher', 'admin'] as const).includes(r as Role))
    ? (r as Role)
    : 'student'
}

// Дотоод алдааг лог луу, клиент рүү ерөнхий мессеж
function toLogMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

// Preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return new NextResponse(null, { status: 403, headers: corsHeaders(origin) })
  }
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers: corsHeaders(origin) })
  }

  // Content-Type + body size guard (одоогийн логикийг эвдэхгүй)
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('application/json')) {
    return NextResponse.json({ error: 'Unsupported Media Type' }, { status: 415, headers: corsHeaders(origin) })
  }

  const rawBody = await req.text()
  const MAX_BYTES = 64 * 1024
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload Too Large' }, { status: 413, headers: corsHeaders(origin) })
  }

  let body: unknown
  try {
    body = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(origin) })
  }

  const token = (() => {
    if (body && typeof body === 'object' && 'token' in body) {
      const v = (body as { token?: unknown }).token
      return typeof v === 'string' ? v : undefined
    }
    return undefined
  })()

  try {
    if (!token) {
      return NextResponse.json({ error: 'Token not provided' }, { status: 400, headers: corsHeaders(origin) })
    }

    // ID Token-г шалгах (одоогийн зан үйлийг өөрчлөхгүй: checkRevoked параметр нэмэхгүй)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid
    const userRole = readRole(decodedToken)

    // Firestore-с хэрэглэгчийн профайл авах (одоогийн логик хэвээр)
    const userDoc = await adminFirestore.collection('users').doc(uid).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    // Session cookie (7 хоног) — одоогийн утгыг хадгална
    const expiresInMs = 60 * 60 * 24 * 7 * 1000
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn: expiresInMs })

    const res = NextResponse.json(
      {
        success: true,
        uid,
        role: userRole,
        profile: userData || {},
      },
      { status: 200, headers: corsHeaders(origin) },
    )

    // __session cookie (одоогийн атрибутуудаа хадгална)
    res.cookies.set('__session', sessionCookie, {
      maxAge: Math.floor(expiresInMs / 1000), // seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    })

    return res
  } catch (e: unknown) {
    console.error('Login API Error:', toLogMessage(e))
    // Клиентэд ерөнхий мессеж (өмнө дотоод алдааг ил гаргаж байсан хэсгийг хатуулав)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) },
    )
  }
}

// POST бус хүсэлтийг блоклох (headers-аа жигд тавина)
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders(origin) })
}
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin'
import type { DecodedIdToken } from 'firebase-admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

type Role = 'student' | 'moderator' | 'teacher' | 'admin'
const ALLOWED_ROLES = new Set<Role>(['student', 'moderator', 'teacher', 'admin'])

function readRole(decoded: DecodedIdToken): Role {
  const r = (decoded as DecodedIdToken & { role?: unknown }).role
  return (typeof r === 'string' && (['student', 'moderator', 'teacher', 'admin'] as const).includes(r as Role))
    ? (r as Role)
    : 'student'
}
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403, headers: corsHeaders(origin) })
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers: corsHeaders(origin) })
  }

  // ---- Content-Type + size guard ----
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.startsWith('application/json')) {
    return NextResponse.json({ error: 'Unsupported Media Type' }, { status: 415, headers: corsHeaders(origin) })
  }
  const rawBody = await req.text()
  const MAX_BYTES = 64 * 1024
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload Too Large' }, { status: 413, headers: corsHeaders(origin) })
  }

  try {
    // Safe JSON parse
    let parsed: unknown
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(origin) })
    }

    // Админ эсэхийг session cookie-гоор шалгана
    const sessionCookie = req.cookies.get('__session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) })
    }
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const callerUid = decoded.uid
    const callerRole = readRole(decoded)
    if (callerRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can change user roles' },
        { status: 403, headers: corsHeaders(origin) },
      )
    }

    // Body type-тайгаар унших
    const uid = (() => {
      if (parsed && typeof parsed === 'object' && 'uid' in parsed) {
        const v = (parsed as { uid?: unknown }).uid
        return typeof v === 'string' ? v.trim() : ''
      }
      return ''
    })()
    const role = (() => {
      if (parsed && typeof parsed === 'object' && 'role' in parsed) {
        const v = (parsed as { role?: unknown }).role
        return typeof v === 'string' ? (v as Role) : undefined
      }
      return undefined
    })()

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400, headers: corsHeaders(origin) })
    }
    if (!role || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${Array.from(ALLOWED_ROLES).join(', ')}` },
        { status: 400, headers: corsHeaders(origin) },
      )
    }
    if (uid === callerUid && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot change your own role to non-admin' },
        { status: 400, headers: corsHeaders(origin) },
      )
    }

    await adminAuth.setCustomUserClaims(uid, { role })
    await adminAuth.revokeRefreshTokens(uid)

    try {
      await adminFirestore.collection('users').doc(uid).set({ role }, { merge: true })
    } catch (e: unknown) {
      console.warn('Firestore role sync failed:', uid, errMsg(e))
    }

    return NextResponse.json(
      { success: true, message: `User ${uid} role set to ${role}. User must re-login.`, requiresReauth: true },
      { status: 200, headers: corsHeaders(origin) },
    )
  } catch (e: unknown) {
    // Дотоод алдааг лог дээр үлдээнэ
    console.error('set-user-role error:', errMsg(e))
    // Клиентэд ерөнхий мессеж л буцаана
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) },
    )
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders(origin) })
}
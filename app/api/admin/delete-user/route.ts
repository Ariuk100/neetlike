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

type Role = 'admin' | 'moderator' | 'teacher' | 'student'
function readRole(decoded: DecodedIdToken): Role {
  const r = (decoded as DecodedIdToken & { role?: unknown }).role
  return (typeof r === 'string' && (['admin', 'moderator', 'teacher', 'student'] as const).includes(r as Role))
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
        { error: 'Forbidden: Only admins can delete users' },
        { status: 403, headers: corsHeaders(origin) },
      )
    }

    // Body-аас uid-ийг төрөлтэйгөөр уншина
    const uid = (() => {
      if (parsed && typeof parsed === 'object' && 'uid' in parsed) {
        const v = (parsed as { uid?: unknown }).uid
        return typeof v === 'string' ? v.trim() : ''
      }
      return ''
    })()

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400, headers: corsHeaders(origin) })
    }
    if (uid === callerUid) {
      return NextResponse.json(
        { error: 'Admins cannot delete themselves' },
        { status: 400, headers: corsHeaders(origin) },
      )
    }

    let authDeleted = false
    try {
      await adminAuth.deleteUser(uid)
      authDeleted = true
    } catch (e: unknown) {
      const code = typeof (e as { code?: unknown })?.code === 'string' ? (e as { code: string }).code : undefined
      if (code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'User not found in Firebase Auth.' }, { status: 404, headers: corsHeaders(origin) })
      }
      throw e
    }

    let firestoreDeleted = false
    try {
      await adminFirestore.collection('users').doc(uid).delete()
      firestoreDeleted = true
    } catch (e: unknown) {
      console.error('Firestore delete error for uid:', uid, errMsg(e))
    }

    if (authDeleted && firestoreDeleted) {
      return NextResponse.json(
        { success: true, message: `User ${uid} deleted from Auth & Firestore.` },
        { status: 200, headers: corsHeaders(origin) }
      )
    }
    if (authDeleted && !firestoreDeleted) {
      return NextResponse.json(
        { success: true, warning: 'Auth deleted but Firestore doc delete failed. Check logs.', uid },
        { status: 200, headers: corsHeaders(origin) }
      )
    }
    return NextResponse.json({ error: 'Unknown state' }, { status: 500, headers: corsHeaders(origin) })
  } catch (e: unknown) {
    console.error('Error deleting user:', errMsg(e))
    // Клиентэд ерөнхий мессеж буцаана
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders(origin) })
}
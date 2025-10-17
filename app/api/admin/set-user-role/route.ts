// app/api/admin/set-user-role/route.ts
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT } from 'jose'

// ---------- CORS (таны одоо байсан логик) ----------
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

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403, headers: corsHeaders(origin) })
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

// ---------- Auth (admin шалгах) ----------
type Role = 'student' | 'moderator' | 'teacher' | 'admin'
const ALLOWED_ROLES = new Set<Role>(['student', 'moderator', 'teacher', 'admin'])

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!
const issuer = `https://securetoken.google.com/${projectId}`
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

async function requireAdminFromCookie(req: NextRequest) {
  const cookie = req.cookies.get('__session')?.value
  if (!cookie) {
    const e = new Error('Unauthorized'); (e as any).status = 401; throw e
  }
  const { payload } = await jwtVerify(cookie, jwks, { issuer, audience: projectId })
  const role = (payload as any)?.role as Role | undefined
  if (role !== 'admin') {
    const e = new Error('Forbidden: Only admins'); (e as any).status = 403; throw e
  }
  return payload // { user_id, ... }
}

// ---------- Service Account → OAuth2 access token ----------
/**
 * ENV:
 *  - FIREBASE_SERVICE_ACCOUNT_EMAIL
 *  - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY (PKCS8 PEM, \n-тай хадгалсан)
 */
const SA_EMAIL = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL!
const SA_PRIVATE_KEY_PEM = (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')

async function getGoogleAccessToken(): Promise<string> {
  if (!SA_EMAIL || !SA_PRIVATE_KEY_PEM) throw new Error('Missing service account envs')
  const privateKey = await importPKCS8(SA_PRIVATE_KEY_PEM, 'RS256')
  const now = Math.floor(Date.now() / 1000)

  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/identitytoolkit' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(SA_EMAIL)
    .setSubject(SA_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const form = new URLSearchParams()
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
  form.set('assertion', assertion)

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!r.ok) throw new Error(`OAuth token exchange failed: ${await r.text()}`)
  const j = await r.json() as { access_token: string }
  return j.access_token
}

// ---------- Identity Toolkit Admin REST helpers ----------
async function setCustomClaims(localId: string, claims: Record<string, unknown>) {
  const accessToken = await getGoogleAccessToken()
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`
  const body = {
    localId,
    // customAttributes бол JSON string байх ёстой
    customAttributes: JSON.stringify(claims),
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    const e = new Error(`accounts:update failed: ${txt}`); (e as any).status = r.status; throw e
  }
}

async function revokeRefreshTokens(localId: string) {
  const accessToken = await getGoogleAccessToken()
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signOut`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ localId }),
  })
  if (!r.ok) {
    const txt = await r.text()
    const e = new Error(`accounts:signOut failed: ${txt}`); (e as any).status = r.status; throw e
  }
}

// (Сонголт) таны Firestore role-г sync хийх өөр backend байвал энд proxy хийж болно.
async function syncRoleToBackend(uid: string, role: Role) {
  const backendUrl = process.env.ADMIN_BACKEND_SET_ROLE_URL
  const token = process.env.ADMIN_BACKEND_BEARER
  if (!backendUrl || !token) return false
  const r = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid, role }),
  })
  return r.ok
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

// ---------- Handler ----------
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers: corsHeaders(origin) })
  }

  try {
    const caller = await requireAdminFromCookie(req)
    const callerUid = (caller as any).user_id as string

    const body = (await req.json()) as { uid?: unknown; role?: unknown }
    const uid = typeof body.uid === 'string' ? body.uid.trim() : ''
    const role = typeof body.role === 'string' ? (body.role as Role) : undefined

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

    // 1) Custom claims шинэчлэх
    await setCustomClaims(uid, { role })

    // 2) Refresh tokens revoke (дахин нэвтрэх шаардана)
    await revokeRefreshTokens(uid)

    // 3) (сонголт) таны Firestore/doc sync-ийг өөр backend-аар хийх
    const synced = await syncRoleToBackend(uid, role).catch(() => false)

    return NextResponse.json(
      {
        success: true,
        message: `User ${uid} role set to ${role}. User must re-login.`,
        requiresReauth: true,
        firestoreSynced: synced || false,
      },
      { status: 200, headers: corsHeaders(origin) },
    )
  } catch (e) {
    const status = (e as any)?.status ?? 500
    return NextResponse.json(
      { error: errMsg(e) || 'Failed to set user role' },
      { status, headers: corsHeaders(origin) },
    )
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders(origin) })
}
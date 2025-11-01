import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

// ---- CSRF / CORS helpers ----
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
    headers['Access-Control-Allow-Headers'] = 'content-type, authorization'
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  }
  return headers
}

// Клиентээс зөвшөөрөх түлхүүрүүд (passport байхгүй)
const ALLOWED_PROFILE_FIELDS = [
  'name', 'lastName', 'phone', 'birthYear', 'gender',
  'province', 'district', 'school', 'grade', 'location',
] as const
type AllowedKey = (typeof ALLOWED_PROFILE_FIELDS)[number]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

// --- Normalizers ---
const normStr = (v: unknown) => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t : undefined
}
const normPhone = (v: unknown) => {
  if (typeof v !== 'string') return undefined
  const d = v.replace(/\D/g, '')
  return /^\d{8}$/.test(d) ? d : undefined
}
const G_LETTER = '[A-Za-zА-ЯЁӨҮ]'
const gradeRe = new RegExp(`^([1-9]|1[0-2])${G_LETTER}$`)
const normGrade = (v: unknown) => {
  if (typeof v !== 'string') return undefined
  const x = v.replace(/\s+/g, '').toUpperCase()
  return gradeRe.test(x) ? x : undefined
}
const normBirthYear = (v: unknown) => {
  if (v === null) return 'DELETE' as const
  if (v === undefined || v === '') return undefined
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  if (n < 1900 || n > 2100) return undefined
  return n
}

type ProfileOutputValue = string | number | FieldValue
function sanitizeProfile(input: unknown): Record<string, ProfileOutputValue> {
  const out: Record<string, ProfileOutputValue> = {}
  if (!isRecord(input)) return out

  const textKeys: AllowedKey[] = [
    'name','lastName','gender','province','district','school','location'
  ]
  for (const k of textKeys) {
    const v = normStr(input[k])
    if (v !== undefined) out[k] = v
  }

  const phone = normPhone((input as Record<string, unknown>).phone)
  if (phone !== undefined) out.phone = phone

  const grade = normGrade((input as Record<string, unknown>).grade)
  if (grade !== undefined) out.grade = grade

  const by = normBirthYear((input as Record<string, unknown>).birthYear)
  if (by === 'DELETE') {
    out.birthYear = FieldValue.delete()
  } else if (by !== undefined) {
    out.birthYear = by
  }

  return out
}

// --- Auth: Session cookie эсвэл Bearer ID token ---
async function verifyAuth(req: NextRequest) {
  const sessionCookie = req.cookies.get('__session')?.value
  if (sessionCookie) {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    return { uid: decoded.uid, email: decoded.email ?? '' }
  }
  const authz = req.headers.get('authorization') || req.headers.get('Authorization')
  if (authz?.startsWith('Bearer ')) {
    const idToken = authz.slice('Bearer '.length).trim()
    const decoded = await adminAuth.verifyIdToken(idToken, true)
    return { uid: decoded.uid, email: decoded.email ?? '' }
  }
  throw new Error('Unauthorized')
}

// ---- Preflight ----
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
    let body: unknown
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders(origin) })
    }

    const { uid, email } = await verifyAuth(req)

    if (!isRecord(body) || !('profileData' in body)) {
      return NextResponse.json({ error: 'Missing profileData' }, { status: 400, headers: corsHeaders(origin) })
    }

    // зөвшөөрсөн түлхүүрүүдийг шүүнэ
    const raw = body.profileData as Record<string, unknown>
    const whitelisted: Record<string, unknown> = {}
    for (const k of ALLOWED_PROFILE_FIELDS) {
      if (k in raw) whitelisted[k] = raw[k]
    }
    const profileData = sanitizeProfile(whitelisted)

    if (Object.keys(profileData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400, headers: corsHeaders(origin) })
    }

    const userDocRef = adminFirestore.collection('users').doc(uid)
    const uniquePhones = adminFirestore.collection('uniquePhones')

    const snap = await userDocRef.get()
    const isNew = !snap.exists
    const oldPhone: string | undefined = (snap.exists ? (snap.data()?.phone as string | undefined) : undefined)
    const newPhone: string | undefined = profileData.phone as string | undefined

    // --- Утасны атомик unique баталгаа ---
    if (newPhone) {
      const newPhoneRef = uniquePhones.doc(newPhone)

      if (isNew) {
        await adminFirestore.runTransaction(async (tx) => {
          const lock = await tx.get(newPhoneRef)
          if (lock.exists && lock.data()?.uid !== uid) {
            const error: Error & { status?: number } = new Error('Phone already in use')
            error.status = 409
            throw error
          }
          tx.set(newPhoneRef, { uid, updatedAt: FieldValue.serverTimestamp() })
        })
      } else if (!isNew && newPhone !== oldPhone) {
        const oldPhoneRef = oldPhone ? uniquePhones.doc(oldPhone) : null
        await adminFirestore.runTransaction(async (tx) => {
          const [newLock, oldLock] = await Promise.all([
            tx.get(newPhoneRef),
            oldPhoneRef ? tx.get(oldPhoneRef) : Promise.resolve(null)
          ])
          if (newLock.exists && newLock.data()?.uid !== uid) {
            const error: Error & { status?: number } = new Error('Phone already in use')
            error.status = 409
            throw error
          }
          tx.set(newPhoneRef, { uid, updatedAt: FieldValue.serverTimestamp() })
          if (oldPhoneRef && oldLock?.exists && oldLock.data()?.uid === uid) {
            tx.delete(oldPhoneRef)
          }
        })
      }
    } else if (!isNew && oldPhone && ('phone' in profileData) && profileData.phone === undefined) {
      const oldPhoneRef = uniquePhones.doc(oldPhone)
      await adminFirestore.runTransaction(async (tx) => {
        const oldLock = await tx.get(oldPhoneRef)
        if (oldLock.exists && oldLock.data()?.uid === uid) {
          tx.delete(oldPhoneRef)
        }
      })
    }
    // --- Утас баталгааны төгсгөл ---

    if (isNew) {
      // ✅ ROLE-ийг энд хэзээ ч бүү бич—зөвхөн админ API өөрчилнө.
      await userDocRef.set(
        {
          uid,
          email,
          ...profileData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    } else {
      await userDocRef.set(
        { ...profileData, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
    }

    // ✅ Custom claim/role-д хүрэхгүй. refresh/revoke хийхгүй.
    const payload = {
      success: true,
      message: 'User profile updated',
      isNew,
      claimUpdated: false,
      forceTokenRefresh: false,
    }

    return NextResponse.json(payload, { status: isNew ? 201 : 200, headers: corsHeaders(origin) })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('register-profile error:', msg)

    const status = ((): number => {
      if (e && typeof e === 'object' && 'status' in e && typeof (e as { status: unknown }).status === 'number') {
        return (e as { status: number }).status
      }
      if (/unauthorized/i.test(msg)) return 401
      return 500
    })()

    const safeMessage = status === 401 ? 'Unauthorized' : 'Internal server error'
    return NextResponse.json({ error: safeMessage }, { status, headers: corsHeaders(origin) })
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders(origin) })
}
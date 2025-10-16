import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

// Клиентээс зөвшөөрөх түлхүүрүүд (passport байхгүй)
const ALLOWED_PROFILE_FIELDS = [
  'name', 'lastName', 'phone', 'birthYear', 'gender',
  'province', 'district', 'school', 'grade', 'location',
] as const

type AllowedKey = (typeof ALLOWED_PROFILE_FIELDS)[number]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

// trim + хоосон бол undefined
const normStr = (v: unknown) => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t : undefined
}
// 8 оронтой утас
const normPhone = (v: unknown) => {
  if (typeof v !== 'string') return undefined
  const d = v.replace(/\D/g, '')
  return /^\d{8}$/.test(d) ? d : undefined
}
// Анги: 1–12 + 1 том үсэг (латин/кирилл)
const G_LETTER = '[A-Za-zА-ЯЁӨҮ]'
const gradeRe = new RegExp(`^([1-9]|1[0-2])${G_LETTER}$`)
const normGrade = (v: unknown) => {
  if (typeof v !== 'string') return undefined
  const x = v.replace(/\s+/g, '').toUpperCase()
  return gradeRe.test(x) ? x : undefined
}
// Төрсөн он
const normBirthYear = (v: unknown) => {
  if (v === null) return 'DELETE' as const
  if (v === undefined || v === '') return undefined
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined
  if (n < 1900 || n > 2100) return undefined
  return n
}

// `any` оронд илүү тодорхой type ашиглах
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

  // `as Record<string, unknown>`-г ашиглан `any`-г солих
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

// --- Custom claim-г баталгаажуулах (байхгүй бол student оноох) ---
// *Өөрчлөлт*: claim солигдвол refresh token-уудыг revoke хийнэ
async function ensureStudentClaim(uid: string): Promise<{ updated: boolean }> {
  const user = await adminAuth.getUser(uid)
  const currentClaims = (user.customClaims ?? {}) as Record<string, unknown>

  if (currentClaims['role'] !== 'student') {
    await adminAuth.setCustomUserClaims(uid, { ...currentClaims, role: 'student' })
    await adminAuth.revokeRefreshTokens(uid)
    return { updated: true }
  }
  return { updated: false }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await verifyAuth(req)

    const body = (await req.json()) as { profileData?: unknown }
    if (!('profileData' in (body ?? {}))) {
      return NextResponse.json({ error: 'Missing profileData' }, { status: 400 })
    }

    // зөвшөөрсөн түлхүүрүүдийг шүүнэ
    const raw = body.profileData as Record<string, unknown>
    const whitelisted: Record<string, unknown> = {}
    for (const k of ALLOWED_PROFILE_FIELDS) {
      if (k in raw) whitelisted[k] = raw[k]
    }
    const profileData = sanitizeProfile(whitelisted)

    if (Object.keys(profileData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const userDocRef = adminFirestore.collection('users').doc(uid)
    const uniquePhones = adminFirestore.collection('uniquePhones')

    const snap = await userDocRef.get()
    const isNew = !snap.exists
    const oldPhone: string | undefined = (snap.exists ? (snap.data()?.phone as string | undefined) : undefined)
    const newPhone: string | undefined = profileData.phone as string | undefined

    // --- ✅ Утасны атомик unique баталгаа (Optimized) ---
    // 1) Шинэ хэрэглэгч + phone ирсэн бол newPhone-г эзэмшүүлэх
    // 2) Хуучин хэрэглэгч phone-оо СОЛИВОЛ: шинэ дугаарыг эзэмшээд, хуучныг суллана
    if (newPhone) {
      const newPhoneRef = uniquePhones.doc(newPhone)

      if (isNew) {
        // Шинэ хэрэглэгч - Simplified transaction
        await adminFirestore.runTransaction(async (tx) => {
          const lock = await tx.get(newPhoneRef)
          if (lock.exists && lock.data()?.uid !== uid) {
            // `any`-г ашиглахгүйн тулд custom error object үүсгэх
            const error: Error & { status?: number } = new Error('Phone already in use')
            error.status = 409
            throw error
          }
          tx.set(newPhoneRef, { uid, updatedAt: FieldValue.serverTimestamp() })
        })
      } else if (!isNew && newPhone !== oldPhone) {
        // ✅ Хуучин + шинэ phone нэг transaction дотор хийх
        const oldPhoneRef = oldPhone ? uniquePhones.doc(oldPhone) : null
        await adminFirestore.runTransaction(async (tx) => {
          // Parallel read operations (эдгээр нь async биш тул race condition байхгүй)
          const [newLock, oldLock] = await Promise.all([
            tx.get(newPhoneRef),
            oldPhoneRef ? tx.get(oldPhoneRef) : Promise.resolve(null)
          ])
          
          if (newLock.exists && newLock.data()?.uid !== uid) {
            const error: Error & { status?: number } = new Error('Phone already in use')
            error.status = 409
            throw error
          }
          
          // Write operations
          tx.set(newPhoneRef, { uid, updatedAt: FieldValue.serverTimestamp() })
          
          // хуучныг суллах
          if (oldPhoneRef && oldLock?.exists && oldLock.data()?.uid === uid) {
            tx.delete(oldPhoneRef)
          }
        })
      }
    } else if (!isNew && oldPhone && ('phone' in profileData) && profileData.phone === undefined) {
      // Хэрэв хэрэглэгч phone-оо ХОЁСНЫГ хүсэж байгаа (nullable UX), uniquePhones-оос суллана
      const oldPhoneRef = uniquePhones.doc(oldPhone)
      await adminFirestore.runTransaction(async (tx) => {
        const oldLock = await tx.get(oldPhoneRef)
        if (oldLock.exists && oldLock.data()?.uid === uid) {
          tx.delete(oldPhoneRef)
        }
      })
    }
    // --- Утас баталгааны төгсгөл ---

    let claimUpdated = false

    if (isNew) {
      await userDocRef.set(
        {
          uid,
          email,
          role: 'student',
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

    const res = await ensureStudentClaim(uid)
    claimUpdated = res.updated
    const forceTokenRefresh = isNew || claimUpdated

    const payload = {
      success: true,
      message: 'User profile updated',
      isNew,
      claimUpdated,
      forceTokenRefresh,
    }

    return NextResponse.json(payload, { status: isNew ? 201 : 200 })
  } catch (e: unknown) {
    console.error('register-profile error:', errMsg(e))
    // `any`-г ашиглахгүйн тулд type-г шалгаад `status`-г авах
    const status = (e && typeof e === 'object' && 'status' in e && typeof (e as { status: unknown }).status === 'number')
      ? (e as { status: number }).status
      : /unauthorized/i.test(errMsg(e)) ? 401 : 500
    const msg = (e instanceof Error ? e.message : 'Internal server error')
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}

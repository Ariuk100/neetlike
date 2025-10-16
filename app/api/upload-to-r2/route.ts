// app/api/upload-to-r2/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import { adminAuth } from '@/lib/firebaseAdmin'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type { DecodedIdToken } from 'firebase-admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // upload нь динамик

const R2_BUCKET = process.env.R2_BUCKET!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler(),
})

// ── Types / helpers ────────────────────────────────────────────────────────────
type Role = 'admin' | 'moderator' | 'teacher' | 'student'

function readRole(decoded: DecodedIdToken): Role {
  const r = (decoded as DecodedIdToken & { role?: unknown }).role
  const allowed: readonly Role[] = ['admin', 'moderator', 'teacher', 'student']
  return typeof r === 'string' && (allowed as readonly string[]).includes(r) ? (r as Role) : 'student'
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try { return JSON.stringify(e) } catch { return String(e) }
}

// Зөвшөөрөгдсөн MIME төрлүүд
const ALLOWED_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    // 1) Auth — session cookie баталгаажуул
    const session = req.cookies.get('__session')?.value
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await adminAuth.verifySessionCookie(session, true)
    const role = readRole(decoded)

    // зөвшөөрлийн жишээ (шаардвал өөрчил)
    if (!(role === 'moderator' || role === 'admin' || role === 'teacher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2) FormData уншина
    const formData = await req.formData()
    const fileEntry = formData.get('file')
    const file = fileEntry instanceof File ? fileEntry : null
    if (!file) {
      return NextResponse.json({ error: 'Файл илгээгдсэнгүй.' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: `Зөвшөөрөгдөөгүй файл төрөл: ${contentType}` }, { status: 415 })
    }
    if (typeof file.size === 'number' && file.size > MAX_BYTES) {
      return NextResponse.json({ error: `Файл хэт том (≤ ${MAX_BYTES} байт)` }, { status: 413 })
    }

    // 3) Файлын нэр — uuid + эх файлын өргөтгөл
    const ext = (path.extname(file.name || '') || '').toLowerCase()
    const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf'])
    const safeExt = allowedExt.has(ext) ? ext : ''
    const key = `uploads/${randomUUID()}${safeExt}`

    // 4) Стриймээр put хийх (RAM-д бүхэлд нь буфферлохгүй)
    const ab = await file.arrayBuffer()
    const body = Buffer.from(ab)

    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // R2-д ACL хэрэггүй — bucket-ийн public тохиргоо/полисээр удирддаг
      CacheControl: 'public, max-age=31536000, immutable',
      // ContentDisposition: 'inline',
    })

    await s3.send(putCmd)

    // Public bucket бол:
    const publicUrl = `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET}/${key}`

    return NextResponse.json(
      {
        url: publicUrl, // харах URL
        key,            // Firestore-д хадгалах 'uploads/...'
        contentType,
        size: typeof file.size === 'number' ? file.size : null,
      },
      { status: 200 },
    )
  } catch (e: unknown) {
    console.error('📛 Upload Error:', errMsg(e))
    return NextResponse.json({ error: errMsg(e) || 'Unknown error' }, { status: 500 })
  }
}
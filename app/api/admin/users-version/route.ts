// /app/api/admin/users-version/route.ts
import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/lib/firebaseAdmin';
import { Timestamp as FirebaseFirestoreTimestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---- Origin / CORS helpers (локал, бусадтай нийцүүлэв) ----
const PROD_ALLOWED_ORIGINS = ['https://physx.mn', 'https://www.physx.mn'] as const;
const DEV_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const;

function allowedOrigins(): readonly string[] {
  return process.env.NODE_ENV === 'production'
    ? PROD_ALLOWED_ORIGINS
    : [...PROD_ALLOWED_ORIGINS, ...DEV_ALLOWED_ORIGINS];
}
function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && allowedOrigins().includes(origin);
}
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (isAllowedOrigin(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

// Энэ функц нь зөвхөн хамгийн сүүлд бүртгүүлсэн хэрэглэгчийн
// огноог (бидний "ETag") буцаах хөнгөн үүрэгтэй.
export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const baseHeaders = corsHeaders(origin);

  try {
    // Админ эсэхийг шалгана (session cookie)
    const rawCookie = request.headers.get('cookie') ?? '';
    const match = /(?:^|;\s*)__session=([^;]+)/.exec(rawCookie);
    const sessionCookie = match ? match[1] : undefined;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: baseHeaders });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    // role-г type-safe байдлаар уншина
    const role = (decodedToken as Record<string, unknown>).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: baseHeaders });
    }

    // Origin guard (нэмэлт хамгаалалт; зөвшөөрөөгүй origin-оос ирвэл хориглоно)
    if (origin && !isAllowedOrigin(origin)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers: baseHeaders });
    }

    const usersRef = adminFirestore.collection('users');
    const lastUserQuery = usersRef.orderBy('createdAt', 'desc').limit(1);
    const snapshot = await lastUserQuery.get();

    if (snapshot.empty) {
      return NextResponse.json({ version: null }, { headers: baseHeaders });
    }

    const lastUser = snapshot.docs[0].data();
    const createdAt = (lastUser?.createdAt ?? null) as unknown;

    // createdAt байхгүй/буруу төрөл үед хамгаална
    if (!(createdAt instanceof FirebaseFirestoreTimestamp)) {
      return NextResponse.json({ version: null }, { headers: baseHeaders });
    }

    // Хувилбарын дугаар болгон миллисекундыг буцаана
    return NextResponse.json({ version: createdAt.toMillis() }, { headers: baseHeaders });

  } catch (error) {
    // Дотоод алдааг LOG-д үлдээнэ, клиент рүү ерөнхий мессеж л буцаана
    console.error('Failed to get users version:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: baseHeaders });
  }
}
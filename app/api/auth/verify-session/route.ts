// Edge runtime + JOSE (Firebase JWKS) — firebase-admin ХЭРЭГЛЭХГҮЙ!
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

// --- Firebase JWKS тохиргоо ---
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
);

type Role = 'student' | 'moderator' | 'teacher' | 'admin';

function readRole(p: JWTPayload & { role?: unknown }): Role {
  const r = p.role;
  return typeof r === 'string' && ['student', 'moderator', 'teacher', 'admin'].includes(r)
    ? (r as Role)
    : 'student';
}
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// POST: cookie эсвэл body.token-оор баталгаажуулна
export async function POST(req: NextRequest) {
  try {
    // 1) __session cookie байвал нэн түрүүнд шалгана
    const cookieToken = req.cookies.get('__session')?.value;

    if (cookieToken) {
      const { payload } = await jwtVerify(cookieToken, jwks, { issuer, audience: projectId });
      const uid = (payload.user_id as string) || '';
      const role = readRole(payload as JWTPayload & { role?: unknown });

      return NextResponse.json(
        { user: { uid, role } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2) Cookie байхгүй бол body.token-оор шалгаад cookie болгоно
    const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
    const idToken = typeof body?.token === 'string' ? body.token : undefined;
    if (idToken) {
      const { payload } = await jwtVerify(idToken, jwks, { issuer, audience: projectId });
      const uid = (payload.user_id as string) || '';
      const role = readRole(payload as JWTPayload & { role?: unknown });

      // Cookie-г токены үлдсэн хугацаагаар
      const nowSec = Math.floor(Date.now() / 1000);
      const expSec = typeof payload.exp === 'number' ? payload.exp : undefined;
      const maxAge = expSec ? Math.max(0, expSec - nowSec) : 60 * 60 * 24 * 7;

      const res = NextResponse.json(
        { user: { uid, role } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
      res.cookies.set('__session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
      return res;
    }

    // 3) Аль нь ч байхгүй бол 204 (no content)
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    // Алдаа гарвал cookie-гээ цэвэрлээд 401 буцаана
    const res = NextResponse.json(
      { error: 'Invalid or expired session.', details: errMsg(e) },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
    res.cookies.set({
      name: '__session',
      value: '',
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
    });
    return res;
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

type Role = 'student' | 'moderator' | 'teacher' | 'admin';
type SignInResp = { idToken: string };

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

function readRole(payload: JWTPayload & { role?: unknown }): Role {
  const r = payload.role;
  return (typeof r === 'string' && ['student','moderator','teacher','admin'].includes(r)) ? (r as Role) : 'student';
}
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown; email?: unknown; password?: unknown };
    let idToken = typeof body.token === 'string' ? body.token : undefined;

    if (!idToken && typeof body.email === 'string' && typeof body.password === 'string') {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
      const r = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: body.email, password: body.password, returnSecureToken: true }) }
      );
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        return NextResponse.json({ error: e?.error?.message ?? 'LOGIN_FAILED' }, { status: 400 });
      }
      const data = (await r.json()) as SignInResp;
      idToken = data.idToken;
    }

    if (!idToken) {
      return NextResponse.json({ error: 'Token not provided' }, { status: 400 });
    }

    const { payload } = await jwtVerify(idToken, jwks, { issuer, audience: projectId });
    const p = payload as JWTPayload & { role?: Role };
    const uid = p.user_id as string;
    const role = readRole(p);

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = typeof p.exp === 'number' ? p.exp : undefined;
    const maxAge = expSec ? Math.max(0, expSec - nowSec) : 60 * 60 * 24 * 7;

    const profile = {}; // optionally fetch from your backend

    const res = NextResponse.json({ success: true, uid, role, profile }, { status: 200 });
    res.cookies.set('__session', idToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
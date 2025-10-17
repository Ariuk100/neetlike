export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT, JWTPayload } from 'jose';

type Role = 'student' | 'moderator' | 'teacher' | 'admin';
const ALLOWED_ROLES = new Set<Role>(['student', 'moderator', 'teacher', 'admin']);

type ErrorWithStatus = Error & { status?: number };
type OAuthTokenResp = { access_token: string };

const PROD_ALLOWED_ORIGINS = ['https://physx.mn', 'https://www.physx.mn'] as const;
const DEV_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'] as const;

function allowedOrigins(): readonly string[] {
  return process.env.NODE_ENV === 'production' ? PROD_ALLOWED_ORIGINS : [...PROD_ALLOWED_ORIGINS, ...DEV_ALLOWED_ORIGINS];
}
function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && allowedOrigins().includes(origin);
}
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (isAllowedOrigin(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Headers'] = 'content-type';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }
  return headers;
}
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

async function requireAdminFromCookie(req: NextRequest): Promise<JWTPayload & { role?: Role }> {
  const cookie = req.cookies.get('__session')?.value;
  if (!cookie) { const e: ErrorWithStatus = new Error('Unauthorized'); e.status = 401; throw e; }
  const { payload } = await jwtVerify(cookie, jwks, { issuer, audience: projectId });
  const role = (payload as JWTPayload & { role?: Role }).role;
  if (role !== 'admin') { const e: ErrorWithStatus = new Error('Forbidden: Only admins'); e.status = 403; throw e; }
  return payload as JWTPayload & { role?: Role };
}

const SA_EMAIL = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL!;
const SA_PRIVATE_KEY_PEM = (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

async function getGoogleAccessToken(): Promise<string> {
  if (!SA_EMAIL || !SA_PRIVATE_KEY_PEM) throw new Error('Missing service account envs');
  const privateKey = await importPKCS8(SA_PRIVATE_KEY_PEM, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/identitytoolkit' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(SA_EMAIL).setSubject(SA_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now).setExpirationTime(now + 3600)
    .sign(privateKey);

  const form = new URLSearchParams();
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  form.set('assertion', assertion);

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!r.ok) throw new Error(`OAuth token exchange failed: ${await r.text()}`);
  const j = (await r.json()) as OAuthTokenResp;
  return j.access_token;
}

async function setCustomClaims(localId: string, claims: Record<string, unknown>): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`;
  const body = { localId, customAttributes: JSON.stringify(claims) };
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const e: ErrorWithStatus = new Error(`accounts:update failed: ${await r.text()}`); e.status = r.status; throw e; }
}

async function revokeRefreshTokens(localId: string): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signOut`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ localId }),
  });
  if (!r.ok) { const e: ErrorWithStatus = new Error(`accounts:signOut failed: ${await r.text()}`); e.status = r.status; throw e; }
}

async function syncRoleToBackend(uid: string, role: Role): Promise<boolean> {
  const backendUrl = process.env.ADMIN_BACKEND_SET_ROLE_URL;
  const token = process.env.ADMIN_BACKEND_BEARER;
  if (!backendUrl || !token) return false;
  const r = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid, role }),
  });
  return r.ok;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403, headers: corsHeaders(origin) });
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers: corsHeaders(origin) });
  }

  try {
    const caller = await requireAdminFromCookie(req);
    const callerUid = (caller.user_id as string) ?? '';

    const body = (await req.json()) as { uid?: unknown; role?: unknown };
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const role = typeof body.role === 'string' ? (body.role as Role) : undefined;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400, headers: corsHeaders(origin) });
    }
    if (!role || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${Array.from(ALLOWED_ROLES).join(', ')}` },
        { status: 400, headers: corsHeaders(origin) },
      );
    }
    if (uid === callerUid && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot change your own role to non-admin' },
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    await setCustomClaims(uid, { role });
    await revokeRefreshTokens(uid);
    const synced = await syncRoleToBackend(uid, role).catch(() => false);

    return NextResponse.json(
      { success: true, message: `User ${uid} role set to ${role}. User must re-login.`, requiresReauth: true, firestoreSynced: synced || false },
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (e) {
    const status = (e as ErrorWithStatus)?.status ?? 500;
    return NextResponse.json(
      { error: errMsg(e) || 'Failed to set user role' },
      { status, headers: corsHeaders(origin) },
    );
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: corsHeaders(origin) });
}
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

type Role = 'admin' | 'moderator' | 'teacher' | 'student';
type ErrorWithStatus = Error & { status?: number };
type KV = { get(key: string): Promise<string | null> };

type EnvBindings = { APP_META?: KV };

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const USERS_VERSION_KEY = 'users_version';

function readSessionCookie(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const m = /\b__session=([^;]+)/.exec(cookie);
  return m?.[1];
}
async function requireAdmin(idToken: string): Promise<JWTPayload & { role?: Role }> {
  const { payload } = await jwtVerify(idToken, jwks, { issuer, audience: projectId });
  const p = payload as JWTPayload & { role?: Role };
  if (p.role !== 'admin') { const e: ErrorWithStatus = new Error('FORBIDDEN'); e.status = 403; throw e; }
  return p;
}

export async function GET(req: Request) {
  try {
    const token = readSessionCookie(req);
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    await requireAdmin(token);

    const env = (globalThis as unknown as { env?: EnvBindings }).env ?? {};
    const kv = env.APP_META;
    if (!kv) {
      return new Response(JSON.stringify({ error: 'NO_KV_BINDING' }), { status: 500, headers: { 'content-type': 'application/json' } });
    }

    const versionStr = await kv.get(USERS_VERSION_KEY);
    const version = versionStr ? Number(versionStr) : null;

    return new Response(JSON.stringify({ version }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    const status = (err as ErrorWithStatus)?.status ?? 500;
    return new Response(JSON.stringify({ error: status === 403 ? 'Forbidden' : 'Internal Server Error' }), { status, headers: { 'content-type': 'application/json' } });
  }
}
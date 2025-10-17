// app/api/admin/users-version/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createRemoteJWKSet, jwtVerify } from 'jose';

// Firebase project ID (клиент талд ч ашиглагддаг тул NEXT_PUBLIC…)
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

// Cloudflare KV binding-ээс унших түлхүүр нэр
const USERS_VERSION_KEY = 'users_version';

// __session cookie-оос Bearer токен авах туслах
function readSessionCookie(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const m = /\b__session=([^;]+)/.exec(cookie);
  return m?.[1];
}

// Админ эсэхийг Firebase ID токены custom claim-аас шалгана (role === 'admin' гэж тохирсон байх)
async function requireAdmin(idToken: string) {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: projectId,
  });
  const role = (payload as any).role;
  if (role !== 'admin') {
    const e = new Error('FORBIDDEN');
    (e as any).status = 403;
    throw e;
  }
  return payload;
}

export async function GET(req: Request) {
  try {
    // 1) Auth
    const token = readSessionCookie(req);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    await requireAdmin(token);

    // 2) KV-оос хамгийн сүүлийн version унших
    // Pages → Settings → Functions → KV bindings дотор `APP_META` нэрээр KV namespace холбосон байх ёстой.
    const env: any = (globalThis as any).env;
    const kv = env?.APP_META;
    if (!kv) {
      return new Response(JSON.stringify({ error: 'NO_KV_BINDING' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const versionStr = await kv.get(USERS_VERSION_KEY);
    // null байж болно
    const version = versionStr ? Number(versionStr) : null;

    return new Response(JSON.stringify({ version }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return new Response(JSON.stringify({ error: status === 403 ? 'Forbidden' : 'Internal Server Error' }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }
}
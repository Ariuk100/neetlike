// app/api/register-profile/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ---------- Auth (Firebase ID token → JOSE JWKS) ----------
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

type Role = 'student' | 'moderator' | 'teacher' | 'admin';
const ALLOWED_PROFILE_FIELDS = [
  'name', 'lastName', 'phone', 'birthYear', 'gender',
  'province', 'district', 'school', 'grade', 'location',
] as const;
type AllowedKey = (typeof ALLOWED_PROFILE_FIELDS)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return String(e); }
}

// ---- normalizers ----
const normStr = (v: unknown) => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};
const normPhone = (v: unknown) => {
  if (v === null) return 'DELETE' as const;
  if (typeof v !== 'string') return undefined;
  const d = v.replace(/\D/g, '');
  return /^\d{8}$/.test(d) ? d : undefined;
};
const G_LETTER = '[A-Za-zА-ЯЁӨҮ]';
const gradeRe = new RegExp(`^([1-9]|1[0-2])${G_LETTER}$`);
const normGrade = (v: unknown) => {
  if (typeof v !== 'string') return undefined;
  const x = v.replace(/\s+/g, '').toUpperCase();
  return gradeRe.test(x) ? x : undefined;
};
const normBirthYear = (v: unknown) => {
  if (v === null) return 'DELETE' as const;
  if (v === undefined || v === '') return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  if (n < 1900 || n > 2100) return undefined;
  return n;
};

type ProfileOutputValue = string | number | null;
function sanitizeProfile(input: unknown): Record<string, ProfileOutputValue> {
  const out: Record<string, ProfileOutputValue> = {};
  if (!isRecord(input)) return out;

  const textKeys: AllowedKey[] = [
    'name','lastName','gender','province','district','school','location'
  ];
  for (const k of textKeys) {
    const v = normStr(input[k]);
    if (v !== undefined) out[k] = v;
  }

  const phone = normPhone((input as Record<string, unknown>).phone);
  if (phone === 'DELETE') out.phone = null;
  else if (phone !== undefined) out.phone = phone;

  const grade = normGrade((input as Record<string, unknown>).grade);
  if (grade !== undefined) out.grade = grade;

  const by = normBirthYear((input as Record<string, unknown>).birthYear);
  if (by === 'DELETE') out.birthYear = null;
  else if (by !== undefined) out.birthYear = by;

  return out;
}

// ---- verify auth via ID token (cookie __session эсвэл Authorization: Bearer) ----
async function verifyAuth(req: NextRequest) {
  const cookieToken = req.cookies.get('__session')?.value;
  const authz = req.headers.get('authorization') || req.headers.get('Authorization');
  const bearer = authz?.startsWith('Bearer ') ? authz.slice(7).trim() : undefined;
  const token = cookieToken || bearer;
  if (!token) throw new Error('Unauthorized');

  const { payload } = await jwtVerify(token, jwks, { issuer, audience: projectId });
  const uid = (payload as any).user_id as string;
  const email = (payload as any).email as string | undefined;
  const role = (payload as any).role as Role | undefined;
  return { uid, email: email ?? '', role: role ?? 'student' };
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await verifyAuth(req);

    const body = await req.json().catch(() => ({})) as { profileData?: unknown };
    if (!('profileData' in (body ?? {}))) {
      return NextResponse.json({ error: 'Missing profileData' }, { status: 400 });
    }

    // зөвшөөрсөн түлхүүрүүдийг шүүж аваад нормчлоно
    const raw = (body.profileData ?? {}) as Record<string, unknown>;
    const whitelisted: Record<string, unknown> = {};
    for (const k of ALLOWED_PROFILE_FIELDS) {
      if (k in raw) whitelisted[k] = raw[k];
    }
    const profile = sanitizeProfile(whitelisted);
    if (Object.keys(profile).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // --- D1 binding (Cloudflare Pages → Settings → Functions → D1 bindings) ---
    const env: any = (globalThis as any).env;
    const db = env?.PHYSX_DB; // D1 binding нэр
    if (!db) {
      // Хэрэв одоогоор DB холбогоогүй бол нооп байдлаар амжилт буцааж болно
      return NextResponse.json({
        success: true,
        message: 'User profile accepted (DB not configured yet)',
        isNew: false,
        claimUpdated: false,
        forceTokenRefresh: false,
        noop: true,
      }, { status: 200 });
    }

    // isNew тогтоох (✅ generic-гүй, cast хийсэн)
    const row = (await db
      .prepare('SELECT COUNT(1) as c FROM users WHERE uid=?')
      .bind(uid)
      .first()) as { c: number } | null;

    const isNew = !row || row.c === 0;

    // null бол устгах, string бол шинэ утга
    const nowIso = new Date().toISOString();

    // параметрүүдийг бэлтгэх
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    // зөвшөөрсөн баганууд
    const colsMap: Record<string, string> = {
      name: 'name',
      lastName: 'last_name',
      phone: 'phone',
      birthYear: 'birth_year',
      gender: 'gender',
      province: 'province',
      district: 'district',
      school: 'school',
      grade: 'grade',
      location: 'location',
    };

    for (const [k, v] of Object.entries(profile)) {
      const col = colsMap[k];
      if (!col) continue;
      fields.push(`${col} = ?`);
      values.push((v as any) ?? null);
    }
    // updatedAt
    fields.push(`updated_at = ?`);
    values.push(nowIso);

    if (isNew) {
      // Insert (role = 'student' default)
      const insertCols = ['uid','email','role','created_at','updated_at'];
      const insertVals: (string | number | null)[] = [uid, email, 'student', nowIso, nowIso];
      // profile талбарыг оруулна
      for (const [k, v] of Object.entries(profile)) {
        const col = colsMap[k];
        if (!col) continue;
        insertCols.push(col);
        insertVals.push((v as any) ?? null);
      }

      const placeholders = insertCols.map(() => '?').join(',');
      try {
        await db.prepare(
          `INSERT INTO users (${insertCols.join(',')}) VALUES (${placeholders})`
        ).bind(...insertVals).run();
      } catch (e) {
        const msg = errMsg(e);
        if (/UNIQUE constraint failed: users\.phone/i.test(msg)) {
          return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
        }
        throw e;
      }
    } else {
      // Update
      try {
        await db.prepare(
          `UPDATE users SET ${fields.join(', ')} WHERE uid = ?`
        ).bind(...values, uid).run();
      } catch (e) {
        const msg = errMsg(e);
        if (/UNIQUE constraint failed: users\.phone/i.test(msg)) {
          return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
        }
        throw e;
      }
    }

    const payload = {
      success: true,
      message: 'User profile updated',
      isNew,
      claimUpdated: false,
      forceTokenRefresh: isNew, // шинэ хэрэглэгчид UX-д ашиглаж болно
    };
    return NextResponse.json(payload, { status: isNew ? 201 : 200 });
  } catch (e) {
    const msg = errMsg(e);
    const status = /unauthorized/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
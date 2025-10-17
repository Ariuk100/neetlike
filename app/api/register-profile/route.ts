export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

type Role = 'student' | 'moderator' | 'teacher' | 'admin';
type D1Stmt = { bind: (...args: unknown[]) => { first: () => Promise<unknown | null>; run: () => Promise<unknown> } };
type D1 = { prepare: (q: string) => D1Stmt };
type EnvBindings = { PHYSX_DB?: D1 };

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const issuer = `https://securetoken.google.com/${projectId}`;
const jwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

const ALLOWED_PROFILE_FIELDS = ['name','lastName','phone','birthYear','gender','province','district','school','grade','location'] as const;
type AllowedKey = (typeof ALLOWED_PROFILE_FIELDS)[number];

function isRecord(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null; }
function errMsg(e: unknown): string { if (e instanceof Error) return e.message; if (typeof e === 'string') return e; try { return JSON.stringify(e); } catch { return String(e); } }

const normStr = (v: unknown) => { if (typeof v !== 'string') return undefined; const t = v.trim(); return t ? t : undefined; };
const normPhone = (v: unknown) => { if (v === null) return 'DELETE' as const; if (typeof v !== 'string') return undefined; const d = v.replace(/\D/g, ''); return /^\d{8}$/.test(d) ? d : undefined; };
const G_LETTER = '[A-Za-zА-ЯЁӨҮ]';
const gradeRe = new RegExp(`^([1-9]|1[0-2])${G_LETTER}$`);
const normGrade = (v: unknown) => { if (typeof v !== 'string') return undefined; const x = v.replace(/\s+/g, '').toUpperCase(); return gradeRe.test(x) ? x : undefined; };
const normBirthYear = (v: unknown) => { if (v === null) return 'DELETE' as const; if (v === undefined || v === '') return undefined; const n = typeof v === 'string' ? Number(v) : v; if (typeof n !== 'number' || !Number.isFinite(n)) return undefined; if (n < 1900 || n > 2100) return undefined; return n; };

type ProfileOutputValue = string | number | null;
function sanitizeProfile(input: unknown): Record<string, ProfileOutputValue> {
  const out: Record<string, ProfileOutputValue> = {};
  if (!isRecord(input)) return out;

  const textKeys: AllowedKey[] = ['name','lastName','gender','province','district','school','location'];
  for (const k of textKeys) { const v = normStr(input[k]); if (v !== undefined) out[k] = v; }

  const phone = normPhone((input as Record<string, unknown>).phone);
  if (phone === 'DELETE') out.phone = null; else if (phone !== undefined) out.phone = phone;

  const grade = normGrade((input as Record<string, unknown>).grade);
  if (grade !== undefined) out.grade = grade;

  const by = normBirthYear((input as Record<string, unknown>).birthYear);
  if (by === 'DELETE') out.birthYear = null; else if (by !== undefined) out.birthYear = by;

  return out;
}

async function verifyAuth(req: NextRequest): Promise<{ uid: string; email: string; role: Role }> {
  const cookieToken = req.cookies.get('__session')?.value;
  const authz = req.headers.get('authorization') || req.headers.get('Authorization');
  const bearer = authz?.startsWith('Bearer ') ? authz.slice(7).trim() : undefined;
  const token = cookieToken || bearer;
  if (!token) throw new Error('Unauthorized');

  const { payload } = await jwtVerify(token, jwks, { issuer, audience: projectId });
  const p = payload as JWTPayload & { role?: Role };
  return { uid: p.user_id as string, email: (p.email as string) ?? '', role: p.role ?? 'student' };
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await verifyAuth(req);

    const body = (await req.json().catch(() => ({}))) as { profileData?: unknown };
    if (!('profileData' in (body ?? {}))) return NextResponse.json({ error: 'Missing profileData' }, { status: 400 });

    const raw = (body.profileData ?? {}) as Record<string, unknown>;
    const whitelisted: Record<string, unknown> = {};
    for (const k of ALLOWED_PROFILE_FIELDS) { if (k in raw) whitelisted[k] = raw[k]; }
    const profile = sanitizeProfile(whitelisted);
    if (Object.keys(profile).length === 0) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

    const env = (globalThis as unknown as { env?: EnvBindings }).env ?? {};
    const db = env.PHYSX_DB;
    if (!db) return NextResponse.json({ error: 'NO_D1_BINDING' }, { status: 500 });

    const row = (await db.prepare('SELECT COUNT(1) as c FROM users WHERE uid=?').bind(uid).first()) as { c: number } | null;
    const isNew = !row || row.c === 0;

    const nowIso = new Date().toISOString();
    const colsMap: Record<string, string> = {
      name: 'name', lastName: 'last_name', phone: 'phone', birthYear: 'birth_year',
      gender: 'gender', province: 'province', district: 'district', school: 'school', grade: 'grade', location: 'location',
    };

    if (isNew) {
      const insertCols = ['uid','email','role','created_at','updated_at'];
      const insertVals: (string | number | null)[] = [uid, email, 'student', nowIso, nowIso];
      for (const [k, v] of Object.entries(profile)) { const col = colsMap[k]; if (!col) continue; insertCols.push(col); insertVals.push(v ?? null); }
      const placeholders = insertCols.map(() => '?').join(',');
      try {
        await db.prepare(`INSERT INTO users (${insertCols.join(',')}) VALUES (${placeholders})`).bind(...insertVals).run();
      } catch (e) {
        if (/UNIQUE constraint failed: users\.phone/i.test(errMsg(e))) return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
        throw e;
      }
    } else {
      const fields: string[] = []; const values: (string | number | null)[] = [];
      for (const [k, v] of Object.entries(profile)) { const col = colsMap[k]; if (!col) continue; fields.push(`${col} = ?`); values.push(v ?? null); }
      fields.push(`updated_at = ?`); values.push(nowIso);
      try {
        await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE uid = ?`).bind(...values, uid).run();
      } catch (e) {
        if (/UNIQUE constraint failed: users\.phone/i.test(errMsg(e))) return NextResponse.json({ error: 'Phone already in use' }, { status: 409 });
        throw e;
      }
    }

    return NextResponse.json(
      { success: true, message: 'User profile updated', isNew, claimUpdated: false, forceTokenRefresh: isNew },
      { status: isNew ? 201 : 200 }
    );
  } catch (e) {
    const msg = errMsg(e);
    const status = /unauthorized/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
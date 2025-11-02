// app/api/sant/problems/route.ts
import { NextResponse } from 'next/server';
import { pickRandomProblems } from './data';

/**
 * GET /api/sant/problems?seed=STUDENT_CODE
 * Сурагч бүрийн code-оос хамаарч 5 бодлого санамсаргүйгээр сонгоно.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const seed = url.searchParams.get('seed') ?? undefined;

    // 🎲 5 бодлого санамсаргүйгээр сонгох
    const items = pickRandomProblems(5, seed);

    // ✅ Client-д тааруулах — зөвхөн массив буцаана
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('🔥 GET /api/sant/problems error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
// app/api/sant/problems/route.ts
import { NextResponse } from 'next/server';
import { pickRandomProblems, problems } from './data';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const seed = url.searchParams.get('seed') ?? undefined;
    const all = url.searchParams.get('all');

    // 🔥 Хэрвээ дадлага горим all=1 гэж дуудаж байвал бүгдийг өгнө
    if (all === '1') {
      return NextResponse.json(problems, { status: 200 });
    }

    // 🎲 шалгалтын үеийнх шиг 5-г random-оор
    const items = pickRandomProblems(5, seed);
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('🔥 GET /api/sant/problems error:', error);
    return NextResponse.json(
      { ok: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
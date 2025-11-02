// app/api/sant/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { problems } from '../problems/data';

export const runtime = 'nodejs'; // Judge0 руу гарах fetch-т Node runtime найдвартай

const JUDGE0_API =
  'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';

export async function POST(req: NextRequest) {
  try {
    const { problemId, code } = (await req.json()) as { problemId?: string; code?: string };
    if (!problemId || !code) {
      return NextResponse.json({ error: 'problemId / code шаардлагатай' }, { status: 400 });
    }

    const problem = problems.find((p) => p.id === problemId);
    if (!problem) return NextResponse.json({ error: 'Бодлого олдсонгүй' }, { status: 404 });

    const apiKey = process.env.RAPIDAPI_KEY ?? '';
    if (!apiKey) {
      return NextResponse.json({ error: 'RAPIDAPI_KEY тохируулаагүй' }, { status: 500 });
    }

    let passed = 0;
    for (const test of problem.tests) {
      const stdin = test.input.endsWith('\n') ? test.input : `${test.input}\n`;

      const submission = await fetch(JUDGE0_API, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        body: JSON.stringify({
          language_id: 71,          // Python 3
          source_code: code,
          stdin,
        }),
      });

      const result = await submission.json();
      const output = (result.stdout ?? '').trim();
      if (output === test.expectedOutput.trim()) passed++;
    }

    const score = Math.round((problem.maxScore * passed) / problem.tests.length);
    return NextResponse.json({ passed, total: problem.tests.length, score });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Код шалгах үед алдаа гарлаа.' }, { status: 500 });
  }
}
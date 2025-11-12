// ./app/api/sant/exam/route.ts
import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

// 🔸 нийтлэг дүн бичих жижиг (одоо ухаантай) функц
async function saveResultAndCleanup(args: {
  name: string;
  className: string;
  code: string;
  problems: Array<{ id: string; title: string; score: number; maxScore: number }>;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
}) {
  const { name, className, code, problems, startTime, endTime, duration } = args;

  // 1. сервер дээр явцын дундах оноо байгаа эсэхийг шалгана
  const examRef = adminFirestore.collection("santexam").doc(code);
  const examSnap = await examRef.get();

  // santexam дээр байсан бодлогууд
  const serverProblems: Array<{ id: string; title: string; score: number; maxScore: number }> =
    examSnap.exists && Array.isArray(examSnap.data()?.problems)
      ? (examSnap.data()!.problems as Array<{ // <--- ЗАСВАР
          id?: unknown;
          title?: unknown;
          score?: unknown;
          maxScore?: unknown;
        }>).map((p, i) => ({ // <--- ЗАСВАР
          id: typeof p.id === "string" ? p.id : `p${i + 1}`,
          title: typeof p.title === "string" ? p.title : "",
          score: typeof p.score === "number" ? p.score : 0,
          maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
        }))
      : [];

  // клиентээс ирсэн бодлогуудыг sanitize хийнэ
  const clientProblems = (problems ?? []).map((p, i) => ({
    id: typeof p.id === "string" ? p.id : `p${i + 1}`,
    title: typeof p.title === "string" ? p.title : "",
    score: typeof p.score === "number" ? p.score : 0,
    maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
  }));

  // 2. merge хийх — id-гаар
  const byId = new Map<string, { id: string; title: string; score: number; maxScore: number }>();

  // эхлээд серверийнхийг хийнэ
  for (const sp of serverProblems) {
    byId.set(sp.id, sp);
  }

  // дараа нь клиентээс ирснийг давхарлана
  for (const cp of clientProblems) {
    const prev = byId.get(cp.id);
    if (!prev) {
      byId.set(cp.id, cp);
    } else {
      byId.set(cp.id, {
        id: cp.id,
        title: cp.title || prev.title,
        // аль ихийг нь авдаг стратеги — ингэснээр сүүлд PATCH-ээр ирсэн өндөр оноо алга болохгүй
        score: Math.max(cp.score, prev.score),
        maxScore: Math.max(cp.maxScore, prev.maxScore),
      });
    }
  }

  const mergedProblems = Array.from(byId.values());

  // 3. нийт оноо
  const safeTotal = mergedProblems.reduce((s, p) => s + (p.score || 0), 0);

  // 4. santexam-ыг цэвэрлэнэ
  await examRef.delete().catch(() => {});

  // 5. santresult дээр бичнэ
  const resultRef = adminFirestore.collection("santresult").doc(code);
  await resultRef.set({
    name,
    class: className,
    code,
    totalScore: safeTotal,
    problems: mergedProblems,
    startTime: startTime || examSnap.data()?.startTime || null,
    endTime: endTime || new Date().toISOString(),
    duration: typeof duration === "number" ? duration : null,
    finishedAt: new Date().toISOString(),
  });
}

// 🔹 Шалгалт эхлүүлэх ЭСВЭЛ (sendBeacon-аар) дуусгах
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = body?.name as string | undefined;
    const className = body?.className as string | undefined;
    const code = body?.code as string | undefined;

    if (!name || !className || !code) {
      return NextResponse.json(
        { ok: false, message: "Missing data" },
        { status: 400 }
      );
    }

    // 🚩 POST дээр problems ирсэн бол → энэ бол дуусгах
    if (Array.isArray(body.problems)) {
      const rawProblems = body.problems as Array<{
        id?: unknown;
        title?: unknown;
        score?: unknown;
        maxScore?: unknown;
      }>;
      const safeProblems = rawProblems.map((p, idx) => ({
        id: typeof p.id === "string" ? p.id : `p${idx + 1}`,
        title: typeof p.title === "string" ? p.title : "",
        score: typeof p.score === "number" ? p.score : 0,
        maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
      }));

      await saveResultAndCleanup({
        name,
        className,
        code,
        problems: safeProblems,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        duration: body.duration ?? null,
      });

      return NextResponse.json({ ok: true });
    }

    // 👇 энэ бол “шинэ шалгалт эхэлж байна”

    // 1) урд нь дуусгасан бол
    const resultRef = adminFirestore.collection("santresult").doc(code);
    const resultSnap = await resultRef.get();
    if (resultSnap.exists) {
      return NextResponse.json(
        {
          ok: false,
          message: "Шалгалтаа өгөөд дууссан байна. Дахин өгөх боломгүй.",
        },
        { status: 409 }
      );
    }

    // 2) одоо өгч байгаа эсэх
    const examRef = adminFirestore.collection("santexam").doc(code);
    const examSnap = await examRef.get();
    if (examSnap.exists) {
      return NextResponse.json(
        {
          ok: false,
          message: "Шалгалт өгч байна. Өөр компьютэрээс дахин өгөх боломгүй.",
        },
        { status: 409 }
      );
    }

    // 3) шинээр үүсгэнэ
    await examRef.set({
      name,
      class: className,
      code,
      startTime: new Date().toISOString(),
      totalScore: 0,
      problems: [],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 POST /api/sant/exam error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// 🔹 Шалгалт дуусах — client-ийн энгийн PUT
export async function PUT(req: Request) {
  try {
    const payload = await req.json() as {
      name?: string;
      className?: string;
      code?: string;
      problems?: Array<{ id?: unknown; title?: unknown; score?: unknown; maxScore?: unknown }>;
      startTime?: string | null;
      endTime?: string | null;
      duration?: number | null;
    };

    const { name, className, code } = payload;
    if (!name || !className || !code) {
      return NextResponse.json(
        { ok: false, message: "Missing data" },
        { status: 400 }
      );
    }

    const rawProblems = Array.isArray(payload.problems) ? payload.problems : [];
    const safeProblems = rawProblems.map((p, idx) => ({
      id: typeof p.id === "string" ? p.id : `p${idx + 1}`,
      title: typeof p.title === "string" ? p.title : "",
      score: typeof p.score === "number" ? p.score : 0,
      maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
    }));

    await saveResultAndCleanup({
      name,
      className,
      code,
      problems: safeProblems,
      startTime: payload.startTime ?? null,
      endTime: payload.endTime ?? null,
      duration: payload.duration ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 PUT /api/sant/exam error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// 🔹 Статус шалгах
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { ok: false, message: "Missing code" },
        { status: 400 }
      );
    }

    // эхлээд дууссан эсэх
    const resultRef = adminFirestore.collection("santresult").doc(code);
    const resultSnap = await resultRef.get();
    if (resultSnap.exists) {
      return NextResponse.json({
        ok: false,
        message: "Шалгалтаа өгөөд дууссан байна. Дахин өгөх боломгүй.",
      });
    }

    // дараа нь өгч байгаа эсэх
    const examRef = adminFirestore.collection("santexam").doc(code);
    const examSnap = await examRef.get();
    if (examSnap.exists) {
      return NextResponse.json({
        ok: false,
        message: "Шалгалт өгч байна. Өөр компьютэрээс дахин өгөх боломгүй.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 GET /api/sant/exam error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

// 🔹 Шалгалтын явцад түр хадгалах
export async function PATCH(req: Request) {
  try {
    const body = await req.json() as {
      code?: string;
      problems?: Array<{ id?: unknown; title?: unknown; score?: unknown; maxScore?: unknown }>;
    };

    const code = typeof body.code === "string" ? body.code : "";
    const rawProblems = Array.isArray(body.problems) ? body.problems : [];

    if (!code || rawProblems.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Missing or invalid data" },
        { status: 400 }
      );
    }

    const safeProblems = rawProblems.map((p, i) => ({
      id: typeof p.id === "string" ? p.id : `p${i + 1}`,
      title: typeof p.title === "string" ? p.title : "",
      score: typeof p.score === "number" ? p.score : 0,
      maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
    }));

    const totalScore = safeProblems.reduce((s, p) => s + p.score, 0);

    const examRef = adminFirestore.collection("santexam").doc(code);
    await examRef.set(
      {
        problems: safeProblems,
        totalScore,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 PATCH /api/sant/exam error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
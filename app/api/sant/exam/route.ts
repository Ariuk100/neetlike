// ./app/api/sant/exam/route.ts
import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

type ProblemPayload = {
  id?: unknown;
  title?: unknown;
  score?: unknown;
  maxScore?: unknown;
};

type SafeProblem = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
};

// 🔸 нийтлэг дүн бичих жижиг (одоо ухаантай) функц
async function saveResultAndCleanup(args: {
  name: string;
  className: string;
  code: string;
  problems: Array<SafeProblem>; // Энд SafeProblem ашиглав
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
}) {
  const { name, className, code, problems, startTime, endTime, duration } = args;

  // 1. сервер дээр явцын дундах оноо байгаа эсэхийг шалгана
  const examRef = adminFirestore.collection("santexam").doc(code);
  const examSnap = await examRef.get();

  // santexam дээр байсан бодлогууд
  const serverProblems: Array<SafeProblem> =
    examSnap.exists && Array.isArray(examSnap.data()?.problems)
      ? (examSnap.data()!.problems as Array<ProblemPayload>).map((p, i) => ({
          id: typeof p.id === "string" ? p.id : `p${i + 1}`,
          title: typeof p.title === "string" ? p.title : "",
          score: typeof p.score === "number" ? p.score : 0,
          maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
        }))
      : [];

  // клиентээс ирсэн бодлогуудыг sanitize хийнэ (Frontend-с [] ирж болно)
  const clientProblems = (problems ?? []).map((p, i) => ({
    id: typeof p.id === "string" ? p.id : `p${i + 1}`,
    title: typeof p.title === "string" ? p.title : "",
    score: typeof p.score === "number" ? p.score : 0,
    maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
  }));

  // 2. merge хийх — id-гаар
  const byId = new Map<string, SafeProblem>();

  // эхлээд серверийнхийг хийнэ
  for (const sp of serverProblems) {
    byId.set(sp.id, sp);
  }

  // дараа нь клиентээс ирснийг давхарлана (Хэрэв frontend [] илгээсэн бол энэ алхам юу ч хийхгүй)
  for (const cp of clientProblems) {
    const prev = byId.get(cp.id);
    if (!prev) {
      byId.set(cp.id, cp);
    } else {
      byId.set(cp.id, {
        id: cp.id,
        title: cp.title || prev.title,
        // аль ихийг нь авдаг стратеги
        score: Math.max(cp.score, prev.score),
        maxScore: Math.max(cp.maxScore, prev.maxScore),
      });
    }
  }

  const mergedProblems = Array.from(byId.values());

  // 3. нийт оноо
  const safeTotal = mergedProblems.reduce((s, p) => s + (p.score || 0), 0);

  // 4. santexam-ыг цэвэрлэнэ
  await examRef.delete().catch(() => {
    // Алдаа гарсан ч үргэлжлүүлнэ
  });

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

    // 👇 *** ЭНД ЗАСВАР ХИЙГДСЭН ***
    // 'body.problems' биш 'body.endTime'-г шалгах.
    // Учир нь 'endExam' хүсэлт 'endTime'-г үргэлж агуулна.
    if (body.endTime) {
      // 'body.problems' байхгүй байж болзол 'rawProblems'-г [] болгоно.
      const rawProblems = Array.isArray(body.problems)
        ? (body.problems as Array<ProblemPayload>)
        : [];
      // 👆 *** /ЗАСВАР ДУУСАВ ***

      const safeProblems: SafeProblem[] = rawProblems.map((p, idx) => ({
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
        startTime: (body.startTime as string | undefined) ?? null,
        endTime: (body.endTime as string | undefined) ?? null,
        duration: (body.duration as number | undefined) ?? null,
      });

      return NextResponse.json({ ok: true });
    }

    // 👇 *** Fix 2: ДАВХАР ОРОХЫГ ЗАСАХ (TRANSACTION) ***
    // Энэ бол “шинэ шалгалт эхэлж байна”
    try {
      await adminFirestore.runTransaction(async (transaction) => {
        // 1) урд нь дуусгасан бол
        const resultRef = adminFirestore.collection("santresult").doc(code);
        const resultSnap = await transaction.get(resultRef);
        if (resultSnap.exists) {
          throw new Error(
            "Шалгалтаа өгөөд дууссан байна. Дахин өгөх боломжгүй."
          );
        }

        // 2) одоо өгч байгаа эсэх
        const examRef = adminFirestore.collection("santexam").doc(code);
        const examSnap = await transaction.get(examRef);
        if (examSnap.exists) {
          throw new Error(
            "Шалгалт өгч байна. Өөр компьютэрээс дахин өгөх боломжгүй."
          );
        }

        // 3) шинээр үүсгэнэ
        transaction.set(examRef, {
          name,
          class: className,
          code,
          startTime: new Date().toISOString(),
          totalScore: 0,
          problems: [],
          updatedAt: new Date().toISOString(),
        });
      });

      // Transaction амжилттай
      return NextResponse.json({ ok: true });

    } catch (transactionError: unknown) {
      // Transaction дотроос шидсэн алдааг барих
      const message =
        transactionError instanceof Error
          ? transactionError.message
          : "Шалгалт эхлүүлэхэд алдаа гарлаа.";

      if (
        message.includes("Шалгалтаа өгөөд дууссан") ||
        message.includes("Шалгалт өгч байна")
      ) {
        return NextResponse.json(
          { ok: false, message: message },
          { status: 409 } // 409 Conflict
        );
      }

      // Transaction-ийн бусад (зэрэг ажиллах) алдаа
      console.error("🔥 Transaction error:", transactionError);
      return NextResponse.json(
        { ok: false, message: "Серверийн ачаалалтай холбоотой алдаа гарлаа." },
        { status: 500 }
      );
    }
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
    const payload = (await req.json()) as {
      name?: string;
      className?: string;
      code?: string;
      problems?: Array<ProblemPayload>; // Энэ undefined байж болно (Fix 3)
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

    // Frontend-ийн Fix 3-с шалтгаалж payload.problems нь undefined байж болно.
    // Энэ тохиолдолд rawProblems нь [] болно.
    const rawProblems = Array.isArray(payload.problems) ? payload.problems : [];
    const safeProblems: SafeProblem[] = rawProblems.map((p, idx) => ({
      id: typeof p.id === "string" ? p.id : `p${idx + 1}`,
      title: typeof p.title === "string" ? p.title : "",
      score: typeof p.score === "number" ? p.score : 0,
      maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
    }));

    await saveResultAndCleanup({
      name,
      className,
      code,
      problems: safeProblems, // Энд [] явж болно, энэ нь зөв.
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
        message: "Шалгалтаа өгөөд дууссан байна. Дахин өгөх боломжгүй.",
      });
    }

    // дараа нь өгч байгаа эсэх
    const examRef = adminFirestore.collection("santexam").doc(code);
    const examSnap = await examRef.get();
    if (examSnap.exists) {
      return NextResponse.json({
        ok: false,
        message: "Шалгалт өгч байна. Өөр компьютэрээс дахин өгөх боломжгүй.",
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
    const body = (await req.json()) as {
      code?: string;
      problems?: Array<ProblemPayload>;
    };

    const code = typeof body.code === "string" ? body.code : "";
    const rawProblems = Array.isArray(body.problems) ? body.problems : [];

    if (!code || rawProblems.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Missing or invalid data" },
        { status: 400 }
      );
    }

    const safeProblems: SafeProblem[] = rawProblems.map((p, i) => ({
      id: typeof p.id === "string" ? p.id : `p${i + 1}`,
      title: typeof p.title === "string" ? p.title : "",
      score: typeof p.score === "number" ? p.score : 0,
      maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
    }));

    const totalScore = safeProblems.reduce((s, p) => s + p.score, 0);

    const examRef = adminFirestore.collection("santexam").doc(code);
    
    // Хэрэв бичилт байхгүй бол (жишээ нь, дөнгөж дууссаны дараа PATCH орж ирвэл)
    // алдаа заахгүйгээр зүгээр өнгөрөөнө.
    const docSnap = await examRef.get();
    if (!docSnap.exists) {
       return NextResponse.json({ ok: true, message: "Exam already finished." });
    }

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
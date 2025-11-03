// ./app/api/sant/exam/route.ts
import { adminFirestore } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

// 🔹 Шалгалт эхлүүлэх
export async function POST(req: Request) {
  try {
    const { name, className, code } = await req.json();

    if (!name || !className || !code) {
      return NextResponse.json(
        { ok: false, message: "Missing data" },
        { status: 400 }
      );
    }

    const examRef = adminFirestore.collection("santexam").doc(code);
    const examSnap = await examRef.get();

    if (examSnap.exists) {
      return NextResponse.json(
        { ok: false, message: "Шалгалт өгч байна. Өөр компьютэрээс дахин өгөх боломжгүй." },
        { status: 409 }
      );
    }

    // ✅ Шалгалт эхэлж байгаа сурагчийн мэдээллийг түр хадгалах
    await examRef.set({
      name,
      class: className,
      code,
      startTime: new Date().toISOString(), // эхэлсэн цаг
       // ⛳️ ЭНЭ 3 МӨР
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

// 🔹 Шалгалт дуусах (НИЙТ ОНООГ СЕРВЕР ДЭЭР ДАХИН ТООЦОЖ ХАДГАЛНА)
export async function PUT(req: Request) {
  try {
    type IncomingProblem = { id?: unknown; title?: unknown; score?: unknown; maxScore?: unknown };
    const payload = await req.json() as {
      name?: string;
      className?: string;
      code?: string;
      totalScore?: unknown; // клиентээс ирснийг үл тооно
      problems?: unknown;
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

    // 🧹 problems-ийг цэвэршүүлэх
    const rawProblems: IncomingProblem[] = Array.isArray(payload.problems) ? (payload.problems as IncomingProblem[]) : [];
    const safeProblems = rawProblems.map((p, idx) => {
      const id = typeof p.id === "string" ? p.id : `p${idx + 1}`;
      const title = typeof p.title === "string" ? p.title : "";
      const score = typeof p.score === "number" ? p.score : 0;
      const maxScore = typeof p.maxScore === "number" ? p.maxScore : 0;
      return { id, title, score, maxScore };
    });

    // 🧮 Нийт оноог сервер дээрээ дахин тооцох
    const safeTotal = safeProblems.reduce((sum, p) => sum + p.score, 0);

    // ✅ Хэрвээ шалгалт өгч байгаа бол устгана
    const examRef = adminFirestore.collection("santexam").doc(code);
    await examRef.delete();

    // ✅ Дүнг хадгална (клиентээс ирсэн totalScore-г бус, серверийн бодсоныг бичнэ)
    const resultRef = adminFirestore.collection("santresult").doc(code);
    await resultRef.set({
      name,
      class: className,
      code,
      totalScore: safeTotal,
      problems: safeProblems,
      startTime: payload.startTime || null,                      // эхэлсэн цаг
      endTime: payload.endTime || new Date().toISOString(),      // дууссан цаг
      duration: typeof payload.duration === "number" ? payload.duration : null, // үргэлжилсэн хугацаа (сек)
      finishedAt: new Date().toISOString(),                      // сервер дээр дууссан цаг
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

// 🔹 Шалгалтын статус шалгах
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

    // ✅ Хэрвээ өмнө шалгалт өгсөн бол
    const resultRef = adminFirestore.collection("santresult").doc(code);
    const resultSnap = await resultRef.get();
    if (resultSnap.exists) {
      return NextResponse.json({
        ok: false,
        message: "Шалгалтаа өгөөд дууссан байна. Дахин өгөх боломжгүй.",
      });
    }

    // ✅ Хэрвээ одоо шалгалт өгч байгаа бол
    const examRef = adminFirestore.collection("santexam").doc(code);
    const examSnap = await examRef.get();
    if (examSnap.exists) {
      return NextResponse.json({
        ok: false,
        message: "Шалгалт өгч байна. Өөр компьютэрээс дахин өгөх боломжгүй.",
      });
    }

    // ✅ Шинээр шалгалт өгөх боломжтой
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 GET /api/sant/exam error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
// ... файл доторхи POST, PUT, GET функцуудын хажууд энэ PATCH-ийг нэмж өгнө

export async function PATCH(req: Request) {
  try {
    type IncomingProblem = { id?: unknown; title?: unknown; score?: unknown; maxScore?: unknown };
    const body = await req.json() as {
      code?: string;
      problems?: IncomingProblem[];
    };

    const code = typeof body.code === "string" ? body.code : "";
    const rawProblems: IncomingProblem[] = Array.isArray(body.problems) ? body.problems : [];
    if (!code || rawProblems.length === 0) {
      return NextResponse.json({ ok: false, message: "Missing or invalid data" }, { status: 400 });
    }

    // 🔒 sanitize
    const safeProblems = rawProblems.map((p, i) => ({
      id: typeof p.id === "string" ? p.id : `p${i+1}`,
      title: typeof p.title === "string" ? p.title : "",
      score: typeof p.score === "number" ? p.score : 0,
      maxScore: typeof p.maxScore === "number" ? p.maxScore : 0,
    }));

    // 🧮 нийт оноо
    const totalScore = safeProblems.reduce((s, p) => s + p.score, 0);

    // ✍️ santexam дээр real-time update (Teacher самбар дээр шууд харагдана)
    const examRef = adminFirestore.collection("santexam").doc(code);
    await examRef.set(
      {
        problems: safeProblems,
        totalScore,
        updatedAt: new Date().toISOString(),
      },
      { merge: true } // зөвхөн эдгээр талбарыг merge хийх
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 PATCH /api/sant/exam error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
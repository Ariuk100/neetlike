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

// 🔹 Шалгалт дуусах
export async function PUT(req: Request) {
  try {
    const {
      name,
      className,
      code,
      totalScore,
      problems,
      startTime,
      endTime,
      duration,
    } = await req.json();

    if (!name || !className || !code) {
      return NextResponse.json(
        { ok: false, message: "Missing data" },
        { status: 400 }
      );
    }

    // ✅ Хэрвээ шалгалт өгч байгаа бол устгана
    const examRef = adminFirestore.collection("santexam").doc(code);
    await examRef.delete();

    // ✅ Дүнг хадгална
    const resultRef = adminFirestore.collection("santresult").doc(code);
    await resultRef.set({
      name,
      class: className,
      code,
      totalScore,
      problems,
      startTime: startTime || null, // эхэлсэн цаг
      endTime: endTime || new Date().toISOString(), // дууссан цаг
      duration: duration ?? null, // үргэлжилсэн хугацаа (сек)
      finishedAt: new Date().toISOString(), // сервер дээр дууссан цаг
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
        message: "Currently taking exam",
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
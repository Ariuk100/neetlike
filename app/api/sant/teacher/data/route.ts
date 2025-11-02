// ./app/api/sant/teacher/data/route.ts
import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import * as XLSX from "xlsx";

type Row = {
  name: string;
  class: string;
  code: string;
  status: "Шалгалт өгч байна" | "Шалгалт дууссан";
  startTime: string;
  finishedAt: string;
  totalScore: number | string;
};

// аюулгүй хөрвүүлэх туслахууд
const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const asNumberOrEmpty = (v: unknown): number | "" =>
  typeof v === "number" ? v : "";

export async function GET() {
  try {
    // 1️⃣ santexam ба santresult-оос бүх өгөгдлийг авна
    const [examSnap, resultSnap] = await Promise.all([
      adminFirestore.collection("santexam").get(),
      adminFirestore.collection("santresult").get(),
    ]);

    const rows: Row[] = [];

    examSnap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      rows.push({
        name: asString(d.name),
        class: asString(d.class),
        code: asString(d.code) || doc.id,
        status: "Шалгалт өгч байна",
        startTime: asString(d.startTime),
        finishedAt: "",
        totalScore: "",
      });
    });

    resultSnap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      rows.push({
        name: asString(d.name),
        class: asString(d.class),
        code: asString(d.code) || doc.id,
        status: "Шалгалт дууссан",
        startTime: asString(d.startTime),
        finishedAt: asString(d.finishedAt),
        totalScore: asNumberOrEmpty(d.totalScore),
      });
    });

    // 2️⃣ Excel болгож хөрвүүлнэ
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 3️⃣ Collection-уудыг бүрэн устгана
    const batch = adminFirestore.batch();
    examSnap.forEach((doc) => batch.delete(doc.ref));
    resultSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // 4️⃣ Excel файл байдлаар буцаана
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="exam_results.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (e) {
    console.error("🔥 GET /api/sant/teacher/data error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import * as XLSX from "xlsx";

type Row = {
  name: string;
  class: string;
  code: string;
  status: "Шалгалт өгч байна" | "Шалгалт дууссан";
  startTime: string;
  endTime: string;
  finishedAt: string;
  duration: number | "";
  totalScore: number | "";
  problems: string; // JSON хэлбэрээр бүх бодлогууд
};

// туслах хөрвүүлэгчид
const asString = (v: unknown, fb = ""): string =>
  typeof v === "string" ? v : fb;
const asNumberOrEmpty = (v: unknown): number | "" => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : "";
  }
  return "";
};

export async function GET() {
  try {
    const [examSnap, resultSnap] = await Promise.all([
      adminFirestore.collection("santexam").get(),
      adminFirestore.collection("santresult").get(),
    ]);

    const rows: Row[] = [];

    // 🟢 Дууссан шалгалтууд
    resultSnap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      const problems = Array.isArray(d.problems) ? d.problems : [];
      rows.push({
        name: asString(d.name),
        class: asString(d.class),
        code: asString(d.code) || doc.id,
        status: "Шалгалт дууссан",
        startTime: asString(d.startTime),
        endTime: asString(d.endTime),
        finishedAt: asString(d.finishedAt),
        duration: asNumberOrEmpty(d.duration),
        totalScore: asNumberOrEmpty(d.totalScore),
        problems: JSON.stringify(problems, null, 2),
      });
    });

    // 🔵 Одоогоор өгч байгаа шалгалтууд
    examSnap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      const problems = Array.isArray(d.problems) ? d.problems : [];
      rows.push({
        name: asString(d.name),
        class: asString(d.class),
        code: asString(d.code) || doc.id,
        status: "Шалгалт өгч байна",
        startTime: asString(d.startTime),
        endTime: asString(d.endTime),
        finishedAt: asString(d.finishedAt),
        duration: asNumberOrEmpty(d.duration),
        totalScore: asNumberOrEmpty(d.totalScore),
        problems: JSON.stringify(problems, null, 2),
      });
    });

    // Excel болгон хөрвүүлэх
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    // Баганын өргөн тохируулах
    (ws["!cols"] as XLSX.ColInfo[]) = [
      { wch: 20 }, // name
      { wch: 10 }, // class
      { wch: 10 }, // code
      { wch: 18 }, // status
      { wch: 22 }, // startTime
      { wch: 22 }, // endTime
      { wch: 22 }, // finishedAt
      { wch: 10 }, // duration
      { wch: 10 }, // totalScore
      { wch: 80 }, // problems JSON
    ];

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Хэрвээ Excel татсаны дараа бүх өгөгдлийг цэвэрлэх бол:
     const batch = adminFirestore.batch();
     examSnap.forEach((doc) => batch.delete(doc.ref));
     resultSnap.forEach((doc) => batch.delete(doc.ref));
     await batch.commit();

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
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
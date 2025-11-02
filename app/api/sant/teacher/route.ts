import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { ok: false, message: "Missing code" },
        { status: 400 }
      );
    }

    // 🔹 password.json байрлалыг тодорхойлно
    const filePath = path.join(process.cwd(), "app/api/sant/teacher/password.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { ok: false, message: "password.json not found" },
        { status: 500 }
      );
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as { code?: string };

    if (!data.code) {
      return NextResponse.json(
        { ok: false, message: "Teacher password missing in file" },
        { status: 500 }
      );
    }

    if (data.code !== code) {
      return NextResponse.json(
        { ok: false, message: "Wrong password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("🔥 POST /api/sant/teacher error:", e);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
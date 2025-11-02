import { NextResponse } from 'next/server'
import { STUDENTS, Student } from './data'

export const dynamic = 'force-dynamic' // кэшлэхгүй

// GET /api/sant/students?class=10A&q=bat
//  - class: ангилж буцаана
//  - q: нэр/код дээр энгийн хайлт
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const klass = (searchParams.get('class') || '').trim()
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  let list = STUDENTS

  if (klass) {
    list = list.filter(s => s.class === klass)
  }
  if (q) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    )
  }

  // Харагдуулах талбаруудаа хязгаарлаж болно:
  const safe = list.map(({ class: c, code, name }: Student) => ({ class: c, code, name }))

  return NextResponse.json(safe, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/sant/students
// Body: { class: "10A", code: "A123" }
// → Нэг сурагчийг шалгаж буцаах (түр "нэвтрэх" мэт хэрэглэнэ)
export async function POST(req: Request) {
  try {
    const body = await req.json() as { class?: string; code?: string }
    const klass = (body.class || '').trim()
    const code = (body.code || '').trim()

    if (!klass || !code) {
      return NextResponse.json({ error: 'class болон code шаардлагатай' }, { status: 400 })
    }

    const found = STUDENTS.find(s => s.class === klass && s.code === code)
    if (!found) {
      return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 })
    }

    // Клиентэд өгөх хамгийн бага мэдээлэл
    return NextResponse.json({
      ok: true,
      student: { class: found.class, code: found.code, name: found.name }
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}
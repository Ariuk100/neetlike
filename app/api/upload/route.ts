import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('http://localhost:8787/upload', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  return NextResponse.json(data)
}
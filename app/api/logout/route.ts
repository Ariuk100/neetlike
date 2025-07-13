// /app/api/logout/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ status: 'logged out' })

  // ❌ __session cookie-г устгана
  response.cookies.set({
    name: '__session',
    value: '',
    maxAge: 0, // устгах
    path: '/',
  })

  return response
}
// app/api/logout/route.ts
import { NextResponse } from 'next/server'
export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ status: 'logged out' })

  // __session cookie устгах
  res.cookies.set('__session', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true, // login дээр хэрхэн өгсөн бол тэр адил
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  // Хэрвээ user_role cookie байгаа бол устгана
  res.cookies.set('user_role', '', {
    maxAge: 0,
    path: '/',
    httpOnly: false, // Хэрэв client JS-с уншдаг бол false
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  return res
}
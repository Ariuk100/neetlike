// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware-ээс хасах замууд (public routes, API routes, Next.js internal files)
// Эдгээр замуудад middleware ажиллахгүй.
const EXCLUDED_PATHS = [
  '/auth', // Нэвтрэх хуудас
  '/api/', // API routes (Firebase Admin SDK-г энд ашиглана)
  '/unauthorized', // Эрхгүй үед харуулах хуудас
  '/_next/', // Next.js-ийн дотоод файлууд (JS, CSS, Image optimization гэх мэт)
  '.', // Фавикон, зураг гэх мэт статик файлууд (pathname.includes('.')-ээр шалгана)
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Хэрэв одоогийн зам EXCLUDED_PATHS жагсаалтад багтаж байвал,
  // middleware-ийг алгасаж, хүсэлтийг үргэлжлүүлнэ.
  if (EXCLUDED_PATHS.some(prefix => pathname.startsWith(prefix) || pathname.includes(prefix))) {
    return NextResponse.next();
  }

  // Хэрэглэгчийн сешн кукиг хүсэлтээс авна.
  const sessionCookie = request.cookies.get('__session')?.value;

  // Хэрэв сешн куки байхгүй бол (хэрэглэгч нэвтрээгүй байна),
  // нэвтрэх хуудас руу чиглүүлнэ.
  // Энэ нь хамгаалагдсан бүх замуудад хамаарна.
  if (!sessionCookie) {
    console.log('Middleware: No session cookie found, redirecting to /auth.');
    const loginUrl = request.nextUrl.clone(); // Одоогийн URL-ийг хуулбарлана
    loginUrl.pathname = '/auth'; // Замыг /auth болгож өөрчилнө
    return NextResponse.redirect(loginUrl); // Шинэ URL руу чиглүүлнэ
  }

  // Хэрэв сешн куки байгаа бол хүсэлтийг үргэлжлүүлнэ.
  // Хэрэглэгчийн үүргийг шалгах, сешн баталгаажуулах зэрэг илүү нарийн логикийг
  // одоо Server Components (layout.tsx) болон API Routes дотор хийнэ.
  return NextResponse.next();
}

export const config = {
  // matcher нь middleware-ийг ажиллах замуудыг тодорхойлно.
  // Энэ regex нь EXCLUDED_PATHS-д заасан замуудаас бусад бүх замыг тааруулна.
  // Жишээ нь: /admin, /student, /teacher, /moderator, / зэрэг замуудад ажиллана.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|auth|unauthorized).*)',
  ],
};

// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Хамгаалах шаардлагатай route-ууд болон тэдгээрт хандах эрхүүдийг тодорхойлно.
const authConfig = {
  '/student': ['student'],
  '/teacher': ['teacher'],
  '/admin': ['admin'],
  '/moderator': ['moderator'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Нэвтрэх болон бүртгүүлэх хуудсууд, мөн API routes-г middleware-ээс хасна.
  // Эдгээр нь үргэлж хандах боломжтой.
  if (
    pathname === '/auth' ||
    pathname.startsWith('/api/') ||
    pathname === '/unauthorized'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('__session')?.value;
  const userRoleCookie = request.cookies.get('user_role')?.value;

  // � ШИНЭ ЛОГИК: Үндсэн хуудсыг хэрхэн зохицуулах вэ?
  if (pathname === '/') {
    // Хэрэв session cookie байхгүй бол (нэвтрээгүй хэрэглэгч)
    if (!sessionCookie) {
      return NextResponse.next(); // Нүүр хуудас руу хандахыг зөвшөөрнө
    } else {
      // Хэрэв session cookie байгаа бол (нэвтэрсэн хэрэглэгч)
      // userRoleCookie-г ашиглан үүрэгт нь тохирсон хуудас руу чиглүүлнэ.
      const actualUserRole = userRoleCookie; // Энэ нь /api/login-оос тохируулагдсан үүрэг байна

      let redirectPath = '/unauthorized'; // Default to unauthorized if role is not mapped
      switch (actualUserRole) {
        case 'student':
          redirectPath = '/student';
          break;
        case 'teacher':
          redirectPath = '/teacher';
          break;
        case 'admin':
          redirectPath = '/admin';
          break;
        case 'moderator':
          redirectPath = '/moderator';
          break;
        default:
          redirectPath = '/unauthorized';
          break;
      }
      // Зөвхөн үндсэн хуудаснаас өөр хуудас руу шилжүүлнэ
      if (request.nextUrl.pathname !== redirectPath) {
          return NextResponse.redirect(new URL(redirectPath, request.url));
      }
      // Хэрэв одоогийн зам нь redirectPath-тэй ижил бол, үргэлжлүүлнэ (редирект хийхгүй)
      return NextResponse.next();
    }
  }

  // 🔴 ЭНДЭЭС ДООШ Protected Routes-ийн логик эхэлнэ.
  // Хэрэв session token байхгүй бол (protected route руу хандах гэж оролдсон)
  if (!sessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth';
    return NextResponse.redirect(loginUrl);
  }

  // Хэрэглэгчийн үүрэг cookie байхгүй бол (гэхдээ sessionToken байгаа бол)
  // Энэ нь сесс буруу эсвэл бүрэн бус байгааг илтгэнэ.
  if (!userRoleCookie) {
    console.warn('Middleware: user_role cookie not found for protected route, redirecting to auth.');
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth';
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('__session');
    response.cookies.delete('user_role');
    return response;
  }

  // user_role cookie-ээс уншсан үүргийг шууд ашиглана.
  const actualUserRole = userRoleCookie;

  let requiredRoles: string[] | undefined;
  for (const routePrefix in authConfig) {
    if (pathname.startsWith(routePrefix)) {
      requiredRoles = authConfig[routePrefix as keyof typeof authConfig];
      break;
    }
  }

  // Хэрэв тухайн маршрут хамгаалагдсан бөгөөд хэрэглэгчийн эрх зөвшөөрөгдөөгүй бол
  if (requiredRoles && !requiredRoles.includes(actualUserRole)) {
    console.log(`Access Denied: User role '${actualUserRole}' cannot access '${pathname}'. Required roles: ${requiredRoles.join(', ')}`);
    const unauthorizedUrl = request.nextUrl.clone();
    unauthorizedUrl.pathname = '/unauthorized';
    return NextResponse.redirect(unauthorizedUrl);
  }

  // Хэрэв бүх шалгалтыг давсан бол хүсэлтийг үргэлжлүүлнэ.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|auth|unauthorized).*)',
  ],
};

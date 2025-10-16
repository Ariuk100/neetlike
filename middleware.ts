import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Role-оос хамаарч аль хуудас руу үсэргэхийг тодорхойлно
const DASHBOARD_PATHS: { [key: string]: string } = {
  student: '/student',
  teacher: '/teacher',
  moderator: '/moderator',
  admin: '/admin',
}

// Хуудас бүрд хандах боломжтой эрхүүдийн тохиргоо
const PAGE_ROLES: { [key: string]: string[] } = {
  '/student': ['student', 'admin'],
  '/teacher': ['teacher', 'admin'],
  '/moderator': ['moderator', 'admin'],
  '/admin': ['admin'],
  '/profile': ['student', 'teacher', 'moderator', 'admin'],
}

// Нэвтрэх, бүртгүүлэх хуудасны замууд
const AUTH_ROUTES = ['/login', '/register', '/forgot', '/auth']

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl
  const url = request.url
  const sessionCookie = request.cookies.get('__session')?.value

  // Хэрэглэгчийн эрхийг API-аас шалгах туслах функц
  const getUserRole = async (): Promise<string | null> => {
    if (!sessionCookie) return null
    try {
      const response = await fetch(`${origin}/api/auth/verify-session`, {
        method: 'POST',
        headers: { Cookie: `__session=${sessionCookie}` },
        body: JSON.stringify({}),
      })

      if (!response.ok) return null
      const data = (await response.json()) as { user?: { role?: string } }
      return data.user?.role || null
    } catch (error) {
      console.error('Middleware API fetch error:', error)
      return null
    }
  }

  const userRole = await getUserRole()

  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))
  const protectedRoutePrefix = Object.keys(PAGE_ROLES).find(prefix =>
    pathname.startsWith(prefix)
  )

  // ---- 1. Нүүр хуудасны лоик (`/`) ----
  if (pathname === '/') {
    // Хэрэглэгч нэвтэрсэн бол өөрийн dashboard руу үсэргэнэ
    if (userRole) {
      const dashboardUrl = DASHBOARD_PATHS[userRole] || '/student'
      return NextResponse.redirect(new URL(dashboardUrl, url))
    }
    // ✅ ЗАСВАРЛАСАН: Нэвтрээгүй бол нүүр хуудсыг харуулна
    return NextResponse.next()
  }

  // ---- 2. Нэвтрэх хуудасны логик (`/auth`, `/login`...) ----
  if (isAuthRoute) {
    // Нэвтэрсэн хэрэглэгч нэвтрэх хуудас руу орвол dashboard руу үсэргэнэ
    if (userRole) {
      const dashboardUrl = DASHBOARD_PATHS[userRole] || '/student'
      return NextResponse.redirect(new URL(dashboardUrl, url))
    }
    // Нэвтрээгүй бол нэвтрэх хуудсыг харуулна
    return NextResponse.next()
  }

  // ---- 3. Хамгаалалттай хуудасны логик (`/student`, `/profile`...) ----
  if (protectedRoutePrefix) {
    // Нэвтрээгүй бол login хуудас руу үсэргэнэ
    if (!userRole) {
      const loginUrl = new URL('/auth', url)
      loginUrl.searchParams.set('next', pathname)
      const response = NextResponse.redirect(loginUrl)
      // Хүчингүй cookie байж магадгүй тул цэвэрлэнэ
      if (sessionCookie) response.cookies.delete('__session')
      return response
    }

    const allowedRoles = PAGE_ROLES[protectedRoutePrefix]
    // Эрх хүрэхгүй бол /unauthorized хуудас руу үсэргэнэ
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', url))
    }
  }

  // Дээрх нөхцөлүүдэд тохирохгүй бол хүсэлтийг зөвшөөрнө
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Middleware-г статик файлууд болон API замаас бусад бүх зам дээр ажиллуулна
    '/((?!api|_next/static|_next/image|assets|favicon.ico).*)',
  ],
}


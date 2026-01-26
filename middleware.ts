//middleware/ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Role төрлийн хамгаалалт
type Role = 'student' | 'teacher' | 'moderator' | 'admin'
function isRole(v: unknown): v is Role {
  return v === 'student' || v === 'teacher' || v === 'moderator' || v === 'admin'
}

// Role-оос хамаарч аль хуудас руу үсэргэхийг тодорхойлно
const DASHBOARD_PATHS = {
  student: '/student',
  teacher: '/teacher',
  moderator: '/moderator',
  admin: '/admin',
} as const satisfies Record<Role, string>

// Хуудас бүрд хандах боломжтой эрхүүдийн тохиргоо
const PAGE_ROLES: Record<string, Role[]> = {
  '/student': ['student', 'admin'],
  '/teacher': ['teacher', 'admin'],
  '/moderator': ['moderator', 'admin'],
  '/admin': ['admin'],
  '/profile': ['student', 'teacher', 'moderator', 'admin'],
}

// Нэвтрэх, бүртгүүлэх хуудасны замууд
const AUTH_ROUTES = ['/login', '/auth'] as const

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl
  const url = request.url
  const sessionCookie = request.cookies.get('__session')?.value ?? null

  // verify-session API-н хариуг type-тайгаар тодорхойлно
  type VerifySessionResponse = {
    customToken?: string
    role?: Role
  }

  // Хэрэглэгчийн эрхийг API-аас шалгах туслах функц
  const getUserRole = async (): Promise<Role | null> => {
    if (!sessionCookie) return null
    try {
      const response = await fetch(`${origin}/api/auth/verify-session`, {
        method: 'POST',
        // Cookie-г дамжуулж байна (same-origin)
        headers: {
          Cookie: `__session=${sessionCookie}`,
          'Content-Type': 'application/json',
        },
        // Body шаардлагагүй ч JSON гэж тодорхойлсон тул хоосон объект
        body: JSON.stringify({}),
      })

      // 204 → нэвтрээгүй
      if (response.status === 204) return null
      if (!response.ok) return null

      const data = (await response.json()) as VerifySessionResponse
      const role = data.role
      return isRole(role) ? role : null
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

  // ---- 1. Нүүр хуудасны логик (`/`) ----
  if (pathname === '/') {
    // Хэрэглэгч нэвтэрсэн бол өөрийн dashboard руу үсэргэнэ
    if (userRole) {
      const dashboardUrl = DASHBOARD_PATHS[userRole]
      return NextResponse.redirect(new URL(dashboardUrl, url))
    }
    // Нэвтрээгүй бол нүүр хуудсыг харуулна
    return NextResponse.next()
  }

  // ---- 2. Нэвтрэх хуудасны логик (`/auth`, `/login`...) ----
  if (isAuthRoute) {
    // Нэвтэрсэн хэрэглэгч нэвтрэх хуудас руу орвол dashboard руу үсэргэнэ
    if (userRole) {
      const dashboardUrl = DASHBOARD_PATHS[userRole]
      return NextResponse.redirect(new URL(dashboardUrl, url))
    }
    // Нэвтрээгүй бол нэвтрэх хуудсыг харуулна
    return NextResponse.next()
  }

  // ---- 3. Хамгаалалттай хуудасны логик (`/student`, `/profile`...) ----
  if (protectedRoutePrefix) {
    // Нэвтрээгүй бол login хуудас руу үсэргэнэ
    if (!userRole) {
      const loginUrl = new URL('/login', url)
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
    '/((?!api|_next/static|_next/image|assets|favicon.ico|students.json).*)',
  ],
}
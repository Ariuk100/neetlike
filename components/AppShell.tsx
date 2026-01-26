'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const CHROMELESS_PATHS = ['/not-found', '/auth', '/login', '/sant/cpp', '/sant', '/'] // Sidebar-гүй хуудасны жагсаалт

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const pathname = usePathname()

  // Жагсаалтад байгаа замуудын аль нэгээр эхэлж байвал `Sidebar`-г нууна.
  // '/' тэмдэг нь бүх замтай таардаг тул тусад нь шалгах хэрэгтэй.
  const isHomePage = pathname === '/';
  const hideChrome = isHomePage || CHROMELESS_PATHS.some(path => path !== '/' && pathname.startsWith(path));

  if (pathname.startsWith('/sant/whiteboard')) {
    return <>{children}</>
  }

  if (pathname.startsWith('/sant/cpp')) {
    return <main className="w-full h-screen overflow-hidden">{children}</main>
  }

  if (hideChrome) {
    return <main className="container mx-auto px-4">{children}</main>
  }

  return (
    <>
      <Sidebar />
      <main className="w-full min-h-screen bg-stone-50/50 dark:bg-stone-950">{children}</main>
    </>
  )
}
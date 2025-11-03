'use client'

import { usePathname } from 'next/navigation'
import Header from '../components/header/Header'

const CHROMELESS_PATHS = ['/not-found','/auth', '/login', '/register','/forgot','/sant','/',] // Header-гүй хуудасны жагсаалт

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const pathname = usePathname()
  
  // Жагсаалтад байгаа замуудын аль нэгээр эхэлж байвал `Header`-г нууна
  const hideChrome = CHROMELESS_PATHS.some(path => pathname.startsWith(path))

  if (hideChrome) {
    return <main className="container mx-auto px-4">{children}</main>
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 pt-[90px]">{children}</main>
    </>
  )
}
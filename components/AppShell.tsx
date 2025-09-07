'use client'

import { usePathname } from 'next/navigation'
import Header from '../components/header/Header' 

type Props = { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const pathname = usePathname()
  const hideChrome = pathname.startsWith('/auth') || pathname === '/login' || pathname === '/register'

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



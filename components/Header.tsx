'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { UserCircle2 } from 'lucide-react'
import Image from 'next/image'

export default function Header() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [mainOpen, setMainOpen] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const mainDropdownRef = useRef<HTMLDivElement>(null)

  // ...

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node

    if (profileRef.current && !profileRef.current.contains(target)) {
      setProfileOpen(false)
    }

    if (mainDropdownRef.current && !mainDropdownRef.current.contains(target)) {
      setMainOpen(false)
      setSubOpen(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [])

// ✅ pathname өөрчлөгдөх үед бүх цэс хаах
useEffect(() => {
  setMainOpen(false)
  setSubOpen(false)
  setProfileOpen(false)
}, [pathname])

  if (pathname === '/auth' || loading) return null

  const handleLogout = async () => {
    try {
      await signOut(auth) // Firebase client-с гарах
  
      await fetch('/api/logout', {
        method: 'POST',
      }) // ✅ session cookie устгах
  
      router.push('/auth') // Нэвтрэх хуудас руу буцах
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const handleLogoClick = () => {
    if (!user) return
    if (user.role === 'admin') router.push('/admin')
    else if (user.role === 'teacher') router.push('/teacher')
    else if (user.role === 'moderator') router.push('/moderator')
    else router.push('/student')
  }

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="mx-auto max-w-screen-xl flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <button onClick={handleLogoClick} className="text-xl font-bold text-blue-600 hover:underline">
          <span className="text-black">📚</span> MyApp
        </button>

        {/* LEFT Nav */}
        {user && (
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-700">
            {user.role === 'student' && (
              <>
                <Link href="/student">Нүүр</Link>

                <div className="relative" ref={mainDropdownRef}>
                  <button
                    onClick={() => setMainOpen(!mainOpen)}
                    className="hover:text-blue-600 transition"
                  >
                    Шалгалтууд ▾
                  </button>
                  {mainOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white border rounded shadow w-48 z-50">
                      <Link href="/student/tests" className="block px-4 py-2 hover:bg-gray-100">
                        Бүх тест
                      </Link>

                      <div className="relative">
                        <button
                          onClick={() => setSubOpen(!subOpen)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          Бүх шалгалт ▸
                        </button>
                        {subOpen && (
                          <div className="absolute top-0 left-full ml-1 bg-white border rounded shadow w-44 z-50">
                            <Link href="/student/exams/eesh" className="block px-4 py-2 hover:bg-gray-100">ЭЕШ</Link>
                            <Link href="/student/tests/math" className="block px-4 py-2 hover:bg-gray-100">Математик</Link>
                            <Link href="/student/tests/biology" className="block px-4 py-2 hover:bg-gray-100">Биологи</Link>
                          </div>
                        )}
                      </div>

                      <Link href="/student/tests/upcoming" className="block px-4 py-2 hover:bg-gray-100">
                        Ирэх шалгалт
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {user.role === 'teacher' && (
              <>
                <Link href="/teacher">Багшийн самбар</Link>
                <Link href="/teacher/students">Сурагчид</Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link href="/admin">Админ</Link>
                <Link href="/admin/users">Хэрэглэгчид</Link>
              </>
            )}
            {user.role === 'moderator' && (
              
              <div className="relative" ref={mainDropdownRef}>
              <button
                onClick={() => setMainOpen(!mainOpen)}
                className="hover:text-blue-600 transition"
              >
                Тестүүд ▾
              </button>
              {mainOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border rounded shadow w-48 z-50">
              
                  <div className="relative">
                    <button
                      onClick={() => setSubOpen(!subOpen)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Тест хийх ▸
                    </button>
                    {subOpen && (
                      <div className="absolute top-0 left-full ml-1 bg-white border rounded shadow w-44 z-50">
                        <Link href="/moderator/tests/create" className="block px-4 py-2 hover:bg-gray-100">Нэг нэгээр хийх</Link>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
            
            )}
          </nav>
        )}

        {/* RIGHT side */}
        <div className="flex items-center gap-4">
          {!user && (
            <Link href="/auth">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md">
                Нэвтрэх / Бүртгүүлэх
              </Button>
            </Link>
          )}





{user && (
  <div className="relative z-10  flex items-center gap-3" ref={profileRef}>
    <button onClick={() => setProfileOpen(!profileOpen)} className="focus:outline-none">
      {user.photoURL ? (
        <Image
          src={user.photoURL}
          alt="Профайл зураг"
          width={36}
          height={36}
          className="rounded-full border border-gray-300 object-cover"
        />
      ) : (
        <UserCircle2 size={36} className="text-gray-700 hover:text-blue-500" />
      )}
    </button>

    {/* 👇 Хэрэглэгчийн нэр болон роль */}
    <div className="flex flex-col text-sm leading-tight text-right">
      <span className="font-semibold text-gray-800">{user.name}</span>
      <span className="text-gray-500 capitalize">{user.role}</span>
    </div>

    {profileOpen && (
      <div className="absolute top-full right-0 mt-2 bg-white border rounded shadow w-40 z-50">
        <Link
          href={
            user.role === 'admin'
              ? '/admin/profile'
              : user.role === 'teacher'
              ? '/teacher/profile'
              : user.role === 'moderator'
              ? '/moderator/profile'
              : '/student/profile'
          }
          className="block px-4 py-2 hover:bg-gray-100"
        >
          Профайл
        </Link>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
        >
          Гарах
        </button>
      </div>
    )}
  </div>
)}
        </div>
      </div>
    </motion.header>
  )
}
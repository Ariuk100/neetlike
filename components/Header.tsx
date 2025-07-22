'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { UserCircle2, Home, BookOpen, Calculator, Users, PlusCircle, Eye, Settings, ClipboardList, Award, Leaf, Calendar } from 'lucide-react' // Нэмэлт икон импортлосон
import Image from 'next/image'
import { toast } from 'sonner' // toast-г импортлосон

export default function Header() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [mainOpen, setMainOpen] = useState(false)
  const [createSubOpen, setCreateSubOpen] = useState(false) // "Тест хийх" цэсийн sub-dropdown-д зориулсан
  const [viewSubOpen, setViewSubOpen] = useState(false); // "Тест харах" цэсийн sub-dropdown-д зориулсан
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const mainDropdownRef = useRef<HTMLDivElement>(null) // Энэ нь "Тестүүд" үндсэн цэсийг удирдах ref

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node

    // If clicking outside the profile dropdown, close it
    if (profileRef.current && !profileRef.current.contains(target)) {
      setProfileOpen(false)
    }

    // If clicking outside the main dropdown, close it and its sub-dropdowns
    // This check ensures that clicking on a sub-dropdown item or its toggle
    // does not close the main dropdown immediately.
    if (mainDropdownRef.current && !mainDropdownRef.current.contains(target)) {
      setMainOpen(false)
      setCreateSubOpen(false)
      setViewSubOpen(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [])

// Close all dropdowns when pathname changes
useEffect(() => {
  setMainOpen(false)
  setCreateSubOpen(false)
  setViewSubOpen(false)
  setProfileOpen(false)
}, [pathname])

  if (pathname === '/auth' || loading) return null

  const handleLogout = async () => {
    try {
      await signOut(auth) // Firebase client-с гарах
      console.log('Firebase client-side logout successful.'); // Нэмэлт лог
  
      const response = await fetch('/api/logout', {
        method: 'POST',
      }); // ✅ session cookie устгах
  
      if (!response.ok) {
        // Серверээс ирсэн алдааг илүү тодорхой харуулах
        const errorData = await response.json();
        console.error('Server-side logout API error:', errorData);
        throw new Error(errorData.error || 'Серверээс гарах үйлдэл амжилтгүй боллоо.');
      }
      console.log('Server-side logout API successful.'); // Нэмэлт лог
  
      router.replace('/'); // Redirect to home page
    } catch (err: unknown) { // 'any' -> 'unknown' болгосон
      const errorMessage = (err instanceof Error) ? err.message : 'Үл мэдэгдэх алдаа гарлаа.';
      console.error('Logout error:', errorMessage, err); // Алдааны объектыг бүрэн хэвлэх
      toast.error(`Гарах үед алдаа гарлаа: ${errorMessage}`);
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
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md" // Ерөнхий Header-ийн сүүдэр
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Top Bar - sqrt.mn-ийн дээд хэсэг шиг */}
      <div className="bg-gray-800 py-2 px-8 flex items-center justify-between">
        {/* Logo */}
        <button onClick={handleLogoClick} className="text-2xl font-bold text-white flex items-center">
          <span className="text-red-500 text-3xl font-extrabold mr-1">√</span>
          <span className="text-white">sqrt.mn</span>
        </button>

        {/* RIGHT side - Profile */}
        <div className="flex items-center gap-3 relative" ref={profileRef}>
          {!user && (
            <Link href="/auth">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm">
                Нэвтрэх / Бүртгүүлэх
              </Button>
            </Link>
          )}

          {user && (
            <>
              <button onClick={() => setProfileOpen(!profileOpen)} className="focus:outline-none flex items-center gap-2 text-white hover:text-gray-300 transition-colors duration-200">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt="Профайл зураг"
                    width={32}
                    height={32}
                    className="rounded-full border border-gray-600 object-cover"
                  />
                ) : (
                  <UserCircle2 size={32} className="text-gray-400" />
                )}
                <span className="font-medium text-sm">{user.name || user.email?.split('@')[0]}</span>
                {user.readableId && (
                  <span className="ml-1 text-xs text-gray-400">({user.readableId})</span>
                )}
              </button>

              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-40 z-50 overflow-hidden"
                >
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
                    className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <Settings size={16} className="inline-block mr-2 text-gray-500" /> Профайл
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    Гарах
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation Bar - sqrt.mn-ийн доод хэсэг шиг */}
      <div className="bg-gray-100 py-3 px-8 border-t border-gray-200">
        {user && (
          <nav className="flex items-center gap-8 text-sm font-medium text-gray-700">
            {user.role === 'student' && (
              <>
                <Link href="/student" className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200">
                  <Home size={18} /> Нүүр хуудас
                </Link>

                <div className="relative" ref={mainDropdownRef}>
                  <button
                    onClick={() => setMainOpen(!mainOpen)}
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200"
                  >
                    <BookOpen size={18} /> Шалгалтууд ▾
                  </button>
                  {mainOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-48 z-50" // overflow-hidden хассан
                    >
                      <Link href="/student/tests" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
                        <ClipboardList size={16} className="text-gray-500" /> Бүх тест
                      </Link>

                      <div className="relative">
                        <button
                          onClick={() => setCreateSubOpen(!createSubOpen)}
                          className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
                        >
                          Бүх шалгалт ▸
                        </button>
                        {createSubOpen && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-0 left-full ml-1 bg-white border border-gray-200 rounded-md shadow-lg w-44 z-50 overflow-hidden"
                          >
                            <Link href="/student/exams/eesh" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
                              <Award size={16} className="text-gray-500" /> ЭЕШ
                            </Link>
                            <Link href="/student/tests/math" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
                              <Calculator size={16} className="text-gray-500" /> Математик
                            </Link>
                            <Link href="/student/tests/biology" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
                              <Leaf size={16} className="text-gray-500" /> Биологи
                            </Link>
                          </motion.div>
                        )}
                      </div>

                      <Link href="/student/tests/upcoming" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
                        <Calendar size={16} className="text-gray-500" /> Ирэх шалгалт
                      </Link>
                    </motion.div>
                  )}
                </div>
              </>
            )}

            {user.role === 'teacher' && (
              <>
                <Link href="/teacher" className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200">
                  <Home size={18} /> Багшийн самбар
                </Link>
                <Link href="/teacher/students" className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200">
                  <Users size={18} /> Сурагчид
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <Link href="/admin" className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200">
                  <Home size={18} /> Админ
                </Link>
                <Link href="/admin/users" className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200">
                  <Users size={18} /> Хэрэглэгчид
                </Link>
              </>
            )}
            {user.role === 'moderator' && (
              
              <div className="relative" ref={mainDropdownRef}>
              <button
                onClick={() => setMainOpen(!mainOpen)}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors duration-200"
              >
                <BookOpen size={18} /> Тестүүд ▾
              </button>
              {mainOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-48 z-50" // overflow-hidden хассан
                >
              
                  <div className="relative">
                    <button
                      onClick={() => setCreateSubOpen(!createSubOpen)}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
                    >
                      <PlusCircle size={16} className="inline-block mr-2 text-gray-500" /> Тест хийх ▸
                    </button>
                    {createSubOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-0 left-full ml-1 bg-white border border-gray-200 rounded-md shadow-lg w-44 z-50 overflow-hidden"
                      >
                        <Link href="/moderator/tests/create" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200">Нэг нэгээр хийх</Link>
                      </motion.div>
                    )}
                  </div>

                  {/* Шинэ нэмэлт: Тест харах цэс */}
                  <div className="relative">
                    <button
                      onClick={() => setViewSubOpen(!viewSubOpen)}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
                    >
                      <Eye size={16} className="inline-block mr-2 text-gray-500" /> Тест харах ▸
                    </button>
                    {viewSubOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-0 left-full ml-1 bg-white border border-gray-200 rounded-md shadow-lg w-44 z-50 overflow-hidden"
                      >
                        <Link href="/moderator/tests/view" className="block px-4 py-2 text-gray-800 hover:bg-gray-100 transition-colors duration-200">Тест харах</Link>
                      </motion.div>
                    )}
                  </div>

                </motion.div>
              )}
            </div>
            
            )}
          </nav>
        )}
      </div>
    </motion.header>
  )
}

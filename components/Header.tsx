'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { UserCircle2, Home, BookOpen, Calculator, Users, PlusCircle, Eye, Settings, ClipboardList, Award, Leaf, Calendar } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

// Цэсний элементийн төрлийг тодорхойлно
interface MenuItem {
  id: string; // Цэсний элементийн давтагдашгүй ID
  label: string;
  href?: string;
  icon: React.ElementType | null; // Lucide React икон эсвэл null
  roles: string[]; // Тухайн цэсийг харах боломжтой үүргүүд
  type: 'link' | 'dropdown'; // Цэсний төрөл: холбоос эсвэл dropdown
  children?: MenuItem[]; // Дэд цэсүүд
}

// Бүх цэсний элементүүдийг тодорхойлсон массив
const NAV_ITEMS: MenuItem[] = [
  // Сурагчийн цэс
  {
    id: 'student-home',
    label: 'Нүүр хуудас',
    href: '/student',
    icon: Home,
    roles: ['student'],
    type: 'link',
  },
  {
    id: 'student-exams',
    label: 'Шалгалтууд',
    icon: BookOpen,
    roles: ['student'],
    type: 'dropdown',
    children: [
      {
        id: 'student-all-tests',
        label: 'Бүх тест',
        href: '/student/tests',
        icon: ClipboardList,
        roles: ['student'],
        type: 'link',
      },
      {
        id: 'student-all-exams-nested', // Дэд dropdown-д зориулсан ID
        label: 'Бүх шалгалт',
        icon: null,
        roles: ['student'],
        type: 'dropdown',
        children: [
          { id: 'student-eesh', label: 'ЭЕШ', href: '/student/exams/eesh', icon: Award, roles: ['student'], type: 'link' },
          { id: 'student-math', label: 'Математик', href: '/student/tests/math', icon: Calculator, roles: ['student'], type: 'link' },
          { id: 'student-biology', label: 'Биологи', href: '/student/tests/biology', icon: Leaf, roles: ['student'], type: 'link' },
        ],
      },
      {
        id: 'student-upcoming-exams',
        label: 'Ирэх шалгалт',
        href: '/student/tests/upcoming',
        icon: Calendar,
        roles: ['student'],
        type: 'link',
      },
    ],
  },

  // Багшийн цэс
  {
    id: 'teacher-home',
    label: 'Багшийн самбар',
    href: '/teacher',
    icon: Home,
    roles: ['teacher'],
    type: 'link',
  },
  {
    id: 'teacher-students',
    label: 'Сурагчид',
    href: '/teacher/students',
    icon: Users,
    roles: ['teacher'],
    type: 'link',
  },

  // Админы цэс
  {
    id: 'admin-home',
    label: 'Админ',
    href: '/admin',
    icon: Home,
    roles: ['admin'],
    type: 'link',
  },
  {
    id: 'admin-users',
    label: 'Хэрэглэгчид',
    href: '/admin/users',
    icon: Users,
    roles: ['admin'],
    type: 'link',
  },

  // Модераторын цэс
  {
    id: 'moderator-tests',
    label: 'Тестүүд',
    icon: BookOpen,
    roles: ['moderator'],
    type: 'dropdown',
    children: [
      {
        id: 'moderator-create-test',
        label: 'Тест хийх',
        icon: PlusCircle,
        roles: ['moderator'],
        type: 'dropdown',
        children: [
          { id: 'moderator-create-single', label: 'Нэг нэгээр хийх', href: '/moderator/tests/create', icon: null, roles: ['moderator'], type: 'link' },
        ],
      },
      {
        id: 'moderator-view-test',
        label: 'Тест харах',
        icon: Eye,
        roles: ['moderator'],
        type: 'dropdown',
        children: [
          { id: 'moderator-view-all', label: 'Тест харах', href: '/moderator/tests/view', icon: null, roles: ['moderator'], type: 'link' },
        ],
      },
    ],
  },
];


export default function Header() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Dropdown state-уудыг нэгтгэсэн, одоо нээлттэй байгаа dropdown-уудын ID-г дарааллаар нь хадгална
  const [openDropdownPath, setOpenDropdownPath] = useState<string[]>([]);
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  // mainDropdownRef-ийг бүх навигацийн элементийг агуулсан nav тагт заасан
  const mainDropdownRef = useRef<HTMLElement>(null) 

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node

    if (profileRef.current && !profileRef.current.contains(target)) {
      setProfileOpen(false)
    }

    // mainDropdownRef-ээс гадуур дарвал бүх dropdown-уудыг хаана
    if (mainDropdownRef.current && !mainDropdownRef.current.contains(target)) {
      setOpenDropdownPath([]); // Бүх dropdown-уудыг хаана
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [])

// pathname өөрчлөгдөхөд бүх dropdown-уудыг хаана
useEffect(() => {
  setOpenDropdownPath([])
  setProfileOpen(false)
}, [pathname])

  if (pathname === '/auth' || loading) return null

  const handleLogout = async () => {
    try {
      await signOut(auth)
      console.log('Firebase client-side logout successful.');
  
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
  
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        console.error('Server-side logout API error:', errorData);
        throw new Error(errorData.error || 'Серверээс гарах үйлдэл амжилтгүй боллоо.');
      }
      console.log('Server-side logout API successful.');
  
      router.replace('/');
    } catch (err: unknown) {
      const errorMessage = (err instanceof Error) ? err.message : 'Үл мэдэгдэх алдаа гарлаа.';
      console.error('Logout error:', errorMessage, err);
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

  // Цэсний элементүүдийг рендерлэх функц
  // parentPath нь тухайн элементийн эцэг элементүүдийн ID-г агуулна (жишээ нь: ['student-exams'])
  const renderMenuItems = (items: MenuItem[], currentRole: string | undefined, parentPath: string[] = []) => {
    return items.map((item) => {
      if (!currentRole || !item.roles.includes(currentRole)) {
        return null; // Хэрэглэгчийн үүрэгт тохирохгүй бол харуулахгүй
      }

      const IconComponent = item.icon;
      // Тухайн элементийн ID нь openDropdownPath дотор байгаа эсэхийг шалгана
      const isThisItemOpen = openDropdownPath[parentPath.length] === item.id;

      if (item.type === 'link') {
        return (
          <Link
            key={item.id}
            href={item.href || '#'}
            className={`block px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-[#00BFFF] transition-colors duration-200 ${parentPath.length > 0 ? 'flex items-center gap-2' : 'flex items-center gap-1'}`}
            onClick={() => setOpenDropdownPath([])} // Холбоос дээр дарахад бүх dropdown-уудыг хаана
          >
            {IconComponent && <IconComponent size={parentPath.length > 0 ? 16 : 18} className="text-gray-500" />}
            {item.label}
          </Link>
        );
      } else if (item.type === 'dropdown' && item.children) {
        const handleDropdownToggle = () => {
          setOpenDropdownPath(prevPath => {
            const currentItemIndexInPath = prevPath.indexOf(item.id);

            if (isThisItemOpen) {
              // Хэрэв энэ элемент одоогоор нээлттэй байвал, түүнийг болон түүнээс доошхи бүх дэд цэсүүдийг хаана.
              return prevPath.slice(0, currentItemIndexInPath);
            } else {
              // Хэрэв энэ элемент нээлттэй биш байвал:
              // Эцэг элементийн түвшин хүртэлх замыг хадгална.
              const commonPath = prevPath.slice(0, parentPath.length);
              // Энэ элементийг замд нэмнэ, ингэснээр ижил түвшний бусад дэд цэсүүд хаагдана.
              return [...commonPath, item.id];
            }
          });
        };

        return (
          <div key={item.id} className="relative">
            <button
              onClick={handleDropdownToggle}
              className={`w-full text-left px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-[#00BFFF] transition-colors duration-200 flex items-center justify-between ${parentPath.length > 0 ? '' : 'gap-1'}`}
            >
              {IconComponent && <IconComponent size={parentPath.length > 0 ? 16 : 18} className="inline-block mr-2 text-gray-500" />}
              {item.label} {isThisItemOpen ? (parentPath.length > 0 ? '▾' : '▴') : (parentPath.length > 0 ? '▸' : '▾')}
            </button>
            {isThisItemOpen && ( // Зөвхөн энэ элемент нээлттэй байвал түүний дэд цэсүүдийг рендерлэнэ
              <motion.div
                initial={{ opacity: 0, y: parentPath.length > 0 ? 0 : -10, x: parentPath.length > 0 ? -10 : 0 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: parentPath.length > 0 ? 0 : -10, x: parentPath.length > 0 ? -10 : 0 }}
                transition={{ duration: 0.2 }}
                className={`absolute ${parentPath.length > 0 ? 'top-0 left-full ml-1' : 'top-full left-0 mt-2'} bg-white border border-gray-200 rounded-md shadow-lg ${parentPath.length > 0 ? 'w-44 z-[70]' : 'w-48 z-[60]'} ${parentPath.length > 0 ? 'overflow-hidden' : ''}`}
              >
                {renderMenuItems(item.children, currentRole, [...parentPath, item.id])}
              </motion.div>
            )}
          </div>
        );
      }
      return null;
    });
  };


  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Top Bar - PhysX-ийн дээд хэсэг шиг */}
      <div className="bg-[#1A2D42] py-2 px-8 flex items-center justify-between">
        {/* Logo */}
        <button onClick={handleLogoClick} className="text-2xl font-bold text-white flex items-center">
          <span className="text-white">PhysX</span>
        </button>

        {/* RIGHT side - Profile */}
        <div className="flex items-center gap-3 relative" ref={profileRef}>
          {!user && (
            <Link href="/auth">
              <Button className="bg-[#00BFFF] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
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
                    className="block px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-[#00BFFF] transition-colors duration-200"
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

      {/* Navigation Bar */}
      <div className="bg-white py-1 border-t border-gray-200 max-w-screen-xl mx-auto px-8"> {/* Энд өөрчлөлт орсон: max-w-screen-xl mx-auto px-8 нэмсэн */}
        {user && (
          <nav className="flex items-center gap-8 text-sm font-medium text-gray-700" ref={mainDropdownRef}> {/* Эндээс px-8 хассан */}
            {renderMenuItems(NAV_ITEMS, user.role, [])}
          </nav>
        )}
      </div>
    </motion.header>
  )
}

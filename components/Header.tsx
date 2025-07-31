'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, UserCircle2, Home, BookOpen, Users, PlusCircle, Eye, Settings, ClipboardList, Award, Calendar, Puzzle, LayoutGrid, Target, Trophy, ListOrdered, ClipboardCheck } from 'lucide-react'
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
    id: 'student-groups', // Шинэ
    label: 'Бүлгүүд',
    href: '/student/groups',
    icon: LayoutGrid,
    roles: ['student'],
    type: 'link',
  },
  {
    id: 'student-problems', // Шинэ
    label: 'Бодлогууд',
    href: '/student/problems',
    icon: Target,
    roles: ['student'],
    type: 'link',
  },
  {
    id: 'student-tests-main', // Шинэ (Хуучин Шалгалтууд-аас ялгаж нэрлэв)
    label: 'Тестүүд',
    href: '/student/tests', // Үндсэн тестүүдийн хуудас
    icon: ClipboardCheck,
    roles: ['student'],
    type: 'link',
  },
  {
    id: 'student-exams-main', // Шалгалтууд (дэд цэсээр харуулах хуучин хувилбар)
    label: 'Шалгалтууд',
    icon: BookOpen,
    roles: ['student'],
    type: 'dropdown',
    children: [
            {
        id: 'student-all-exams-nested', // Дэд dropdown-д зориулсан ID
        label: 'Бүх шалгалт',
        icon: null,
        roles: ['student'],
        type: 'dropdown',
        children: [
          { id: 'student-eesh', label: 'ЭЕШ', href: '/student/exams/eesh', icon: Award, roles: ['student'], type: 'link' },
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
  {
    id: 'student-competitions', // Шинэ
    label: 'Тэмцээнүүд',
    href: '/student/competitions',
    icon: Trophy,
    roles: ['student'],
    type: 'link',
  },
  {
    id: 'student-other', // Шинэ
    label: 'Бусад',
    icon: MoreHorizontal,
    roles: ['student'],
    type: 'dropdown',
    children: [
      {
        id: 'student-puzzles', // Шинэ
        label: 'Тогмолууд',
        href: '/student/puzzles',
        icon: Puzzle,
        roles: ['student'],
        type: 'link',
      },
      {
        id: 'student-leaderboard', // Шинэ
        label: 'Чансаа',
        href: '/student/leaderboard',
        icon: ListOrdered,
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
  {
    id: 'admin-add',
    label: 'Нэмэх',
    href: '/admin/add',
    icon: ClipboardList,
    roles: ['admin'],
    type: 'dropdown',
    children: [
      {
        id: 'admin-add-chapter',
        label: 'Ерөнхий',
        icon: PlusCircle,
        roles: ['admin'],
        type: 'dropdown',
        children: [
          { id: 'admin-chapter-name', label: 'Сэдвийн мэдээлэл', href: '/admin/add/chapteradd', icon: null, roles: ['admin'], type: 'link' },
        ],
      },
    ],
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
        {
          id: 'moderator-create-single',
          label: 'Нэг нэгээр хийх',
          href: '/moderator/tests/create',
          icon: null,
          roles: ['moderator'],
          type: 'link',
        },
      ],
    },
    {
      id: 'moderator-view-test',
      label: 'Тест харах',
      icon: Eye,
      roles: ['moderator'],
      type: 'dropdown',
      children: [
        {
          id: 'moderator-view-all',
          label: 'Тест харах',
          href: '/moderator/tests/view',
          icon: null,
          roles: ['moderator'],
          type: 'link',
        },
      ],
    },
    {
      id: 'moderator-subjects',
      label: 'Хичээлүүд',
      icon: BookOpen, // Та өөр icon хүсвэл солино уу
      roles: ['moderator'],
      type: 'dropdown',
      children: [
        {
          id: 'moderator-add-subject',
          label: 'Хичээл нэмэх',
          href: '/moderator/lessons/add',
          icon: null,
          roles: ['moderator'],
          type: 'link',
        },
        {
          id: 'moderator-view-subjects',
          label: 'Хичээл харах',
          href: '/moderator/lessons/view',
          icon: null,
          roles: ['moderator'],
          type: 'link',
        },
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
       
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
  
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
     
        throw new Error(errorData.error || 'Серверээс гарах үйлдэл амжилтгүй боллоо.');
      }
      
  
      router.replace('/');
    } catch (err: unknown) {
      const errorMessage = (err instanceof Error) ? err.message : 'Үл мэдэгдэх алдаа гарлаа.';
   
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
   // Цэсний элементүүдийг рендерлэх функц
   const renderMenuItems = (items: MenuItem[], currentRole: string | undefined, parentPath: string[] = []) => {
    return items.map((item) => {
      // Хэрэглэгчийн үүрэгт тохирохгүй бол харуулахгүй
      if (!currentRole || !item.roles.includes(currentRole)) {
        return null;
      }

      const IconComponent = item.icon;
      // Одоогийн цэс нээлттэй эсэхийг шалгана
      const isOpen = openDropdownPath.includes(item.id);
      // Тухайн цэс дээр дарахад нээгдэх зам
      const newPath = [...parentPath, item.id];

      // Dropdown-г нээх/хаах функц
      const handleItemClick = (e: React.MouseEvent) => {
        if (item.type === 'dropdown') {
          e.preventDefault(); // Холбоосоор явахаас сэргийлнэ
          if (isOpen) {
            // Хэрэв одоо нээлттэй байгаа бол хаана (өмнөх түвшин хүртэл хаана)
            // Жишээ нь, ['a', 'b', 'c'] -> 'c' дээр дарахад -> ['a', 'b'] болно.
            const currentItemIndexInPath = openDropdownPath.indexOf(item.id);
            if (currentItemIndexInPath !== -1) {
              setOpenDropdownPath(openDropdownPath.slice(0, currentItemIndexInPath));
            } else {
              // Хэрэв ямар нэг шалтгаанаар замд байхгүй ч нээлттэй байвал хаана.
              setOpenDropdownPath(parentPath);
            }
          } else {
            // Нээхдээ зөвхөн тухайн замыг нэмнэ (бусад зэрэгцээ dropdown-г хаана)
            setOpenDropdownPath(newPath);
          }
        } else if (item.href) {
          // Холбоос дээр дарахад бүх dropdown-г хаана
          setOpenDropdownPath([]);
        }
      };

      if (item.type === 'link') {
        return (
          <Link
            key={item.id}
            href={item.href || '#'}
            onClick={handleItemClick} // Link дээр дарахад хаах логик
            className="flex items-center gap-2 hover:text-[#00BFFF] transition-colors duration-200 py-2 px-3 rounded-md hover:bg-white/10 text-sm" // Gap-г 2 болгож, text-sm болгосон
          >
            {IconComponent && <IconComponent size={24} className="text-gray-500" />} {/* Icon-ы хэмжээг 24 болгосон */}
            {item.label}
          </Link>
        );
      } else if (item.type === 'dropdown' && item.children) {
        // Дэд цэсний байрлалыг тохируулна
        const isSubMenu = parentPath.length > 0;
        return (
          <div key={item.id} className="relative">
            <button
              onClick={handleItemClick} // Dropdown товч дээр дарахад хаах/нээх логик
              className={`flex items-center gap-2 hover:text-[#00BFFF] transition-colors duration-200 py-2 px-3 rounded-md hover:bg-white/10 focus:outline-none text-sm ${isOpen ? 'text-[#00BFFF] bg-white/10' : ''}`} // Gap-г 2 болгож, text-sm болгосон
            >
              {IconComponent && <IconComponent size={24} className="text-gray-500" />} {/* Icon-ы хэмжээг 24 болгосон */}
              {item.label} {isSubMenu ? '▸' : '▾'}
            </button>
            {isOpen && ( // Зөвхөн энэ элемент нээлттэй байвал түүний дэд цэсүүдийг рендерлэнэ
              <motion.div
                initial={{ opacity: 0, y: isSubMenu ? 0 : -10, x: isSubMenu ? -10 : 0 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: isSubMenu ? 0 : -10, x: isSubMenu ? -10 : 0 }}
                transition={{ duration: 0.2 }}
                className={`absolute ${isSubMenu ? 'top-0 left-full ml-1' : 'top-full left-0 mt-2'} bg-white border border-gray-200 rounded-md shadow-lg ${isSubMenu ? 'w-44 z-[70]' : 'w-48 z-[60]'} p-1`}
              >
                {renderMenuItems(item.children, currentRole, newPath)}
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

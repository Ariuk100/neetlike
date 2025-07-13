// app/admin/layout.tsx
'use client'

// 🔴 Устгах: useAuthRedirect-ийн импорт
// import { useAuthRedirect } from '@/lib/hooks/useAuthRedirect'

// Компонентын нэрийг AdminLayout болгож өөрчилсөн.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 🔴 Устгах: useAuthRedirect-ийн дуудлага
  // useAuthRedirect()
  return <>{children}</>
}

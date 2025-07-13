// app/student/layout.tsx
'use client'

// 🔴 Устгах: useAuthRedirect-ийн импорт
// import { useAuthRedirect } from '@/lib/hooks/useAuthRedirect'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  // 🔴 Устгах: useAuthRedirect-ийн дуудлага
  // useAuthRedirect()
  return <>{children}</>
}

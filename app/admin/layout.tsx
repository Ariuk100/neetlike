// app/student/layout.tsx
'use client'

// 🔴 Устгах: useAuthRedirect-ийн импорт
// import { useAuthRedirect } from '@/lib/hooks/useAuthRedirect'

// Файлын нэр нь student-тэй холбоотой тул StudentLayout гэж нэрлэсэн.
// Хэрэв таны жинхэнэ файлын нэр AdminLayout хэвээрээ байвал, түүнийг StudentLayout болгож өөрчлөх нь зүйтэй.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  // 🔴 Устгах: useAuthRedirect-ийн дуудлага
  // useAuthRedirect()
  return <>{children}</>
}

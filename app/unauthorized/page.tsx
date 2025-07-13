// app/unauthorized/page.tsx
import Link from 'next/link'; // Link компонентыг импортлосон

export default function UnauthorizedPage() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-center px-4">
        <div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Зөвшөөрөлгүй хандалт</h1>
          <p className="text-gray-600 mb-6">
            Та энэ хуудсанд нэвтрэх эрхгүй байна. Буцаж нэвтэрнэ үү эсвэл өөр хуудас руу очно уу.
          </p>
          {/* 'a' тагийг 'Link' компонентээр сольсон */}
          <Link href="/" className="text-blue-500 underline">
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    )
  }

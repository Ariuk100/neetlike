'use client';

import Link from 'next/link';

// Энэ бол таны вэбийн нүүр хуудас. 
// Middleware-ийн ачаар нэвтэрсэн хэрэглэгчид энэ хуудсыг харахгүйгээр
// шууд өөрсдийн dashboard руу үсрэх болно.
// Зөвхөн нэвтрээгүй хэрэглэгчид л энэ хуудсыг харна.

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center  p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          PhysX-т тавтай морил!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
          Физикийн хичээлийг илүү сонирхолтой, ойлгомжтой болгох таны дижитал туслах. Даалгавраа хийж, мэдлэгээ шалгаарай.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Нэвтрэх
          </Link>
          <Link href="/register" className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
            Бүртгүүлэх
          </Link>
        </div>
      </div>
    </main>
  );
}

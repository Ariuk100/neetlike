'use client';

/*
======================================================
💬 Хуучин нүүр хуудас (PhysX-т тавтай морил!)
------------------------------------------------------
import Link from 'next/link';

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
======================================================
*/

export default function Home() {
  // шууд засварын горим идэвхтэй гэж үзнэ
  const isMaintenance = true;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-0 dark:bg-gray-0">
      {/* --- MAINTENANCE MODE BANNER --- */}
      {isMaintenance && (
        <div className="w-full bg-yellow-100 text-yellow-800 text-sm text-center py-2 rounded-md shadow-sm mb-6">
          ⚠️ Систем засвартай байна. Зарим боломж түр ажиллахгүй байж магадгүй.
        </div>
      )}

      <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 max-w-lg">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
          🛠️ Систем түр засвартай байна
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Бид одоогоор сайжруулалт хийж байна. Түр азнаад дахин оролдоно уу.
        </p>
      </div>
    </main>
  );
}
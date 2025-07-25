'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { useCache } from '@/lib/useCache';
import { useCacheContext } from '@/lib/CacheContext';

interface Subchapter {
  id: string;
  name: string;
  description?: string;
  lessonCount: number;
  assignmentCount: number;
  videoCount: number;
  problemCount: number;
  quizCount: number;
  order: number;
}

export default function SubchaptersPage() {
  const { id } = useParams();
  const [chapterName, setChapterName] = useState('');
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loading, setLoading] = useState(true);

  const cache = useCache('subchapter-page-');
  const context = useCacheContext();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || typeof id !== 'string') return;

      const cacheKey = `chapter-${id}`;

      // 1. Context cache
      const contextHit = context.get<{ name: string; subs: Subchapter[] }>(cacheKey);
      if (contextHit) {
        setChapterName(contextHit.name);
        setSubchapters(contextHit.subs);
        setLoading(false);
        return;
      }

      // 2. Session cache
      const sessionHit = cache.get<{ name: string; subs: Subchapter[] }>(cacheKey);
      if (sessionHit) {
        context.set(cacheKey, sessionHit);
        setChapterName(sessionHit.name);
        setSubchapters(sessionHit.subs);
        setLoading(false);
        return;
      }

      // 3. Firestore fetch
      const chapterSnap = await getDoc(doc(db, 'chapters', id));
      const name = chapterSnap.exists() ? (chapterSnap.data().name as string) : 'Тодорхойгүй бүлэг';

      const subQ = query(
        collection(db, 'subchapters'),
        where('chapterId', '==', id),
        orderBy('order') // ✅ order-оор эрэмбэлэх
      );
      const subSnap = await getDocs(subQ);

      const subs: Subchapter[] = subSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          description: data.description || '',
          lessonCount: data.lessonCount || 0,
          assignmentCount: data.assignmentCount || 0,
          videoCount: data.videoCount || 0,
          problemCount: data.problemCount || 0,
          quizCount: data.quizCount || 0,
          order: data.order || 0, // ✅ order талбар
        };
      });

      const final = { name, subs };

      context.set(cacheKey, final);
      cache.set(cacheKey, final, { storage: 'session', expiryMs: 5 * 60 * 1000 });

      setChapterName(name);
      setSubchapters(subs);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [id]);

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-[#F9FAFB]">
      <div className="mb-4 text-sm text-gray-600">
        <Link href="/student/groups" className="text-blue-600 hover:underline">
          ← Бүлгүүд рүү буцах
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[#111827]">
        <LayoutGrid size={28} className="text-[#2563EB]" />
        {chapterName} — Дэд бүлгүүд
      </h1>

      {loading ? (
        <p className="text-gray-500">Уншиж байна...</p>
      ) : subchapters.length === 0 ? (
        <p className="text-gray-500">Дэд бүлэг олдсонгүй.</p>
      ) : (
        <ul className="space-y-4">
          {subchapters.map((s) => (
            <li
              key={s.id}
              className="group border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-white transition duration-200"
            >
              <Link href={`/student/subchapter/${s.id}`} className="block">
                <h2 className="text-lg font-semibold mb-1 text-gray-800 group-hover:text-blue-600 transition">
                  {s.order}. {s.name}
                </h2>
                <p className="text-sm text-gray-600 mb-2 group-hover:text-gray-700 transition">
                  {s.description}
                </p>
                <p className="text-sm text-gray-500 group-hover:text-gray-600 transition">
                  Хичээл: {s.lessonCount} | Видео: {s.videoCount} | Бодлого: {s.problemCount} | Тест: {s.quizCount} | Шалгалт: {s.assignmentCount}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
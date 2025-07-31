// app/student/subchapter/[subchapterId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'; 

import Link from 'next/link';
import { LayoutGrid, BookOpen, PlayCircle, ClipboardList, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SubchapterDetail {
  name: string;
  description: string;
  chapterId: string;
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz';
  subChapterId: string;
}

export default function SubchapterDetailPage() {
  const { subchapterId } = useParams();
  const [detail, setDetail] = useState<SubchapterDetail | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLoadingLessonsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!subchapterId || typeof subchapterId !== "string") {
        setLoading(false);
        setLoadingLessonsLoading(false);
        return;
      }

      // subchapters collection-оос мэдээлэл татаж байна
      const snap = await getDoc(doc(db, "subchapters", subchapterId));
      
      if (snap.exists()) {
        const d = snap.data();
        setDetail({
          name: d.name,
          description: d.description || "",
          chapterId: d.chapterId || "",
        });

        // "lessons" collection-оос хичээлүүдийг татаж эхлэх асуулга
        const lessonsQuery = query(
          collection(db, "lessons"),
          where("subChapterId", "==", subchapterId),
          orderBy("title", "asc") 
        );
        const lessonsSnap = await getDocs(lessonsQuery);
        
        const fetchedLessons: Lesson[] = lessonsSnap.docs.map((lessonDoc) => {
          const l = lessonDoc.data();
          return {
            id: lessonDoc.id,
            title: l.title || "Гарчиггүй хичээл",
            type: l.type || "text",
            subChapterId: l.subChapterId,
          };
        });
        
        setLessons(fetchedLessons);
        setLoadingLessonsLoading(false);
      } else {
        setDetail(null);
        setLessons([]);
        setLoadingLessonsLoading(false);
      }
      setLoading(false);
    };

    fetchData();
  }, [subchapterId]);

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <PlayCircle size={20} className="text-purple-500" />;
      case "quiz":
        return <ClipboardList size={20} className="text-orange-500" />;
      case "text":
      default:
        return <FileText size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto min-h-screen bg-[#F9FAFB]">
      <div className="mb-4 text-sm text-gray-600 flex items-center">
        {detail && detail.chapterId ? (
          <Link
            href={`/student/groups/${detail.chapterId}`}
            className="text-blue-600 hover:underline"
          >
            ← Бүлэг рүү буцах
          </Link>
        ) : (
          <Link href="/student/groups" className="text-blue-600 hover:underline">
            ← Бүлгүүд рүү буцах
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : !detail ? (
        <p className="text-center text-gray-700 text-lg py-10">
          Дэд бүлгийн мэдээлэл олдсонгүй.
        </p>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-[#111827]">
            <LayoutGrid size={28} className="text-[#2563EB]" />
            {detail.name}
          </h1>

          <p className="text-gray-600 mb-4 text-sm">{detail.description}</p>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-[#2563EB]" /> Хичээлүүд
            </h2>
            {lessonsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-3/4" />
              </div>
            ) : lessons.length === 0 ? (
              <p className="text-gray-600 text-sm">
                Энэ дэд бүлэгт хичээл нэмэгдээгүй байна.
              </p>
            ) : (
              <ul className="space-y-3">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/student/subchapter/${subchapterId}/lesson/${lesson.id}`}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        {getLessonIcon(lesson.type)}
                        <span className="font-medium text-gray-800">
                          {lesson.title}
                        </span>
                      </div>
                      <span className="text-blue-600 text-sm">Үзэх →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
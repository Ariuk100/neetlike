// app/student/problems/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Chapter {
  id: string;
  name: string;
  problemCount: number;
}

export default function StudentProblemsPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const chaptersColRef = collection(db, 'chapters');
        const q = query(chaptersColRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedChapters: Chapter[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedChapters.push({
            id: doc.id,
            name: data.name || 'Нэргүй сэдэв',
            problemCount: data.problemCount || 0,
          });
        });

        setChapters(fetchedChapters);
      } catch (error) {
        console.error('Сэдвүүдийг татахад алдаа гарлаа:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Сэдвүүдийн жагсаалт</h1>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chapters.map((chapter) => (
            <Link key={chapter.id} href={`/student/problems/${chapter.id}`} className="block">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{chapter.name}</CardTitle>
                  <CardDescription>Нийт {chapter.problemCount} бодлого</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Энэ сэдвийн бодлогуудыг харах бол дарна уу.
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
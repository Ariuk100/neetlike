'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  limit,
  orderBy,
  query,
  startAfter,
  QueryDocumentSnapshot,
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BookOpen,
  Users,
  PlayCircle,
  Home,
  LayoutGrid,
  ClipboardList,
  CheckSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCache } from '@/lib/useCache';
import { useCacheContext } from '@/lib/CacheContext';

const PAGE_SIZE = 10;

interface Group {
  id: string;
  name: string;
  description: string;
  subchapterCount: number;
  problemCount: number;
  videoCount: number;
  quizCount: number;
  assignmentCount: number;
  order: number;
}

export default function StudentGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const snapshotsCache = useRef<QueryDocumentSnapshot[]>([]);

  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);

  const cache = useCache('groups-page-');
  const context = useCacheContext();

  useEffect(() => {
    getTotalPages();
  }, []);

  useEffect(() => {
    const fetchAndCache = async () => {
      setLoading(true);
      const cacheKey = `page-${currentPage}`;

      const contextHit = context.get<Group[]>(cacheKey);
      if (contextHit) {
        setGroups(contextHit);
        setLoading(false);
        return;
      }

      const sessionHit = cache.get<Group[]>(cacheKey);
      if (sessionHit) {
        context.set(cacheKey, sessionHit);
        setGroups(sessionHit);
        setLoading(false);
        return;
      }

      const q = await buildQuery(currentPage);
      const snapshot = await getDocs(q);

      const data: Group[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          description: d.description || '',
          subchapterCount: d.subchapterCount || 0,
          problemCount: d.problemCount || 0,
          videoCount: d.videoCount || 0,
          quizCount: d.quizCount || 0,
          assignmentCount: d.assignmentCount || 0,
          order: d.order || 0,
        };
      });

      if (snapshot.docs.length > 0) {
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        snapshotsCache.current[currentPage - 1] = lastVisible;
      }

      context.set(cacheKey, data);
      cache.set(cacheKey, data, { storage: 'session', expiryMs: 5 * 60 * 1000 });

      setGroups(data);
      setLoading(false);
    };

    fetchAndCache();
  }, [currentPage, cache, context]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const getTotalPages = async () => {
    const statsSnap = await getDoc(doc(db, 'stats', 'global'));
    const total = statsSnap.exists() ? statsSnap.data().chapterCount || 0 : 0;
    setPageCount(Math.ceil(total / PAGE_SIZE));
  };

  const buildQuery = async (page: number): Promise<Query> => {
    const baseQuery = query(collection(db, 'chapters'), orderBy('order'), limit(PAGE_SIZE));
    if (page === 1) {
      return baseQuery;
    }

    const cachedSnap = snapshotsCache.current[page - 2];
    if (cachedSnap) {
      return query(collection(db, 'chapters'), orderBy('order'), startAfter(cachedSnap), limit(PAGE_SIZE));
    }

    return baseQuery;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 pt-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-sm text-[#6B7280] mb-6 flex items-center">
          <Link href="/" className="flex items-center hover:text-[#2563EB] transition-colors duration-200">
            <Home size={16} className="mr-1" /> Нүүр хуудас
          </Link>
          <span className="mx-2">/</span>
          <span className="font-semibold text-[#111827]">Бүлгүүд</span>
        </div>

        <h1 className="text-3xl font-bold text-[#111827] mb-8 text-center flex items-center justify-center gap-3">
          <LayoutGrid size={32} className="text-[#2563EB]" />
          Бүлгүүд
        </h1>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {groups.map((group, index) => (
                <motion.div
                  key={group.id}
                  ref={el => { groupRefs.current[index] = el }}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="flex flex-col md:flex-row items-center p-6 space-y-4 md:space-y-0 md:space-x-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex-shrink-0 text-[#2563EB]">
                      <BookOpen size={48} />
                    </div>
                    <div className="flex-grow text-center md:text-left">
                      <CardTitle className="text-xl font-semibold text-[#111827] mb-2">
                        {group.order}. {group.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-[#6B7280] mb-4">
                        {group.description}
                      </CardDescription>
                      <CardContent className="p-0 flex flex-wrap justify-center md:justify-between gap-x-6 gap-y-2 text-sm text-[#6B7280]">
                        <span className="flex items-center gap-1"><BookOpen size={16} className="text-[#2563EB]" /> {group.subchapterCount} дэд бүлэг</span>
                        <span className="flex items-center gap-1"><Users size={16} className="text-[#10B981]" /> {group.problemCount} бодлого</span>
                        <span className="flex items-center gap-1"><PlayCircle size={16} className="text-[#A855F7]" /> {group.videoCount} видео</span>
                        <span className="flex items-center gap-1"><ClipboardList size={16} className="text-[#A855F7]" /> {group.quizCount} тест</span>
                        <span className="flex items-center gap-1"><CheckSquare size={16} className="text-[#10B981]" /> {group.assignmentCount} шалгалт</span>
                      </CardContent>
                    </div>
                    <Link href={`/student/groups/${group.id}`}>
                      <Button className="mt-2 md:mt-0 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2 rounded-full shadow-md">
                        Дэлгэрэнгүй
                      </Button>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        <div className="mt-10 flex justify-center items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>Эхлэл</Button>
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Өмнөх</Button>
          <span className="px-2 text-sm text-[#6B7280]">Хуудас {currentPage} / {pageCount}</span>
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>Дараах</Button>
          <Button variant="outline" onClick={() => setCurrentPage(pageCount)} disabled={currentPage === pageCount}>Сүүлч</Button>
        </div>
      </div>
    </div>
  );
}

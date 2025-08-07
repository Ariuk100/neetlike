'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  getDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { useCacheContext } from '@/lib/CacheContext';

interface ProblemData {
  id: string;
  title: string;
  problemText: string;
  problemImage?: string | null;
  score?: number;
  answerHint?: string | null;
  solutionText?: string | null;
  solutionImage?: string | null;
}

const NEXT_PUBLIC_R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;

const getR2PublicImageUrl = (imageKey?: string | null): string | null => {
  if (!imageKey || !NEXT_PUBLIC_R2_ACCOUNT_ID) return null;
  const cleanedImageKey = imageKey.trim();
  const encodedImageKey = encodeURIComponent(cleanedImageKey);
  return `https://pub-${NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.dev/${encodedImageKey}`;
};

export default function ChapterProblemsPage() {
  const pathname = usePathname();
  const chapterId = pathname.split('/').pop();
  const cache = useCacheContext();
  const itemsPerPage = 10;

  const [problems, setProblems] = useState<ProblemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterName, setChapterName] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [openHintId, setOpenHintId] = useState<string | null>(null);
  const [openSolutionId, setOpenSolutionId] = useState<string | null>(null);

  const fetchProblems = useCallback(async () => {
    if (!chapterId || !db) return;
    setLoading(true);
    setProblems([]);

    const cacheKey = `problems_page_${chapterId}_${currentPage}`;
    const cachedProblems = cache.get<ProblemData[]>(cacheKey);
    const cachedIsLastPage = cache.get<boolean>(`is_last_page_${chapterId}_${currentPage}`);

    if (cachedProblems) {
      setProblems(cachedProblems);
      setIsLastPage(cachedIsLastPage || false);
      setLoading(false);
      return;
    }

    try {
      let currentChapterName = chapterName;
      if (!currentChapterName) {
        const chapterDocRef = doc(db, 'chapters', chapterId);
        const chapterDocSnap = await getDoc(chapterDocRef);
        if (chapterDocSnap.exists()) {
          currentChapterName = chapterDocSnap.data().name;
          setChapterName(currentChapterName);
        } else {
          toast.error("Сэдвийн мэдээлэл олдсонгүй.");
          setLoading(false);
          return;
        }
      }

      const baseQuery = query(
        collection(db, 'problems'),
        where('topic', '==', currentChapterName),
        orderBy('createdAt', 'desc')
      );

      let paginatedQuery = query(baseQuery, limit(itemsPerPage));
      if (currentPage > 1) {
        const startDoc = cache.get<DocumentSnapshot>(`last_visible_${chapterId}_${currentPage - 1}`);
        if (startDoc) {
          paginatedQuery = query(baseQuery, startAfter(startDoc), limit(itemsPerPage));
        }
      }

      const snapshot = await getDocs(paginatedQuery);
      const fetchedProblems: ProblemData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedProblems.push({
          id: doc.id,
          title: data.title || 'Нэргүй бодлого',
          problemText: data.problemText || 'Бодлогын текст байхгүй',
          problemImage: data.problemImage || null,
          score: data.score || 0,
          answerHint: data.answerHint || null,
          solutionText: data.solutionText || null,
          solutionImage: data.solutionImage || null,
        });
      });

      setProblems(fetchedProblems);
      cache.set(cacheKey, fetchedProblems);

      if (snapshot.docs.length > 0) {
        const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
        cache.set(`last_visible_${chapterId}_${currentPage}`, newLastVisible);

        const nextQuery = query(baseQuery, startAfter(newLastVisible), limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        const isLast = nextSnapshot.empty;
        setIsLastPage(isLast);
        cache.set(`is_last_page_${chapterId}_${currentPage}`, isLast);
      } else {
        setIsLastPage(true);
        cache.set(`is_last_page_${chapterId}_${currentPage}`, true);
      }
    } catch (error) {
      console.error('Бодлогуудыг татахад алдаа гарлаа:', error);
      toast.error("Бодлогуудыг татахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }, [chapterId, currentPage, chapterName, cache]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    setOpenHintId(null);
    setOpenSolutionId(null);
    if (direction === 'next' && !isLastPage) {
      setCurrentPage(prev => prev + 1);
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleToggleHint = (problemId: string) => {
    setOpenHintId(prevId => prevId === problemId ? null : problemId);
    setOpenSolutionId(null);
  };

  const handleToggleSolution = (problemId: string) => {
    setOpenSolutionId(prevId => prevId === problemId ? null : problemId);
    setOpenHintId(null);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">{chapterName || <Skeleton className="w-64 h-8 mx-auto" />}</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4">
              {problems.length === 0 ? (
                <p className="text-center text-gray-500">Энэ сэдэвт бодлого одоогоор байхгүй байна.</p>
              ) : (
                problems.map((problem, index) => {
                  const problemImageUrl = getR2PublicImageUrl(problem.problemImage);
                  const solutionImageUrl = getR2PublicImageUrl(problem.solutionImage);

                  return (
                    <Card key={problem.id} className="p-4">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Бодлого #{index + 1 + (currentPage - 1) * itemsPerPage} - {problem.title}</CardTitle>
                          {problem.score !== undefined && problem.score !== 0 && (
                            <CardDescription className="text-lg font-bold text-green-600">
                              {problem.score} оноо
                            </CardDescription>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <LatexRenderer text={problem.problemText} />

                        {problemImageUrl && (
                          <div className="relative h-64 w-full my-4">
                            <Image
                              src={problemImageUrl}
                              alt={`Бодлогын зураг: ${problem.title}`}
                              fill
                              style={{ objectFit: 'contain' }}
                            />
                          </div>
                        )}

                        {problem.answerHint && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              onClick={() => handleToggleHint(problem.id)}
                              className="w-full justify-start text-left"
                            >
                              {openHintId === problem.id ? 'Зааврыг хаах' : 'Заавар харах'}
                            </Button>
                            {openHintId === problem.id && (
                              <div className="mt-2 p-4 border rounded-md bg-yellow-50 text-yellow-800">
                                <h4 className="font-semibold mb-2">Заавар:</h4>
                                <LatexRenderer text={problem.answerHint} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* ✅ Бодолт хэсэг */}
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            onClick={() => handleToggleSolution(problem.id)}
                            className="w-full justify-start text-left"
                          >
                            {openSolutionId === problem.id ? 'Бодолтыг хаах' : 'Бодолт харах'}
                          </Button>
                          {openSolutionId === problem.id && (
                            <div className="mt-2 p-4 border rounded-md bg-gray-50 text-gray-700">
                              <h4 className="font-semibold mb-2">Бодолт:</h4>

                              {problem.solutionText ? (
                                <LatexRenderer text={problem.solutionText} />
                              ) : (
                                <p className="italic text-sm text-gray-500">Бодолтын текст байхгүй байна.</p>
                              )}

                              {solutionImageUrl && (
                                <div className="w-64 my-4">
                                  <Image
                                    src={solutionImageUrl}
                                    alt={`Бодолтын зураг: ${problem.title}`}
                                    width={800}
                                    height={600}
                                    style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1 || loading}
            >
              <ArrowLeft className="h-4 w-4" /> Өмнөх
            </Button>
            <span className="text-sm">Хуудас {currentPage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange('next')}
              disabled={isLastPage || loading}
            >
              Дараах <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
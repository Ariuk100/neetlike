'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, limit, startAfter, getDocs, where, deleteDoc, doc, getCountFromServer, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';

// UI components for table
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

// Shadcn UI for AlertDialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


import { useCacheContext } from '@/lib/CacheContext';

// Interfaces (Make sure these are consistent with your Firebase data)
interface Lesson {
  id: string;
  title: string;
  description: string | null;
  level: string;
  duration: number;
  subjectId: string;
  chapterId: string;
  subChapterId: string | null;
  moderatorUid: string;
  moderatorName: string;
  createdAt: Timestamp; // Firebase Timestamp type
}

interface Chapter {
  id: string;
  name: string;
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string;
}

// === Кэшний түлхүүрүүд ===
const CHAPTERS_CACHE_KEY = 'cachedChapters';
const SUBCHAPTERS_CACHE_KEY_PREFIX = 'cachedSubchapters_';

const ITEMS_PER_PAGE = 10;

export default function ViewLessonsPage() {
  // === 1. ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL OF THE COMPONENT, UNCONDITIONALLY ===
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { get, set } = useCacheContext();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // Filter main states (retain for now but we will ignore them in query)
  // Устгасан: setSearchTerm, setSelectedLevel, setSelectedChapter, setSelectedSubchapter
  const [searchTerm] = useState(''); // setSearchTerm-ийг устгасан
  const [selectedLevel] = useState<string>(''); // setSelectedLevel-ийг устгасан
  const [selectedChapter] = useState<string>(''); // setSelectedChapter-ийг устгасан
  const [selectedSubchapter] = useState<string>(''); // setSelectedSubchapter-ийг устгасан
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);

  // State for Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lessonToDeleteId, setLessonToDeleteId] = useState<string | null>(null);

  // Authorization Check Effect
  useEffect(() => {
    const allowedRoles = ['moderator', 'admin'];
    if (!authLoading && (!user || !(user.role && allowedRoles.includes(user.role)))) {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Fetch Chapters Effect (retain for now, as it might be used elsewhere or later)
  useEffect(() => {
    const fetchAndCacheChapters = async () => {
      const cachedChapters = get<Chapter[]>(CHAPTERS_CACHE_KEY);
      if (cachedChapters && cachedChapters.length > 0) {
        setChapters(cachedChapters);
        // setLoadingChapters(false); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
      } else {
        try {
          const q = query(collection(db, 'chapters'), orderBy('name', 'asc'));
          const querySnapshot = await getDocs(q);
          const fetchedChapters: Chapter[] = [];
          querySnapshot.forEach((doc) => {
            fetchedChapters.push({ id: doc.id, name: doc.data().name });
          });
          setChapters(fetchedChapters);
          set(CHAPTERS_CACHE_KEY, fetchedChapters, { expiryMs: 86400000 }); // 24 hours
        } catch (error) {
          console.error("Бүлгүүдийг татахад алдаа гарлаа:", error);
          toast.error("Бүлгүүдийг татахад алдаа гарлаа.");
          setError("Бүлгүүдийг татахад алдаа гарлаа.");
        } finally {
          // setLoadingChapters(false); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
        }
      }
    };
    fetchAndCacheChapters();
  }, [get, set]);

  // Fetch Subchapters Effect based on selected chapter (retain for now)
  useEffect(() => {
    const fetchAndCacheSubchapters = async () => {
      if (!selectedChapter) {
        setSubchapters([]);
        // setSelectedSubchapter(''); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
        // setLoadingSubchapters(false); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
        return;
      }

      // setLoadingSubchapters(true); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
      const cacheKey = `${SUBCHAPTERS_CACHE_KEY_PREFIX}${selectedChapter}`;
      const cachedSubchapters = get<Subchapter[]>(cacheKey);

      if (cachedSubchapters && cachedSubchapters.length > 0) {
        setSubchapters(cachedSubchapters);
        // setLoadingSubchapters(false); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
      } else {
        try {
          const q = query(collection(db, 'subchapters'), where('chapterId', '==', selectedChapter), orderBy('order', 'asc'));
          const querySnapshot = await getDocs(q);
          const fetchedSubchapters: Subchapter[] = [];
          querySnapshot.forEach((doc) => {
            fetchedSubchapters.push({ id: doc.id, name: doc.data().name, chapterId: doc.data().chapterId });
          });
          setSubchapters(fetchedSubchapters);
          set(cacheKey, fetchedSubchapters, { expiryMs: 86400000 });
        } catch (error) {
          console.error("Дэд бүлгүүдийг татахад алдаа гарлаа:", error);
          toast.error("Дэд бүлгүүдийг татахад алдаа гарлаа.");
          setError("Дэд бүлгүүдийг татахад алдаа гарлаа.");
        } finally {
          // setLoadingSubchapters(false); // Холбогдох setter устгагдсан тул энэ мөрийг комментлов
        }
      }
    };
    fetchAndCacheSubchapters();
  }, [selectedChapter, get, set]);


  // === LESSONS FETCHING LOGIC - SIMPLIFIED QUERY ===
  const fetchLessonsIndependent = useCallback(async (
    direction: 'next' | 'prev' | 'initial' = 'initial',
    currentLastVisible: QueryDocumentSnapshot<DocumentData> | null = null,
    resetPagination: boolean = false
  ) => {
    if (!user) return;

    setLoadingLessons(true);
    setError(null);

    const qRef = collection(db, 'lessons');

    // === ONLY orderBy('createdAt', 'desc') FOR NOW ===
    // This is the simplified query for testing purposes.
    let finalQuery = query(qRef, orderBy('createdAt', 'desc'), limit(ITEMS_PER_PAGE));

    let newCurrentPage = currentPage;

    if (direction === 'next' && currentLastVisible && !resetPagination) {
      finalQuery = query(qRef, orderBy('createdAt', 'desc'), startAfter(currentLastVisible), limit(ITEMS_PER_PAGE));
      newCurrentPage = currentPage + 1;
    } else if (direction === 'prev' && !resetPagination) {
      toast.info("Өмнөх хуудасруу шилжих функц одоогоор хязгаарлагдмал байна.", {description: "Их хэмжээний өгөгдөл дээр өмнөх хуудасруу шилжих нь Firestore-д нэлээд төвөгтэй байдаг. Одоогоор зөвхөн дараагийн хуудасруу шилжих боломжтой."});
      setLoadingLessons(false);
      return;
    } else if (resetPagination) {
        newCurrentPage = 0;
    }

    try {
      const documentSnapshots = await getDocs(finalQuery);
      const fetchedLessons: Lesson[] = [];
      documentSnapshots.forEach((doc) => {
        // Ensure createdAt is a Timestamp
        const data = doc.data();
        fetchedLessons.push({
          id: doc.id,
          title: data.title,
          description: data.description || null,
          level: data.level,
          duration: data.duration,
          subjectId: data.subjectId,
          chapterId: data.chapterId,
          subChapterId: data.subChapterId || null,
          moderatorUid: data.moderatorUid,
          moderatorName: data.moderatorName,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date(data.createdAt.seconds * 1000)), // Convert to Timestamp if needed
        });
      });

      // Filter by search term after fetching from Firestore (if not using full-text search)
      // This client-side filter is fine, as it doesn't require extra indexes.
      const filteredBySearch = searchTerm
        ? fetchedLessons.filter(lesson =>
            lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lesson.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lesson.moderatorName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : fetchedLessons;

      setLessons(filteredBySearch);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
      setCurrentPage(newCurrentPage);

      // Total count should only be fetched once on initial load or filter change
      // Only get count for this simple query.
      if (resetPagination || (currentPage === 0 && direction === 'initial')) {
          const countQuery = query(qRef); // Simplified count query, no filters
          const snapshot = await getCountFromServer(countQuery);
          setTotalLessons(snapshot.data().count);
      }

    } catch (err) {
      console.error("Хичээлүүдийг татахад алдаа гарлаа:", err);
      setError("Хичээлүүдийг татахад алдаа гарлаа.");
      toast.error("Хичээлүүдийг татахад алдаа гарлаа.", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoadingLessons(false);
    }
  }, [user, currentPage, searchTerm]);


  // Effect to trigger fetching lessons when main filters change
  useEffect(() => {
    fetchLessonsIndependent('initial', null, true);
  }, [fetchLessonsIndependent]);


  // Sync temp filter states with main filter states - This remains but won't affect query directly
  useEffect(() => {
    // setSearchTerm, setSelectedLevel, setSelectedChapter, setSelectedSubchapter зэрэг setter-үүд устгагдсан тул энд ашиглах боломжгүй
    // Энэ хэсэгт temp хувьсагчид main хувьсагчидтайгаа sync хийгдэхгүй.
    // Хэрэв та эдгээр хувьсагчдыг ашиглахгүй бол энэ useEffect-ийг бүхэлд нь устгах эсвэл хадгалахыг хүсвэл temp хувьсагчдыг зөвхөн useState(initialValue) хэлбэрээр үлдээнэ үү.
  }, [searchTerm, selectedLevel, selectedChapter, selectedSubchapter]);


  // === Handler Functions ===

  // New function to open the delete confirmation dialog
  const confirmDelete = (lessonId: string) => {
    setLessonToDeleteId(lessonId);
    setIsDeleteDialogOpen(true);
  };

  // --- ЭНЭ ХЭСГИЙГ ЗАСВАРЛАСАН: handleDeleteLesson ---
  const handleDeleteLesson = async () => {
    if (!lessonToDeleteId) return; // ID байгаа эсэхийг шалгах

    try {
      setLoadingLessons(true);
      
      const lessonRef = doc(db, 'lessons', lessonToDeleteId);
      
      await deleteDoc(lessonRef);
      
      toast.success("Хичээл амжилттай устгагдлаа.");
      
      // Жагсаалтыг шинэчлэх
      fetchLessonsIndependent('initial', null, true); 
      
    } catch (error) {
      // Алдааны кодыг шалгаж, тохирох мессеж харуулах
      if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        // Зөвшөөрлийн алдааг консол дээр харуулахгүй, зөвхөн хэрэглэгчид тост мессеж харуулна.
        toast.error("Зөвхөн өөрийн үүсгэсэн хичээлийг устгах боломжтой.");
      } else {
        // Бусад төрлийн алдааг консол дээр харуулж, ерөнхий тост мессеж өгнө.
        console.error("Хичээл устгахад алдаа гарлаа:", error);
        toast.error("Хичээл устгахад алдаа гарлаа.", { description: error instanceof Error ? error.message : String(error) });
      }
      setError("Хичээл устгахад алдаа гарлаа.");
    } finally {
      setLoadingLessons(false);
      setIsDeleteDialogOpen(false); // Диалогийг хаах
      setLessonToDeleteId(null); // ID-г цэвэрлэх
    }
  };


  const handleEditLesson = (lessonId: string) => {
    router.push(`/moderator/lessons/edit/${lessonId}`);
  };

  const handleNextPage = () => {
    if (lessons.length === ITEMS_PER_PAGE && lastVisible) {
      fetchLessonsIndependent('next', lastVisible);
    } else {
      toast.info("Дараагийн хуудас байхгүй эсвэл бүх хичээл харагдаж байна.");
    }
  };

  const handlePreviousPage = () => {
    toast.info("Өмнөх хуудас руу шилжих функц одоогоор хязгаарлагдмал байна.", {description: "Их хэмжээний өгөгдөл дээр өмнөх хуудас руу шилжих нь Firestore-д нэлээд төвөгтэй байдаг."});
  };

  const canGoPrevious = currentPage > 0;
  const canGoNextBasedOnPagination = lessons.length === ITEMS_PER_PAGE && lastVisible;


  // === Early Return for Authorization/Loading (AFTER all Hooks are declared) ===
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50 p-4">
        <Skeleton className="h-48 w-full max-w-4xl" />
      </div>
    );
  }

  const requiredRoles = ['moderator', 'admin'];
  if (!user || !(user.role && requiredRoles.includes(user.role))) {
    return (
      <div className="p-4 text-red-500 text-center bg-gray-50 min-h-[calc(100vh-80px)] flex items-center justify-center">
        Зөвшөөрөлгүй хандалт. Та энэ хуудсанд нэвтрэх эрхгүй байна.
      </div>
    );
  }

  // --- Inline LessonTable Content Helpers ---
  const getChapterName = (chapterId: string) => {
    return chapters.find(c => c.id === chapterId)?.name || 'Үл мэдэгдэх';
  };

  const getSubchapterName = (subChapterId: string | null) => {
    if (!subChapterId) return 'Байхгүй';
    return subchapters.find(sc => sc.id === subChapterId)?.name || 'Үл мэдэгдэх';
  };

  // --- Inline LessonFilters Content Logic ---
  // HIDE OR DISABLE THE FILTER UI ELEMENTS FOR NOW
  // handleApplyFilters and handleResetFilters are removed as they are not used.

  return (
    <div className="flex justify-center items-start min-h-[calc(100vh-80px)] p-4 bg-gray-50">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Хичээлүүдийг Удирдах</CardTitle>
          <p className="text-center text-gray-600">Одоо байгаа хичээлүүдийг харах, хайх, шүүх, засварлах, устгах.</p>
          <div className="flex justify-end mt-4">
            <Button onClick={() => router.push('/moderator/lessons/add')} className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" /> Шинэ Хичээл Нэмэх
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLessons ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <span className="ml-2 text-lg">Хичээлүүдийг ачаалж байна...</span>
            </div>
          ) : (
            <>
              {lessons.length === 0 ? (
                <p className="text-center text-gray-500 mt-8">Одоогоор харуулах хичээл олдсонгүй.</p>
              ) : (
                <>
                  {/* Lesson Table Section (Inline) */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Гарчиг</TableHead>
                          <TableHead>Түвшин</TableHead>
                          <TableHead>Хугацаа (мин)</TableHead>
                          <TableHead>Бүлэг</TableHead>
                          <TableHead>Дэд Бүлэг</TableHead>
                          <TableHead>Модератор</TableHead>
                          <TableHead>Үүсгэсэн огноо</TableHead>
                          <TableHead className="text-right">Үйлдэл</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lessons.map((lesson) => (
                          <TableRow key={lesson.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{lesson.title}</TableCell>
                            <TableCell>{lesson.level}</TableCell>
                            <TableCell>{lesson.duration}</TableCell>
                            <TableCell>{getChapterName(lesson.chapterId)}</TableCell>
                            <TableCell>{getSubchapterName(lesson.subChapterId)}</TableCell>
                            <TableCell>{lesson.moderatorName}</TableCell>
                            <TableCell>
                              {lesson.createdAt ? format(lesson.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right flex space-x-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => handleEditLesson(lesson.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => confirmDelete(lesson.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center mt-6">
                    <Button
                      onClick={handlePreviousPage}
                      disabled={!canGoPrevious || loadingLessons}
                      variant="outline"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Өмнөх
                    </Button>
                    <span className="text-sm text-gray-700">
                      Хуудас {currentPage + 1}
                      {totalLessons > 0 && ` (${totalLessons} нийт хичээл)`}
                    </span>
                    <Button
                      onClick={handleNextPage}
                      disabled={!canGoNextBasedOnPagination || loadingLessons}
                      variant="outline"
                    >
                      Дараагийн <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Delete Confirmation Dialog - ADDED THIS PART */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Та үнэхээр устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                <AlertDialogDescription>
                  Энэ үйлдлийг буцаах боломжгүй. Энэ нь таны хичээлийн мэдээллийг Firebase-ээс бүр мөсөн устгана.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setLessonToDeleteId(null);
                }}>Цуцлах</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteLesson} className="bg-red-600 hover:bg-red-700">
                  Устгах
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
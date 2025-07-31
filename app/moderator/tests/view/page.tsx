'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  doc,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Edit, Save, XCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import LatexRenderer from '@/components/LatexRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const NEXT_PUBLIC_R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;

interface TestData {
  id: string;
  questionNumber: number;
  questionText: string;
  moderatorUid: string;
  moderatorName?: string;
  questionType?: string;
  options?: string[];
  correctAnswer?: string;
  difficulty?: string;
  tags?: string[];
  createdAt?: Date;
  questionImage?: string | null;
  optionImages?: (string | null)[];
  explanation?: string;
  explanationImage?: string | null;
  subject?: string;
  topic?: string | null; // Энд бүлгийн нэр шууд хадгалагдана (string)
  subtopic?: string | null; // Энд дэд бүлгийн нэр шууд хадгалагдана (string)
  bloom?: string;
  source?: string;
  score?: number;
  timeLimit?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Индекс сигнатурыг илүү уян хатан болгосон
}

interface FilterOption { // Topic/Subtopic-д зориулсан нийтлэг интерфейс (ID болон Name-тэй)
  id: string;
  name: string;
}

const convertToDate = (timestamp: Date | { toDate: () => Date } | string | number | undefined | null): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp === 'string') {
    const parsedDate = new Date(timestamp);
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }
  if (typeof timestamp === 'number') return new Date(timestamp);
  console.warn('Unknown timestamp format for createdAt:', timestamp);
  return undefined;
};

const getR2PublicImageUrl = (imageKey?: string | null): string | null => {
  if (!imageKey || !NEXT_PUBLIC_R2_ACCOUNT_ID) {
    return null;
  }
  const cleanedImageKey = imageKey.trim();
  if (cleanedImageKey.startsWith('http://') || cleanedImageKey.startsWith('https://')) {
    return cleanedImageKey;
  }
  const encodedImageKey = encodeURIComponent(cleanedImageKey);
  return `https://pub-${NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.dev/${encodedImageKey}`;
};


export default function ModeratorTestsViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [selectedTest, setSelectedTest] = useState<TestData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [isFirstPage, setIsFirstPage] = useState(true);

  const pageCache = useRef<Map<number, DocumentSnapshot>>(new Map());
  const orderedPageSnapshots = useRef<DocumentSnapshot[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingTest, setEditingTest] = useState<TestData | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [selectedModerator, setSelectedModerator] = useState<string>('all');
  const [selectedBloom, setSelectedBloom] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all'); // Энд шүүх бүлгийн нэр хадгалагдана
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all'); // Энд шүүх дэд бүлгийн нэр хадгалагдана

  const [moderatorOptions, setModeratorOptions] = useState<{ uid: string; name: string }[]>([]);
  const [difficultyOptions] = useState<string[]>(['Хялбар', 'Дунд', 'Хүнд']);
  const [bloomOptions] = useState<string[]>([
    'СЭРГЭЭН САНАХ',
    'ОЙЛГОХ',
    'ХЭРЭГЛЭХ',
    'ЗАДЛАН ШИНЖЛЭХ',
    'ҮНЭЛЭХ',
    'БҮТЭЭХ',
  ]);
  const [topicOptions, setTopicOptions] = useState<FilterOption[]>([]); // Бүлгийн сонголтууд (ID, Name-тэй)
  const [subtopicOptions, setSubtopicOptions] = useState<FilterOption[]>([]); // Дэд бүлгийн сонголтууд (ID, Name-тэй)


  useEffect(() => {
    const allowedRoles = ['moderator', 'admin'];
    if (!authLoading && (!user || !(user.role && allowedRoles.includes(user.role)))) {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);


  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!db) return;

      try {
        // Модератор татах
        const usersColRef = collection(db, 'users');
        const qUsers = query(
          usersColRef,
          where('role', 'in', ['moderator', 'admin']),
          orderBy('name', 'asc')
        );
        const userSnapshot = await getDocs(qUsers);
        const mods: { uid: string; name: string }[] = [];
        userSnapshot.forEach(docSnap => {
          const userData = docSnap.data();
          mods.push({ uid: docSnap.id, name: (userData.name as string) || (userData.email as string) || 'Нэргүй' });
        });
        setModeratorOptions(mods);

        // Бүлэг татах (topic collection-оос нэрээр нь шүүхэд ашиглахын тулд ID, name-тэйгээр татна)
        const topicsColRef = collection(db, 'chapters');
        const qTopics = query(topicsColRef, orderBy('name', 'asc'));
        const topicSnapshot = await getDocs(qTopics);
        const topics: FilterOption[] = [];
        topicSnapshot.forEach(docSnap => {
          const topicData = docSnap.data();
          topics.push({ id: docSnap.id, name: (topicData.name as string) || 'Нэргүй бүлэг' });
        });
        setTopicOptions(topics);

      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    };

    if (!authLoading && user && (user.role === 'moderator' || user.role === 'admin')) {
      fetchFilterOptions();
    }
  }, [user, authLoading]);

  // Сонгосон бүлэг өөрчлөгдөхөд дэд сэдвүүдийг татах
  useEffect(() => {
    const fetchSubtopics = async () => {
      // Хэрэв selectedTopic нь "all" эсвэл хоосон бол дэд бүлэг байхгүй
      if (!db || selectedTopic === 'all' || !selectedTopic) {
        setSubtopicOptions([]);
        setSelectedSubtopic('all'); // Бүлэг солигдоход дэд сэдвийг цэвэрлэх
        return;
      }

      try {
        // topics collection-оос бүлгийн нэрээр ID-г нь олно
        const selectedTopicDoc = topicOptions.find(opt => opt.name === selectedTopic);
        if (!selectedTopicDoc) {
          setSubtopicOptions([]);
          setSelectedSubtopic('all');
          return;
        }

        // topics/{topicId}/subtopics гэсэн subcollection-оос татна
        const subtopicsColRef = collection(db, 'chapters', selectedTopicDoc.id, 'subchapters');
        const qSubtopics = query(subtopicsColRef, orderBy('name', 'asc'));
        const subtopicSnapshot = await getDocs(qSubtopics);
        const subtopics: FilterOption[] = [];
        subtopicSnapshot.forEach(docSnap => {
          const subtopicData = docSnap.data();
          subtopics.push({ id: docSnap.id, name: (subtopicData.name as string) || 'Нэргүй Дэд бүлэг' });
        });
        setSubtopicOptions(subtopics);
      } catch (err) {
        console.error("Error fetching subtopics:", err);
        setSubtopicOptions([]);
      }
    };

    // selectedTopic өөрчлөгдөх эсвэл topicOptions ачаалагдахад дэд бүлгүүдийг татна
    if (topicOptions.length > 0 || selectedTopic === 'all') { // ensure topicOptions is loaded
      fetchSubtopics();
    }
  }, [db, selectedTopic, topicOptions]);


  const fetchTests = useCallback(async () => {
    if (!db || !user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      setLoadingTests(false);
      return;
    }

    setLoadingTests(true);
    setError(null);
    setTests([]);
    setSelectedTest(null);

    const testsColRef = collection(db, 'test');
    let baseQuery = query(testsColRef, orderBy('questionNumber', 'asc'));

    if (selectedModerator !== 'all') {
      baseQuery = query(baseQuery, where('moderatorUid', '==', selectedModerator));
    }
    if (selectedBloom !== 'all') {
      baseQuery = query(baseQuery, where('bloom', '==', selectedBloom));
    }
    if (selectedDifficulty !== 'all') {
      baseQuery = query(baseQuery, where('difficulty', '==', selectedDifficulty));
    }
    // Topic болон Subtopic нь ID биш нэрээр хадгалагддаг тул шууд харьцуулна
    if (selectedTopic !== 'all') {
      baseQuery = query(baseQuery, where('topic', '==', selectedTopic));
    }
    if (selectedSubtopic !== 'all') {
      baseQuery = query(baseQuery, where('subtopic', '==', selectedSubtopic));
    }

    let paginatedQuery;
    let newLastVisible: DocumentSnapshot | null = null;
    let newFirstVisible: DocumentSnapshot | null = null;

    if (currentPage > 1 && pageCache.current.has(currentPage - 1)) {
        const startDoc = pageCache.current.get(currentPage - 1)!;
        paginatedQuery = query(baseQuery, startAfter(startDoc), limit(itemsPerPage));
        console.log(`Fetching page ${currentPage} using startAfter cached document.`);
    } else if (currentPage > 1 && orderedPageSnapshots.current[currentPage - 2]) {
        const startDoc = orderedPageSnapshots.current[currentPage - 2];
        paginatedQuery = query(baseQuery, startAfter(startDoc), limit(itemsPerPage));
        console.log(`Fetching page ${currentPage} using orderedPageSnapshots.`);
    } else {
        paginatedQuery = query(baseQuery, limit(itemsPerPage));
        console.log(`Fetching page ${currentPage} from the beginning.`);
    }

    try {
      const snapshot = await getDocs(paginatedQuery);
      const fetchedTests: TestData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const testItem: TestData = {
          id: docSnap.id,
          questionNumber: data.questionNumber || 0,
          questionText: data.question || 'Асуултын текст байхгүй',
          moderatorUid: data.moderatorUid || 'Үл мэдэгдэх UID',
          questionType: data.answerType as string | undefined,
          options: (Array.isArray(data.options) ? data.options.map(String) : []) as string[],
          correctAnswer: data.correctAnswer as string | undefined,
          difficulty: data.difficulty as string | undefined,
          tags: (Array.isArray(data.tags) ? data.tags.map(String) : []) as string[],
          createdAt: convertToDate(data.createdAt),
          questionImage: data.questionImage as string | null,
          optionImages: (Array.isArray(data.optionImages) ? data.optionImages.map(String) : []) as (string | null)[],
          explanation: data.explanation as string | undefined,
          explanationImage: data.explanationImage as string | null,
          subject: data.subject as string | undefined,
          topic: (data.topic as string | null) || null, // Topic field нь нэрээр хадгалагдана
          subtopic: (data.subtopic as string | null) || null, // Subtopic field нь нэрээр хадгалагдана
          bloom: data.bloom as string | undefined,
          source: data.source as string | undefined,
          score: data.score as number | undefined,
          timeLimit: data.timeLimit as number | undefined,
          // Бусад талбаруудыг автоматаар нэмэхийн тулд
          ...Object.fromEntries(Object.entries(data).filter(([key]) => !(key in {
            id: true, questionNumber: true, question: true, moderatorUid: true, answerType: true,
            options: true, correctAnswer: true, difficulty: true, tags: true, createdAt: true,
            questionImage: true, optionImages: true, explanation: true, explanationImage: true,
            subject: true, topic: true, subtopic: true, bloom: true, source: true, score: true, timeLimit: true
          })))
        };
        fetchedTests.push(testItem);
      });

      const moderatorNamesMap = new Map<string, string>();
      moderatorOptions.forEach(mod => moderatorNamesMap.set(mod.uid, mod.name));
      const testsWithNames = fetchedTests.map(test => ({
        ...test,
        moderatorName: moderatorNamesMap.get(test.moderatorUid) || test.moderatorUid.substring(0, 8) + '...'
      }));

      setTests(testsWithNames);

      if (snapshot.docs.length > 0) {
        newFirstVisible = snapshot.docs[0];
        newLastVisible = snapshot.docs[snapshot.docs.length - 1];
        setFirstVisible(newFirstVisible);
        setLastVisible(newLastVisible);

        pageCache.current.set(currentPage, newLastVisible);
        if (orderedPageSnapshots.current.length < currentPage) {
            orderedPageSnapshots.current[currentPage - 1] = newLastVisible;
        }

        const nextQuery = query(baseQuery, startAfter(newLastVisible), limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        setIsLastPage(nextSnapshot.empty);
      } else {
        setFirstVisible(null);
        setLastVisible(null);
        setIsLastPage(true);
      }

      setIsFirstPage(currentPage === 1);

      // Total items count-ийг филтер өөрчлөгдөхөд дахин тооцоолно
      if (totalItemsCount === null || selectedModerator !== 'all' || selectedBloom !== 'all' || selectedDifficulty !== 'all' || selectedTopic !== 'all' || selectedSubtopic !== 'all') {
        const totalSnapshot = await getDocs(baseQuery);
        setTotalItemsCount(totalSnapshot.size);
      }

    } catch (err) {
      console.error("Error fetching tests:", err);
      setError("Тестүүдийг татахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingTests(false);
    }
  }, [currentPage, itemsPerPage, user, selectedModerator, selectedBloom, selectedDifficulty, selectedTopic, selectedSubtopic, moderatorOptions, totalItemsCount]);

  // Шүүлтүүрүүд өөрчлөгдөхөд 1-р хуудас руу буцаж шинээр татна
  useEffect(() => {
    fetchTests();
  }, [currentPage, itemsPerPage, selectedModerator, selectedBloom, selectedDifficulty, selectedTopic, selectedSubtopic, fetchTests]);

  useEffect(() => {
    pageCache.current.clear();
    orderedPageSnapshots.current = [];
    setTotalItemsCount(null);
    setCurrentPage(1);
    setSelectedTest(null);
    setIsEditing(false);
  }, [selectedModerator, selectedBloom, selectedDifficulty, selectedTopic, selectedSubtopic]);


  const totalPages = totalItemsCount ? Math.ceil(totalItemsCount / itemsPerPage) : 1;

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (loadingTests) return;

    if (direction === 'next') {
        if (!isLastPage) {
            setCurrentPage(prev => prev + 1);
        }
    } else {
        if (!isFirstPage) {
            setCurrentPage(prev => Math.max(1, prev - 1));
        }
    }
    setSelectedTest(null);
    setIsEditing(false);
  };

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value));
    pageCache.current.clear();
    orderedPageSnapshots.current = [];
    setTotalItemsCount(null);
    setCurrentPage(1);
    setSelectedTest(null);
    setIsEditing(false);
  }, []);

  const handleSaveTest = async (testToSave: TestData) => {
    // Хэрэглэгчийн эрхийг шалгана. Админ эсвэл тухайн тестийг үүсгэсэн модератор байх ёстой.
    if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      setError("Хадгалах эрх байхгүй байна.");
      return;
    }
    if (user.role === 'moderator' && testToSave.moderatorUid !== user.uid) {
        setError("Та зөвхөн өөрийн үүсгэсэн тестыг засварлах боломжтой.");
        return;
    }

    if (!testToSave.id) {
      setError("Засах тестийн ID олдсонгүй.");
      return;
    }

    setSaveLoading(true);
    try {
      const testRef = doc(db, 'test', testToSave.id);
      const originalTest = tests.find(t => t.id === testToSave.id);

      const updatedFields: Partial<TestData> = {};

      // TestData интерфейс дээр байгаа бүх field-үүдийг давтан шалгаж өөрчлөгдсөн эсэхийг тогтооно
      for (const key of Object.keys(testToSave) as Array<keyof TestData>) {
        if (key === 'id' || key === 'moderatorName' || key === 'createdAt') continue; // Эдгээр талбаруудыг өөрчлөхгүй

        const valueToSave = testToSave[key];
        const originalValue = originalTest?.[key];

        if (valueToSave instanceof Date) {
          if (originalValue instanceof Date) {
            if (valueToSave.getTime() !== originalValue.getTime()) {
              updatedFields[key] = valueToSave;
            }
          } else {
            updatedFields[key] = valueToSave;
          }
        } else if (Array.isArray(valueToSave)) {
          if (!arraysEqual(valueToSave, originalValue as (string | null)[])) {
            updatedFields[key] = valueToSave;
          }
        } else {
          // undefined утгыг (жишээлбэл, select 'all'-аас ирсэн) null болгож хадгална
          const comparableValueToSave = valueToSave === undefined ? null : valueToSave;
          const comparableOriginalValue = originalValue === undefined ? null : originalValue;

          if (comparableValueToSave !== comparableOriginalValue) {
            updatedFields[key] = comparableValueToSave;
          }
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        await updateDoc(testRef, updatedFields);
        alert("Тест амжилттай хадгалагдлаа!");
      } else {
        alert("Өөрчлөгдсөн зүйл байхгүй тул хадгалах шаардлагагүй.");
      }

      setIsEditing(false);
      setSaveLoading(false);
      // selectedTest-ийг шинэчлэгдсэн testToSave-оор сольж, жагсаалтад байгаа тестийг шинэчилнэ
      setTests(prevTests => prevTests.map(test => test.id === testToSave.id ? testToSave : test));
      setSelectedTest(testToSave);

    } catch (err: unknown) {
      console.error("Тест хадгалахад алдаа гарлаа:", err);
      setError("Тест хадгалахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
      setSaveLoading(false);
    }
  };

  const arraysEqual = (a: (string | null)[], b: (string | null)[]): boolean => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  const requiredRoles = ['moderator', 'admin'];
  if (!user || !(user.role && requiredRoles.includes(user.role))) {
    return (
      <div className="p-4 text-red-500 text-center bg-gray-50 min-h-screen flex items-center justify-center">
        Зөвшөөрөлгүй хандалт. Та энэ хуудсанд нэвтрэх эрхгүй байна.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] p-4 gap-4 bg-gray-50">
      <Card className="w-full md:w-2/5 lg:w-1/3 flex flex-col">
        <CardHeader>
          <CardTitle className="text-center">Тестийн жагсаалт</CardTitle>
          <CardDescription className="text-center">Бүх тестүүдийн жагсаалт болон хуудаслалт.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          {error && (
            <div className="text-red-500 text-center p-4">
              Алдаа: {error}
            </div>
          )}
          {loadingTests ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-450px)]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <p className="text-sm text-gray-500 mt-2">Тестүүдийг ачаалж байна...</p>
              <Skeleton className="h-[200px] w-[90%] mt-4" />
            </div>
          ) : (
            <>
              {/* Филтер хэсэг */}
              <div className="p-4 border-b">
                <div className="mb-2">
                  <Label htmlFor="moderator-filter" className="text-sm">Модератор:</Label>
                  <Select value={selectedModerator} onValueChange={setSelectedModerator}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх модератор" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх модератор</SelectItem>
                      {moderatorOptions.map(mod => (
                        <SelectItem key={mod.uid} value={mod.uid}>{mod.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Бүлэг филтер */}
                <div className="mb-2">
                  <Label htmlFor="topic-filter" className="text-sm">Бүлэг:</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх бүлэг" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх бүлэг</SelectItem>
                      {/* FilterOption-ийн name-ийг value болгон ашиглана */}
                      {topicOptions.map(topic => (
                        <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Дэд бүлэг филтер */}
                <div className="mb-2">
                  <Label htmlFor="subtopic-filter" className="text-sm">Дэд бүлэг:</Label>
                  <Select
                    value={selectedSubtopic}
                    onValueChange={setSelectedSubtopic}
                    // selectedTopic нь "all" биш, эсвэл subtopicOptions хоосон бол disabled байна
                    disabled={selectedTopic === 'all' || subtopicOptions.length === 0}
                  >
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх дэд бүлэг" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх дэд бүлэг</SelectItem>
                       {/* FilterOption-ийн name-ийг value болгон ашиглана */}
                      {subtopicOptions.map(subtopic => (
                        <SelectItem key={subtopic.id} value={subtopic.name}>{subtopic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Блүүмийн түвшин филтер */}
                <div className="mb-2">
                  <Label htmlFor="bloom-filter" className="text-sm">Блүүмийн түвшин:</Label>
                  <Select value={selectedBloom} onValueChange={setSelectedBloom}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх түвшин" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх түвшин</SelectItem>
                      {bloomOptions.map(bloom => (
                        <SelectItem key={bloom} value={bloom}>{bloom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mb-2">
                  <Label htmlFor="difficulty-filter" className="text-sm">Хүндрэл:</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх хүндрэл" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх хүндрэл</SelectItem>
                      {difficultyOptions.map(diff => (
                        <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    setSelectedModerator('all');
                    setSelectedBloom('all');
                    setSelectedDifficulty('all');
                    setSelectedTopic('all');
                    setSelectedSubtopic('all');
                    setCurrentPage(1);
                    setSelectedTest(null);
                    setIsEditing(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 w-full text-xs"
                >
                  Филтер цэвэрлэх
                </Button>
              </div>

              {tests.length === 0 && !loadingTests ? (
                <p className="p-4 text-center text-gray-500">Тест олдсонгүй.</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-450px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Дугаар</TableHead>
                        <TableHead>Асуулт</TableHead>
                        <TableHead className="w-[120px]">Модератор</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tests.map((test) => (
                        <TableRow
                          key={test.id}
                          onClick={() => {
                            setSelectedTest(test);
                            setIsEditing(false);
                          }}
                          className={`cursor-pointer hover:bg-gray-100 ${
                            selectedTest?.id === test.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <TableCell className="font-medium">{String(test.questionNumber)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm"><LatexRenderer text={test.questionText} /></TableCell>
                          <TableCell className="truncate text-sm">{test.moderatorName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              <div className="flex items-center justify-between border-t p-2 mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="items-per-page" className="text-sm">Нэг хуудсанд:</Label>
                  <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="h-8 w-[80px] text-xs">
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange('prev')}
                    disabled={isFirstPage || loadingTests}
                    className="h-8 text-xs"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange('next')}
                    disabled={isLastPage || totalPages === 0 || loadingTests}
                    className="h-8 text-xs"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="flex w-full flex-col md:w-3/5 lg:w-2/3">
        <CardHeader>
          <CardTitle className="text-center">Сонгосон тестийн дэлгэрэнгүй мэдээлэл</CardTitle>
          <CardDescription className="text-center">Сонгосон тестийн бүх талбарууд.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4">
          {!selectedTest ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Дэлгэрэнгүй мэдээлэл харахын тулд зүүн талаас тест сонгоно уу.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 flex justify-end">
                  {!isEditing ? (
                      // "Засах" товчлуурыг харуулах нөхцөл
                      (user && (user.role === 'admin' || (user.role === 'moderator' && selectedTest.moderatorUid === user.uid))) ? (
                          <Button onClick={() => { setIsEditing(true); setEditingTest({ ...selectedTest }); }} variant="outline" size="sm">
                              <Edit className="mr-2 h-4 w-4" /> Засах
                          </Button>
                      ) : (
                          <Button variant="outline" size="sm" disabled>
                              <Edit className="mr-2 h-4 w-4" /> Засах боломжгүй
                          </Button>
                      )
                  ) : (
                      <div className="space-x-2">
                          <Button onClick={() => {
                              if (editingTest) {
                                  void handleSaveTest(editingTest);
                              }
                          }} disabled={saveLoading} size="sm">
                              {saveLoading ? 'Хадгалж байна...' : <><Save className="mr-2 h-4 w-4" /> Хадгалах</>}
                          </Button>
                          <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">
                              <XCircle className="mr-2 h-4 w-4" /> Цуцлах
                          </Button>
                      </div>
                  )}
              </div>
              <div className="rounded-lg border bg-gray-50 p-3">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Төрөл:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editingTest?.questionType || ''}
                            onChange={(e) => setEditingTest(prev => prev ? { ...prev, questionType: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedTest.questionType || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Бүлэг:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            // value нь нэрээр байна
                            value={editingTest?.topic || 'all'}
                            onValueChange={(value) => {
                              // Сонгосон үед нэрээр хадгална, "all" бол null болгоно
                              setEditingTest(prev => prev ? { ...prev, topic: value === 'all' ? null : value, subtopic: null } : null)
                            }}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Сонгохгүй</SelectItem>
                              {topicOptions.map(topic => (
                                // SelectItem-ийн value нь нэр байна
                                <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          // selectedTest.topic нь аль хэдийн нэр учраас шууд харуулна
                          selectedTest.topic || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Дэд бүлэг:</td>
                      <td className="py-1">
                          {isEditing ? (
                            <Select
                              // value нь нэрээр байна
                              value={editingTest?.subtopic || 'all'}
                              onValueChange={(value) => {
                                // Сонгосон үед нэрээр хадгална, "all" бол null болгоно
                                setEditingTest(prev => prev ? { ...prev, subtopic: value === 'all' ? null : value } : null)
                              }}
                              // SelectedTopic нь "all" биш, мөн дэд бүлгийн сонголтууд байхгүй үед disabled байна.
                              disabled={!editingTest?.topic || subtopicOptions.length === 0}
                            >
                              <SelectTrigger className="h-8 w-[120px] text-xs">
                                <SelectValue placeholder="Сонгох" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Сонгохгүй</SelectItem>
                                {subtopicOptions.map(subtopic => (
                                  // SelectItem-ийн value нь нэр байна
                                  <SelectItem key={subtopic.id} value={subtopic.name}>{subtopic.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            // selectedTest.subtopic нь аль хэдийн нэр учраас шууд харуулна
                            selectedTest.subtopic || '-'
                          )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Хүндрэл:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingTest?.difficulty || ''}
                            onValueChange={(value) => setEditingTest(prev => prev ? { ...prev, difficulty: value } : null)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              {difficultyOptions.map(diff => (
                                <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedTest.difficulty || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Bloom&apos s:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingTest?.bloom || ''}
                            onValueChange={(value) => setEditingTest(prev => prev ? { ...prev, bloom: value } : null)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Сонгохгүй</SelectItem>
                              {bloomOptions.map(bloom => (
                                <SelectItem key={bloom} value={bloom}>{bloom}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedTest.bloom || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Эх сурвалж:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editingTest?.source || ''}
                            onChange={(e) => setEditingTest(prev => prev ? { ...prev, source: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedTest.source || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Оноо:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingTest?.score || 0}
                            onChange={(e) => setEditingTest(prev => prev ? { ...prev, score: Number(e.target.value) } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedTest.score || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Хугацаа:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingTest?.timeLimit || 0}
                            onChange={(e) => setEditingTest(prev => prev ? { ...prev, timeLimit: Number(e.target.value) } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedTest.timeLimit !== undefined ? `${selectedTest.timeLimit} сек` : '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Үүсгэсэн огноо:</td>
                      <td className="py-1" colSpan={5}>
                        {selectedTest.createdAt && selectedTest.createdAt instanceof Date ? selectedTest.createdAt.toLocaleDateString() + ' ' + selectedTest.createdAt.toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p><b>Асуултын дугаар:</b> {selectedTest.questionNumber}</p>
              <p><b>Модератор:</b> {selectedTest.moderatorName}</p>
              <p><b>Асуулт:</b></p>
              {isEditing ? (
                  <Textarea
                    value={editingTest?.questionText || ''}
                    onChange={(e) => setEditingTest(prev => prev ? { ...prev, questionText: e.target.value } : null)}
                    rows={4}
                    className="text-sm"
                  />
              ) : (
                  <LatexRenderer text={selectedTest.questionText} />
              )}

              {selectedTest.questionImage && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold text-gray-700">Асуултын зураг:</h3>
                  <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-md bg-gray-100">
                  {getR2PublicImageUrl(selectedTest.questionImage) ? (
                        <Image
                          src={getR2PublicImageUrl(selectedTest.questionImage)!}
                          alt={`Тестийн зураг: ${selectedTest.questionNumber}`}
                          fill
                          style={{ objectFit: 'contain' }}
                          className="rounded-md"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                          placeholder="empty"
                        />
                      ) : (
                        <Image
                          src="https://placehold.co/600x400/e0e0e0/555555?text=Зураг+байхгүй"
                          alt="Зураг байхгүй"
                          fill
                          style={{ objectFit: 'contain' }}
                          className="rounded-md"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                          placeholder="empty"
                        />
                      )}
                  </div>
                  {isEditing && (
                    <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">Зураг солих / Устгах (Функц нэмэх)</Button>
                  )}
                </div>
              )}

              {selectedTest.options && selectedTest.options.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold">Хариултын сонголтууд:</p>
                  {selectedTest.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        option === selectedTest.correctAnswer ? 'border-green-600 bg-green-500 text-white' : 'border-gray-300 bg-gray-200 text-gray-700'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {isEditing ? (
                        <Textarea
                          value={editingTest?.options?.[idx] || ''}
                          onChange={(e) => {
                            const newOptions = [...(editingTest?.options || [])];
                            newOptions[idx] = e.target.value;
                            setEditingTest(prev => prev ? { ...prev, options: newOptions } : null);
                          }}
                          rows={1}
                          className="flex-grow text-sm"
                        />
                      ) : (
                        <LatexRenderer text={option} />
                      )}

                      {(() => {
                          const rawPath = selectedTest.optionImages?.[idx];
                          const imageUrl = rawPath && rawPath !== 'null' ? getR2PublicImageUrl(rawPath) : null;
                          return imageUrl ? (
                            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-md bg-gray-100 shadow-sm">
                              <Image
                                src={imageUrl}
                                alt={`Сонголтын зураг ${idx + 1}`}
                                fill
                                style={{ objectFit: 'contain' }}
                                className="rounded-md"
                                sizes="80px"
                                placeholder="empty"
                              />
                            </div>
                          ) : (
                            isEditing && <Button variant="outline" size="icon" className="h-6 w-6 text-xs"><Edit className="h-3 w-3" /></Button>
                          );
                      })()}
                      {isEditing && (!selectedTest.optionImages || !selectedTest.optionImages[idx]) && (
                        <Button variant="outline" size="icon" className="h-6 w-6 text-xs"><Edit className="h-3 w-3" /></Button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">Сонголт нэмэх/хасах (Функц нэмэх)</Button>
                  )}
                </div>
              )}
              <p className="font-semibold text-green-600">Зөв хариулт:
                {isEditing ? (
                  <Input
                    type="text"
                    value={editingTest?.correctAnswer || ''}
                    onChange={(e) => setEditingTest(prev => prev ? { ...prev, correctAnswer: e.target.value } : null)}
                    className="ml-2 inline-block h-8 w-48 text-sm"
                  />
                ) : (
                  <LatexRenderer text={selectedTest.correctAnswer || '-'} />
                )}
              </p>

              {selectedTest.explanation && (
                <div>
                  <p><b>Бодолт:</b></p>
                  {isEditing ? (
                      <Textarea
                        value={editingTest?.explanation || ''}
                        onChange={(e) => setEditingTest(prev => prev ? { ...prev, explanation: e.target.value } : null)}
                        rows={4}
                        className="text-sm"
                      />
                  ) : (
                      <LatexRenderer text={selectedTest.explanation} />
                  )}
                </div>
              )}
              {selectedTest.explanationImage && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold text-gray-700">Бодолтын зураг:</h3>
                  <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-md bg-gray-100">
                  {getR2PublicImageUrl(selectedTest.explanationImage) ? (
                    <Image
                      src={getR2PublicImageUrl(selectedTest.explanationImage)!}
                      alt={`Бодолтын зураг: ${selectedTest.questionNumber}`}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded-md"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                      placeholder="empty"
                    />
                  ) : (
                    <Image
                      src="https://placehold.co/600x400/e0e0e0/555555?text=Зураг+байхгүй"
                      alt="Зураг байхгүй"
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded-md"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                      placeholder="empty"
                    />
                  )}
                  </div>
                  {isEditing && (
                    <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">Зураг солих / Устгах (Функц нэмэх)</Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
// moderator/problems/view/page.tsx
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
  deleteDoc, // <--- Шинэ: Бодлого устгах функц
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
import { ArrowLeft, ArrowRight, Edit, Save, XCircle, Loader2, Trash2 } from 'lucide-react'; // <--- Шинэ: Trash2 икон
import Image from 'next/image';
import LatexRenderer from '@/components/LatexRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'; // <--- Шинэ: AlertDialog компонентууд

const NEXT_PUBLIC_R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;

interface ProblemData {
  id: string;
  title: string;
  problemText: string;
  moderatorUid: string;
  moderatorName?: string;
  problemType?: string;
  difficulty?: string;
  tags?: string[];
  references?: string;
  createdAt?: Date;
  problemImage?: string | null;
  solutionText?: string;
  solutionImage?: string | null;
  subject?: string;
  topic?: string | null;
  subtopic?: string | null;
  score?: number;
  correctAnswerInput?: string; // Шинэчлэгдсэн: correctAnswerInput нэмсэн
  answerHint?: string; // Шинэчлэгдсэн: answerHint нэмсэн
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface FilterOption {
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


export default function ModeratorProblemsViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [problems, setProblems] = useState<ProblemData[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<ProblemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [isFirstPage, setIsFirstPage] = useState(true);

  const pageCache = useRef<Map<number, DocumentSnapshot>>(new Map());
  const orderedPageSnapshots = useRef<DocumentSnapshot[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ProblemData | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [selectedModerator, setSelectedModerator] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedProblemType, setSelectedProblemType] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all');

  const [moderatorOptions, setModeratorOptions] = useState<{ uid: string; name: string }[]>([]);
  const [difficultyOptions] = useState<string[]>(['Амархан', 'Дунд', 'Хүнд']);
  const [problemTypeOptions] = useState<string[]>([
    'Дасгал бодлого',
    'Олимпиадын бодлого',
    'Түгээмэл бодлого',
    'Сонирхолтой бодлого',
  ]);
  const [topicOptions, setTopicOptions] = useState<FilterOption[]>([]);
  const [subtopicOptions, setSubtopicOptions] = useState<FilterOption[]>([]);


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
        toast.error("Филтерийн сонголтуудыг татахад алдаа гарлаа.");
      }
    };

    if (!authLoading && user && (user.role === 'moderator' || user.role === 'admin')) {
      fetchFilterOptions();
    }
  }, [user, authLoading]);

  useEffect(() => {
    const fetchSubtopics = async () => {
      if (!db || selectedTopic === 'all' || !selectedTopic) {
        setSubtopicOptions([]);
        setSelectedSubtopic('all');
        return;
      }

      try {
        const selectedTopicDoc = topicOptions.find(opt => opt.name === selectedTopic);
        if (!selectedTopicDoc) {
          setSubtopicOptions([]);
          setSelectedSubtopic('all');
          return;
        }

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
        toast.error("Дэд бүлгүүдийг татахад алдаа гарлаа.");
      }
    };

    if (topicOptions.length > 0 || selectedTopic === 'all') {
      fetchSubtopics();
    }
  }, [db, selectedTopic, topicOptions]);


  const fetchProblems = useCallback(async () => {
    if (!db || !user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      setLoadingProblems(false);
      return;
    }

    setLoadingProblems(true);
    setError(null);
    setProblems([]);
    setSelectedProblem(null);

    const problemsColRef = collection(db, 'problems');
    let baseQuery = query(problemsColRef, orderBy('createdAt', 'desc'));

    if (selectedModerator !== 'all') {
      baseQuery = query(baseQuery, where('moderatorUid', '==', selectedModerator));
    }
    if (selectedDifficulty !== 'all') {
      baseQuery = query(baseQuery, where('difficulty', '==', selectedDifficulty));
    }
    if (selectedProblemType !== 'all') {
      baseQuery = query(baseQuery, where('problemType', '==', selectedProblemType));
    }
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
    } else if (currentPage > 1 && orderedPageSnapshots.current[currentPage - 2]) {
        const startDoc = orderedPageSnapshots.current[currentPage - 2];
        paginatedQuery = query(baseQuery, startAfter(startDoc), limit(itemsPerPage));
    } else {
        paginatedQuery = query(baseQuery, limit(itemsPerPage));
    }

    try {
      const snapshot = await getDocs(paginatedQuery);
      const fetchedProblems: ProblemData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const problemItem: ProblemData = {
          id: docSnap.id,
          title: data.title || 'Гарчиггүй',
          problemText: data.problemText || 'Бодлогын текст байхгүй',
          moderatorUid: data.moderatorUid || 'Үл мэдэгдэх UID',
          problemType: data.problemType as string | undefined,
          difficulty: data.difficulty as string | undefined,
          tags: (Array.isArray(data.tags) ? data.tags.map(String) : []) as string[],
          references: data.references as string | undefined,
          createdAt: convertToDate(data.createdAt),
          problemImage: data.problemImage as string | null,
          solutionText: data.solutionText as string | undefined,
          solutionImage: data.solutionImage as string | null,
          subject: data.subject as string | undefined,
          topic: (data.topic as string | null) || null,
          subtopic: (data.subtopic as string | null) || null,
          score: data.score as number | undefined,
          correctAnswerInput: data.correctAnswerInput as string | undefined,
          answerHint: data.answerHint as string | undefined,
          ...Object.fromEntries(Object.entries(data).filter(([key]) => !(key in {
            id: true, title: true, problemText: true, moderatorUid: true, problemType: true,
            difficulty: true, tags: true, references: true, createdAt: true, problemImage: true,
            solutionText: true, solutionImage: true, subject: true, topic: true, subtopic: true, score: true,
            correctAnswerInput: true, answerHint: true
          })))
        };
        fetchedProblems.push(problemItem);
      });

      const moderatorNamesMap = new Map<string, string>();
      moderatorOptions.forEach(mod => moderatorNamesMap.set(mod.uid, mod.name));
      const problemsWithNames = fetchedProblems.map(problem => ({
        ...problem,
        moderatorName: moderatorNamesMap.get(problem.moderatorUid) || problem.moderatorUid.substring(0, 8) + '...'
      }));

      setProblems(problemsWithNames);

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

      if (totalItemsCount === null || selectedModerator !== 'all' || selectedDifficulty !== 'all' || selectedProblemType !== 'all' || selectedTopic !== 'all' || selectedSubtopic !== 'all') {
        const totalSnapshot = await getDocs(baseQuery);
        setTotalItemsCount(totalSnapshot.size);
      }

    } catch (err) {
      console.error("Error fetching problems:", err);
      setError("Бодлогуудыг татахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingProblems(false);
    }
  }, [currentPage, itemsPerPage, user, selectedModerator, selectedDifficulty, selectedProblemType, selectedTopic, selectedSubtopic, moderatorOptions, totalItemsCount]);

  useEffect(() => {
    fetchProblems();
  }, [currentPage, itemsPerPage, selectedModerator, selectedDifficulty, selectedProblemType, selectedTopic, selectedSubtopic, fetchProblems]);

  useEffect(() => {
    pageCache.current.clear();
    orderedPageSnapshots.current = [];
    setTotalItemsCount(null);
    setCurrentPage(1);
    setSelectedProblem(null);
    setIsEditing(false);
  }, [selectedModerator, selectedDifficulty, selectedProblemType, selectedTopic, selectedSubtopic]);


  const totalPages = totalItemsCount ? Math.ceil(totalItemsCount / itemsPerPage) : 1;

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (loadingProblems) return;

    if (direction === 'next') {
        if (!isLastPage) {
            setCurrentPage(prev => prev + 1);
        }
    } else {
        if (!isFirstPage) {
            setCurrentPage(prev => Math.max(1, prev - 1));
        }
    }
    setSelectedProblem(null);
    setIsEditing(false);
  };

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value));
    pageCache.current.clear();
    orderedPageSnapshots.current = [];
    setTotalItemsCount(null);
    setCurrentPage(1);
    setSelectedProblem(null);
    setIsEditing(false);
  }, []);

  const handleSaveProblem = async (problemToSave: ProblemData) => {
    if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      setError("Хадгалах эрх байхгүй байна.");
      toast.error("Хадгалах эрх байхгүй байна.");
      return;
    }
    if (user.role === 'moderator' && problemToSave.moderatorUid !== user.uid) {
        setError("Та зөвхөн өөрийн үүсгэсэн бодлогыг засварлах боломжтой.");
        toast.error("Та зөвхөн өөрийн үүсгэсэн бодлогыг засварлах боломжтой.");
        return;
    }

    if (!problemToSave.id) {
      setError("Засах бодлогын ID олдсонгүй.");
      toast.error("Засах бодлогын ID олдсонгүй.");
      return;
    }

    setSaveLoading(true);
    try {
      const problemRef = doc(db, 'problems', problemToSave.id);
      const originalProblem = problems.find(p => p.id === problemToSave.id);

      const updatedFields: Partial<ProblemData> = {};

      for (const key of Object.keys(problemToSave) as Array<keyof ProblemData>) {
        if (key === 'id' || key === 'moderatorName' || key === 'createdAt') continue;

        const valueToSave = problemToSave[key];
        const originalValue = originalProblem?.[key];

        if (valueToSave instanceof Date) {
          if (originalValue instanceof Date) {
            if (valueToSave.getTime() !== originalValue.getTime()) {
              updatedFields[key] = valueToSave;
            }
          } else {
            updatedFields[key] = valueToSave;
          }
        } else if (Array.isArray(valueToSave)) {
          const sortedValueToSave = [...valueToSave].sort();
          const sortedOriginalValue = Array.isArray(originalValue) ? [...originalValue].sort() : [];
          if (!arraysEqual(sortedValueToSave, sortedOriginalValue)) {
            updatedFields[key] = valueToSave;
          }
        } else {
          const comparableValueToSave = valueToSave === undefined ? null : valueToSave;
          const comparableOriginalValue = originalValue === undefined ? null : originalValue;

          if (comparableValueToSave !== comparableOriginalValue) {
            updatedFields[key] = comparableValueToSave;
          }
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        await updateDoc(problemRef, updatedFields);
        toast.success("Бодлого амжилттай хадгалагдлаа!");
      } else {
        toast.info("Өөрчлөгдсөн зүйл байхгүй тул хадгалах шаардлагагүй.");
      }

      setIsEditing(false);
      setSaveLoading(false);
      setProblems(prevProblems => prevProblems.map(problem => problem.id === problemToSave.id ? problemToSave : problem));
      setSelectedProblem(problemToSave);

    } catch (err: unknown) {
      console.error("Бодлого хадгалахад алдаа гарлаа:", err);
      setError("Бодлого хадгалахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
      toast.error("Бодлого хадгалахад алдаа гарлаа.");
      setSaveLoading(false);
    }
  };
  
  // ---> Устгах функц
  const handleDeleteProblem = async (problemId: string) => {
    if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
        toast.error("Устгах эрх байхгүй байна.");
        return;
    }

    const problemToDelete = problems.find(p => p.id === problemId);
    if (!problemToDelete) {
        toast.error("Устгах бодлого олдсонгүй.");
        return;
    }

    if (user.role === 'moderator' && problemToDelete.moderatorUid !== user.uid) {
        toast.error("Та зөвхөн өөрийн үүсгэсэн бодлогыг устгах боломжтой.");
        return;
    }

    try {
        await deleteDoc(doc(db, 'problems', problemId));
        toast.success("Бодлого амжилттай устгагдлаа!");

        setProblems(prevProblems => prevProblems.filter(problem => problem.id !== problemId));
        setSelectedProblem(null);

        setTotalItemsCount(prevCount => (prevCount !== null ? prevCount - 1 : null));

    } catch (err: unknown) {
        console.error("Бодлого устгахад алдаа гарлаа:", err);
        setError("Бодлого устгахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
        toast.error("Бодлого устгахад алдаа гарлаа.");
    }
};
  // <--- Устгах функц дуусна

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
          <CardTitle className="text-center">Бодлогын жагсаалт</CardTitle>
          <CardDescription className="text-center">Бүх бодлогын жагсаалт болон хуудаслалт.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          {error && (
            <div className="text-red-500 text-center p-4">
              Алдаа: {error}
            </div>
          )}
          {loadingProblems ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-450px)]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <p className="text-sm text-gray-500 mt-2">Бодлогуудыг ачаалж байна...</p>
              <Skeleton className="h-[200px] w-[90%] mt-4" />
            </div>
          ) : (
            <>
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
                <div className="mb-2">
                  <Label htmlFor="topic-filter" className="text-sm">Бүлэг:</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх бүлэг" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх бүлэг</SelectItem>
                      {topicOptions.map(topic => (
                        <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mb-2">
                  <Label htmlFor="subtopic-filter" className="text-sm">Дэд бүлэг:</Label>
                  <Select
                    value={selectedSubtopic}
                    onValueChange={setSelectedSubtopic}
                    disabled={selectedTopic === 'all' || subtopicOptions.length === 0}
                  >
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх дэд бүлэг" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх дэд бүлэг</SelectItem>
                      {subtopicOptions.map(subtopic => (
                        <SelectItem key={subtopic.id} value={subtopic.name}>{subtopic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mb-2">
                  <Label htmlFor="problem-type-filter" className="text-sm">Бодлогын төрөл:</Label>
                  <Select value={selectedProblemType} onValueChange={setSelectedProblemType}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх төрөл" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх төрөл</SelectItem>
                      {problemTypeOptions.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    setSelectedDifficulty('all');
                    setSelectedProblemType('all');
                    setSelectedTopic('all');
                    setSelectedSubtopic('all');
                    setCurrentPage(1);
                    setSelectedProblem(null);
                    setIsEditing(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 w-full text-xs"
                >
                  Филтер цэвэрлэх
                </Button>
              </div>

              {problems.length === 0 && !loadingProblems ? (
                <p className="p-4 text-center text-gray-500">Бодлого олдсонгүй.</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-450px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Гарчиг</TableHead>
                        <TableHead>Бодлого</TableHead>
                        <TableHead className="w-[120px]">Модератор</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problems.map((problem) => (
                        <TableRow
                          key={problem.id}
                          onClick={() => {
                            setSelectedProblem(problem);
                            setIsEditing(false);
                          }}
                          className={`cursor-pointer hover:bg-gray-100 ${
                            selectedProblem?.id === problem.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <TableCell className="font-medium">{problem.title}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm"><LatexRenderer text={problem.problemText} /></TableCell>
                          <TableCell className="truncate text-sm">{problem.moderatorName}</TableCell>
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
                    disabled={isFirstPage || loadingProblems}
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
                    disabled={isLastPage || totalPages === 0 || loadingProblems}
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
          <CardTitle className="text-center">Сонгосон бодлогын дэлгэрэнгүй мэдээлэл</CardTitle>
          <CardDescription className="text-center">Сонгосон бодлогын бүх талбарууд.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4">
          {!selectedProblem ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Дэлгэрэнгүй мэдээлэл харахын тулд зүүн талаас бодлого сонгоно уу.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 flex justify-end gap-2">
                {!isEditing ? (
                  (user && (user.role === 'admin' || (user.role === 'moderator' && selectedProblem.moderatorUid === user.uid))) ? (
                    <>
                      <Button onClick={() => { setIsEditing(true); setEditingProblem({ ...selectedProblem }); }} variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" /> Засах
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" /> Устгах
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Та үнэхээр устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Энэ үйлдлийг буцаах боломжгүй. Бодлого болон түүний бүх холбогдох мэдээлэл бүрмөсөн устгагдана.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void handleDeleteProblem(selectedProblem.id)}>
                              Үргэлжлүүлэх
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <Edit className="mr-2 h-4 w-4" /> Засах боломжгүй
                    </Button>
                  )
                ) : (
                  <div className="space-x-2">
                    <Button onClick={() => {
                        if (editingProblem) {
                            void handleSaveProblem(editingProblem);
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
                      <td className="pr-2 py-1 font-semibold">Гарчиг:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editingProblem?.title || ''}
                            onChange={(e) => setEditingProblem(prev => prev ? { ...prev, title: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedProblem.title || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Төрөл:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingProblem?.problemType || ''}
                            onValueChange={(value) => setEditingProblem(prev => prev ? { ...prev, problemType: value } : null)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              {problemTypeOptions.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedProblem.problemType || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Бүлэг:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingProblem?.topic || 'all'}
                            onValueChange={(value) => {
                              setEditingProblem(prev => prev ? { ...prev, topic: value === 'all' ? null : value, subtopic: null } : null)
                            }}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Сонгохгүй</SelectItem>
                              {topicOptions.map(topic => (
                                <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedProblem.topic || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Дэд бүлэг:</td>
                      <td className="py-1">
                          {isEditing ? (
                            <Select
                              value={editingProblem?.subtopic || 'all'}
                              onValueChange={(value) => {
                                setEditingProblem(prev => prev ? { ...prev, subtopic: value === 'all' ? null : value } : null)
                              }}
                              disabled={!editingProblem?.topic || subtopicOptions.length === 0}
                            >
                              <SelectTrigger className="h-8 w-[120px] text-xs">
                                <SelectValue placeholder="Сонгох" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Сонгохгүй</SelectItem>
                                {subtopicOptions.map(subtopic => (
                                  <SelectItem key={subtopic.id} value={subtopic.name}>{subtopic.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            selectedProblem.subtopic || '-'
                          )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Хүндрэл:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingProblem?.difficulty || ''}
                            onValueChange={(value) => setEditingProblem(prev => prev ? { ...prev, difficulty: value } : null)}
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
                          selectedProblem.difficulty || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Оноо:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingProblem?.score || 0}
                            onChange={(e) => setEditingProblem(prev => prev ? { ...prev, score: Number(e.target.value) } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedProblem.score || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Эх сурвалж:</td>
                      <td className="py-1" colSpan={3}>
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editingProblem?.references || ''}
                            onChange={(e) => setEditingProblem(prev => prev ? { ...prev, references: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedProblem.references || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Үүсгэсэн огноо:</td>
                      <td className="py-1" colSpan={3}>
                        {selectedProblem.createdAt && selectedProblem.createdAt instanceof Date ? selectedProblem.createdAt.toLocaleDateString() + ' ' + selectedProblem.createdAt.toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p><b>Модератор:</b> {selectedProblem.moderatorName}</p>
              <p><b>Бодлого:</b></p>
              {isEditing ? (
                  <Textarea
                    value={editingProblem?.problemText || ''}
                    onChange={(e) => setEditingProblem(prev => prev ? { ...prev, problemText: e.target.value } : null)}
                    rows={4}
                    className="text-sm"
                  />
              ) : (
                  <LatexRenderer text={selectedProblem.problemText} />
              )}

              {selectedProblem.problemImage && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold text-gray-700">Бодлогын зураг:</h3>
                  <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-md bg-gray-100">
                  {getR2PublicImageUrl(selectedProblem.problemImage) ? (
                        <Image
                          src={getR2PublicImageUrl(selectedProblem.problemImage)!}
                          alt={`Бодлогын зураг: ${selectedProblem.title}`}
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

              <p className="font-semibold text-green-600">Зөв хариулт:</p>
              {isEditing ? (
                  <Textarea
                    value={editingProblem?.correctAnswerInput || ''}
                    onChange={(e) => setEditingProblem(prev => prev ? { ...prev, correctAnswerInput: e.target.value } : null)}
                    rows={2}
                    className="text-sm"
                  />
              ) : (
                  <LatexRenderer text={selectedProblem.correctAnswerInput || '-'} />
              )}

              {selectedProblem.answerHint && (
                <div>
                  <p><b>Хариултын заавар / зөвлөгөө:</b></p>
                  {isEditing ? (
                      <Textarea
                        value={editingProblem?.answerHint || ''}
                        onChange={(e) => setEditingProblem(prev => prev ? { ...prev, answerHint: e.target.value } : null)}
                        rows={2}
                        className="text-sm"
                      />
                  ) : (
                      <LatexRenderer text={selectedProblem.answerHint} />
                  )}
                </div>
              )}

              {selectedProblem.solutionText && (
                <div>
                  <p><b>Бодолт:</b></p>
                  {isEditing ? (
                      <Textarea
                        value={editingProblem?.solutionText || ''}
                        onChange={(e) => setEditingProblem(prev => prev ? { ...prev, solutionText: e.target.value } : null)}
                        rows={4}
                        className="text-sm"
                      />
                  ) : (
                      <LatexRenderer text={selectedProblem.solutionText} />
                  )}
                </div>
              )}
              {selectedProblem.solutionImage && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold text-gray-700">Бодолтын зураг:</h3>
                  <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-md bg-gray-100">
                  {getR2PublicImageUrl(selectedProblem.solutionImage) ? (
                    <Image
                      src={getR2PublicImageUrl(selectedProblem.solutionImage)!}
                      alt={`Бодолтын зураг: ${selectedProblem.title}`}
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
              {selectedProblem.tags && selectedProblem.tags.length > 0 && (
                <div>
                  <p><b>Түлхүүр үгс:</b></p>
                  {isEditing ? (
                    <Textarea
                      value={editingProblem?.tags?.join(', ') || ''}
                      onChange={(e) => setEditingProblem(prev => prev ? { ...prev, tags: e.target.value.split(',').map(tag => tag.trim()) } : null)}
                      rows={1}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-gray-700">{selectedProblem.tags.join(', ')}</p>
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
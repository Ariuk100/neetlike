

// moderator/exams/view/page.tsx
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
  DocumentSnapshot,
  deleteDoc,
  getCountFromServer,
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
import { ArrowLeft, ArrowRight, Edit, Save, XCircle, Loader2, Trash2, PlusCircle, Archive, RotateCcw } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { Timestamp } from 'firebase/firestore';

// Шалгалтын төрлүүд
type ExamType = 'Түвшин тогтоох' | 'Уралдаант' | 'ЭЕШ' | 'Олимпиад' | 'Бусад' | '';
type ExamStatus = 'active' | 'inactive' | 'archived';

interface ExamQuestion {
  id: string;
  collection: 'test' | 'problems';
  score: number;
}

interface ExamViewData {
  id: string;
  title: string;
  description: string;
  examType: ExamType;
  subject: string;
  topic: string | null;
  subtopic: string | null;
  timeLimit: number;
  totalScore: number;
  examDate: string;
  questions: ExamQuestion[];
  status: ExamStatus;
  createdAt: Timestamp;
  moderatorUid: string;
  moderatorName?: string;
  // `any` төрлийг хэрэглэхгүй байхын тулд нэмэлт талбаруудыг энд тодорхойлох
}

interface FilterOption {
  id: string;
  name: string;
}

const convertToDate = (timestamp: Timestamp | undefined | null): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return undefined;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function ModeratorExamsViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<ExamViewData[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedExam, setSelectedExam] = useState<ExamViewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
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
  const [editingExam, setEditingExam] = useState<ExamViewData | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // AlertDialog-н төлөвүүд
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [examToActOn, setExamToActOn] = useState<{ id: string; status: ExamStatus; moderatorUid: string } | null>(null);

  // Филтерүүдийн төлөв
  const [selectedModerator, setSelectedModerator] = useState<string>('all');
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Филтер сонголтууд
  const [moderatorOptions, setModeratorOptions] = useState<{ uid: string; name: string }[]>([]);
  const [examTypeOptions] = useState<ExamType[]>([
    'Түвшин тогтоох',
    'Уралдаант',
    'ЭЕШ',
    'Олимпиад',
    'Бусад',
  ]);
 
  const [topicOptions, setTopicOptions] = useState<FilterOption[]>([]);
  const [subtopicOptions, setSubtopicOptions] = useState<FilterOption[]>([]);


  // Хэрэглэгчийн эрхийг шалгах
  useEffect(() => {
    const allowedRoles = ['moderator', 'admin'];
    if (!authLoading && (!user || !(user.role && allowedRoles.includes(user.role)))) {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Филтерийн сонголтуудыг татах
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

  // Сонгосон бүлэг өөрчлөгдөхөд дэд сэдвүүдийг татах
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

        const subtopicsColRef = collection(db, 'subchapters');
        const qSubtopics = query(subtopicsColRef, where('chapterId', '==', selectedTopicDoc.id), orderBy('name', 'asc'));
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


  // Шалгалтуудыг Firebase-ээс татах үндсэн функц
  const fetchExams = useCallback(async () => {
    if (!db || !user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      setLoadingExams(false);
      return;
    }

    setLoadingExams(true);
    setError(null);
    setExams([]);
    setSelectedExam(null);

    const examsColRef = collection(db, 'exams');
    let baseQuery = query(examsColRef, orderBy('createdAt', 'desc'));

    // Филтерүүдийг нэмэх
    if (selectedModerator !== 'all') {
      baseQuery = query(baseQuery, where('moderatorUid', '==', selectedModerator));
    }
    if (selectedExamType !== 'all') {
      baseQuery = query(baseQuery, where('examType', '==', selectedExamType));
    }
    if (selectedTopic !== 'all') {
      baseQuery = query(baseQuery, where('topic', '==', selectedTopic));
    }
    if (selectedSubtopic !== 'all') {
      baseQuery = query(baseQuery, where('subtopic', '==', selectedSubtopic));
    }
    if (selectedStatus !== 'all') {
      baseQuery = query(baseQuery, where('status', '==', selectedStatus));
    }

    let paginatedQuery;
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
      const fetchedExams: ExamViewData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const examItem: ExamViewData = {
          id: docSnap.id,
          title: data.title || 'Гарчиггүй',
          description: data.description || 'Тайлбаргүй',
          examType: data.examType as ExamType || '',
          subject: data.subject || '',
          topic: (data.topic as string | null) || null,
          subtopic: (data.subtopic as string | null) || null,
          timeLimit: data.timeLimit || 0,
          totalScore: data.totalScore || 0,
          examDate: data.examDate || '',
          questions: (Array.isArray(data.questions) ? data.questions : []) as ExamQuestion[],
          status: (data.status as ExamStatus) || 'active',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromDate(new Date()),
          moderatorUid: data.moderatorUid || 'Үл мэдэгдэх UID',
        };
        fetchedExams.push(examItem);
      });

      const moderatorNamesMap = new Map<string, string>();
      moderatorOptions.forEach(mod => moderatorNamesMap.set(mod.uid, mod.name));
      const examsWithNames = fetchedExams.map(exam => ({
        ...exam,
        moderatorName: moderatorNamesMap.get(exam.moderatorUid) || exam.moderatorUid.substring(0, 8) + '...'
      }));

      setExams(examsWithNames);

      if (snapshot.docs.length > 0) {
        setFirstVisible(snapshot.docs[0]);
        const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
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

      if (totalItemsCount === null || selectedModerator !== 'all' || selectedExamType !== 'all' || selectedTopic !== 'all' || selectedSubtopic !== 'all' || selectedStatus !== 'all') {
        const countSnapshot = await getCountFromServer(baseQuery);
        setTotalItemsCount(countSnapshot.data().count);
      }

    } catch (err) {
      console.error("Error fetching exams:", err);
      setError("Шалгалтуудыг татахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingExams(false);
    }
  }, [currentPage, itemsPerPage, user, selectedModerator, selectedExamType, selectedTopic, selectedSubtopic, selectedStatus, moderatorOptions, totalItemsCount]);

  // Шүүлтүүрүүд болон хуудас өөрчлөгдөхөд шалгалтуудыг дахин татах
  useEffect(() => {
    fetchExams();
  }, [currentPage, itemsPerPage, selectedModerator, selectedExamType, selectedTopic, selectedSubtopic, selectedStatus, fetchExams]);

  // Филтерүүд өөрчлөгдөхөд хуудаслалтын төлөвийг шинэчлэх
  useEffect(() => {
    pageCache.current.clear();
    orderedPageSnapshots.current = [];
    setTotalItemsCount(null);
    setCurrentPage(1);
    setSelectedExam(null);
    setIsEditing(false);
  }, [selectedModerator, selectedExamType, selectedTopic, selectedSubtopic, selectedStatus]);


  const totalPages = totalItemsCount ? Math.ceil(totalItemsCount / itemsPerPage) : 1;

  // Хуудас солих функц
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (loadingExams) return;
    if (direction === 'next') {
        if (!isLastPage) {
            setCurrentPage(prev => prev + 1);
        }
    } else {
        if (!isFirstPage) {
            setCurrentPage(prev => Math.max(1, prev - 1));
        }
    }
    setSelectedExam(null);
    setIsEditing(false);
  };

  // Нэг хуудсанд харуулах зүйлийн тоог өөрчлөх функц
  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value));
    pageCache.current.clear();
    orderedPageSnapshots.current = [];
    setTotalItemsCount(null);
    setCurrentPage(1);
    setSelectedExam(null);
    setIsEditing(false);
  }, []);

  // Шалгалтыг хадгалах функц
  const handleSaveExam = async (examToSave: ExamViewData) => {
    if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      toast.error("Хадгалах эрх байхгүй байна.");
      return;
    }
    if (user.role === 'moderator' && examToSave.moderatorUid !== user.uid) {
        toast.error("Та зөвхөн өөрийн үүсгэсэн шалгалтыг засварлах боломжтой.");
        return;
    }

    if (!examToSave.id) {
      toast.error("Засах шалгалтын ID олдсонгүй.");
      return;
    }

    setSaveLoading(true);
    try {
      const examRef = doc(db, 'exams', examToSave.id);
      const originalExam = exams.find(e => e.id === examToSave.id);

      const updatedFields: Partial<ExamViewData> = {};

      for (const key of Object.keys(examToSave) as Array<keyof ExamViewData>) {
        if (key === 'id' || key === 'moderatorName' || key === 'createdAt') continue;

        const valueToSave = examToSave[key];
        const originalValue = originalExam?.[key];

        if (JSON.stringify(valueToSave) !== JSON.stringify(originalValue)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updatedFields[key] = valueToSave as any; // Firestore updateDoc нь `any` хүлээн авдаг тул түр ашиглав.
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        await updateDoc(examRef, updatedFields);
        toast.success("Шалгалт амжилттай хадгалагдлаа!");
      } else {
        toast.info("Өөрчлөгдсөн зүйл байхгүй тул хадгалах шаардлагагүй.");
      }

      setIsEditing(false);
      setSaveLoading(false);
      setExams(prevExams => prevExams.map(exam => exam.id === examToSave.id ? examToSave : exam));
      setSelectedExam(examToSave);

    } catch (err: unknown) {
      console.error("Шалгалт хадгалахад алдаа гарлаа:", err);
      toast.error("Шалгалт хадгалахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
      setSaveLoading(false);
    }
  };

  // Шалгалт устгах функц
  const handleDeleteExam = async () => {
    if (!examToActOn) return;

    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'exams', examToActOn.id));
      toast.success('Шалгалт амжилттай устгагдлаа!');
      setSelectedExam(null);
      fetchExams();
    } catch (err: unknown) {
      console.error("Шалгалт устгахад алдаа гарлаа:", err);
      toast.error("Шалгалт устгахад алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleteLoading(false);
      setIsDeleteDialogOpen(false);
      setExamToActOn(null);
    }
  };

  // Шалгалтын төлөвийг архивлах/архиваас гаргах функц
  const handleToggleArchive = async () => {
    if (!examToActOn) return;

    const { id, status } = examToActOn;

    setArchiveLoading(true);
    try {
      const newStatus: ExamStatus = status === 'archived' ? 'active' : 'archived';
      const examRef = doc(db, 'exams', id);
      await updateDoc(examRef, { status: newStatus });
      toast.success(`Шалгалтын төлөв амжилттай ${newStatus === 'archived' ? 'архивлагдлаа' : 'идэвхтэй болголоо'}!`);
      setExams(prevExams => prevExams.map(exam => exam.id === id ? { ...exam, status: newStatus } : exam));
      if (selectedExam && selectedExam.id === id) {
        setSelectedExam(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: unknown) {
      console.error("Шалгалтын төлөвийг өөрчлөхөд алдаа гарлаа:", err);
      toast.error("Шалгалтын төлөвийг өөрчлөхөд алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setArchiveLoading(false);
      setIsArchiveDialogOpen(false);
      setExamToActOn(null);
    }
  };


  // Асуултын мэдээллийг шинэчлэх (засах горимд)
  const handleEditingQuestionChange = useCallback(
    (index: number, field: keyof ExamQuestion, value: string | number) => {
      setEditingExam((prev) => {
        if (!prev) return null;
        const newQuestions = [...prev.questions];
        
        if (field === 'score') {
          newQuestions[index] = { ...newQuestions[index], [field]: Number(value) };
        } else if (field === 'collection') {
          newQuestions[index] = { ...newQuestions[index], [field]: value as 'test' | 'problems' };
        } else if (field === 'id') {
          newQuestions[index] = { ...newQuestions[index], [field]: value.toString() };
        }
        else {
          newQuestions[index] = { ...newQuestions[index], [field]: value };
        }
        const calculatedTotalScore = newQuestions.reduce((sum, q) => sum + q.score, 0);
        return { ...prev, questions: newQuestions, totalScore: calculatedTotalScore };
      });
    },
    [],
  );

  // Засах горимд асуулт нэмэх
  const handleAddEditingQuestion = useCallback(() => {
    setEditingExam((prev) => {
      if (!prev) return null;
      const newQuestions = [...prev.questions, { id: '', collection: 'test' as const, score: 0 }];
      const calculatedTotalScore = newQuestions.reduce((sum, q) => sum + q.score, 0);
      return { ...prev, questions: newQuestions, totalScore: calculatedTotalScore };
    });
  }, []);

  // Засах горимд асуулт устгах
  const handleRemoveEditingQuestion = useCallback((index: number) => {
    setEditingExam((prev) => {
      if (!prev) return null;
      const newQuestions = [...prev.questions];
      newQuestions.splice(index, 1);
      const calculatedTotalScore = newQuestions.reduce((sum, q) => sum + q.score, 0);
      return { ...prev, questions: newQuestions, totalScore: calculatedTotalScore };
    });
  }, []);

  const confirmDelete = (examId: string, moderatorUid: string) => {
      if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
          toast.error("Устгах эрх байхгүй байна.");
          return;
      }
      if (user.role === 'moderator' && moderatorUid !== user.uid) {
          toast.error("Та зөвхөн өөрийн үүсгэсэн шалгалтыг устгах боломжтой.");
          return;
      }
      setExamToActOn({ id: examId, status: 'active', moderatorUid });
      setIsDeleteDialogOpen(true);
  };

  const confirmArchive = (examId: string, currentStatus: ExamStatus, moderatorUid: string) => {
      if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
          toast.error("Төлөв өөрчлөх эрх байхгүй байна.");
          return;
      }
      if (user.role === 'moderator' && moderatorUid !== user.uid) {
          toast.error("Та зөвхөн өөрийн үүсгэсэн шалгалтын төлөвийг өөрчлөх боломжтой.");
          return;
      }
      setExamToActOn({ id: examId, status: currentStatus, moderatorUid });
      setIsArchiveDialogOpen(true);
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
          <CardTitle className="text-center">Шалгалтын жагсаалт</CardTitle>
          <CardDescription className="text-center">Бүх шалгалтын жагсаалт болон хуудаслалт.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          {error && (
            <div className="text-red-500 text-center p-4">
              Алдаа: {error}
            </div>
          )}
          {loadingExams ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-450px)]">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <p className="text-sm text-gray-500 mt-2">Шалгалтуудыг ачаалж байна...</p>
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
                <div className="mb-2">
                  <Label htmlFor="exam-type-filter" className="text-sm">Шалгалтын төрөл:</Label>
                  <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх төрөл" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх төрөл</SelectItem>
                      {examTypeOptions.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <Label htmlFor="status-filter" className="text-sm">Төлөв:</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full text-xs h-8">
                      <SelectValue placeholder="Бүх төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Бүх төлөв</SelectItem>
                      <SelectItem value="active">Идэвхтэй</SelectItem>
                      <SelectItem value="inactive">Идэвхгүй</SelectItem>
                      <SelectItem value="archived">Архивлагдсан</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    setSelectedModerator('all');
                    setSelectedExamType('all');
                    setSelectedTopic('all');
                    setSelectedSubtopic('all');
                    setSelectedStatus('all');
                    setCurrentPage(1);
                    setSelectedExam(null);
                    setIsEditing(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 w-full text-xs"
                >
                  Филтер цэвэрлэх
                </Button>
              </div>

              {exams.length === 0 && !loadingExams ? (
                <p className="p-4 text-center text-gray-500">Шалгалт олдсонгүй.</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-450px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Гарчиг</TableHead>
                        <TableHead>Төрөл</TableHead>
                        <TableHead className="w-[120px]">Модератор</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.map((exam) => (
                        <TableRow
                          key={exam.id}
                          onClick={() => {
                            setSelectedExam(exam);
                            setIsEditing(false);
                          }}
                          className={`cursor-pointer hover:bg-gray-100 ${
                            selectedExam?.id === exam.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <TableCell className="font-medium">{exam.title}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm">{exam.examType}</TableCell>
                          <TableCell className="truncate text-sm">{exam.moderatorName}</TableCell>
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
                      {ITEMS_PER_PAGE_OPTIONS.map(num => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange('prev')}
                    disabled={isFirstPage || loadingExams}
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
                    disabled={isLastPage || totalPages === 0 || loadingExams}
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
          <CardTitle className="text-center">Сонгосон шалгалтын дэлгэрэнгүй мэдээлэл</CardTitle>
          <CardDescription className="text-center">Сонгосон шалгалтын бүх талбарууд.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4">
          {!selectedExam ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              Дэлгэрэнгүй мэдээлэл харахын тулд зүүн талаас шалгалт сонгоно уу.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 flex justify-end gap-2">
                  {!isEditing ? (
                      (user && (user.role === 'admin' || (user.role === 'moderator' && selectedExam.moderatorUid === user.uid))) ? (
                          <>
                            <Button onClick={() => { setIsEditing(true); setEditingExam({ ...selectedExam }); }} variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" /> Засах
                            </Button>
                            <Button
                                onClick={() => confirmArchive(selectedExam.id, selectedExam.status, selectedExam.moderatorUid)}
                                variant="outline"
                                size="sm"
                                disabled={archiveLoading}
                            >
                                {archiveLoading ? 'Ачаалж байна...' : selectedExam.status === 'archived' ? <><RotateCcw className="mr-2 h-4 w-4" /> Архиваас гаргах</> : <><Archive className="mr-2 h-4 w-4" /> Архивлах</>}
                            </Button>
                            <Button
                                onClick={() => confirmDelete(selectedExam.id, selectedExam.moderatorUid)}
                                variant="destructive"
                                size="sm"
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'Устгаж байна...' : <><Trash2 className="mr-2 h-4 w-4" /> Устгах</>}
                            </Button>
                          </>
                      ) : (
                          <>
                            <Button variant="outline" size="sm" disabled>
                                <Edit className="mr-2 h-4 w-4" /> Засах боломжгүй
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                                {selectedExam.status === 'archived' ? <><RotateCcw className="mr-2 h-4 w-4" /> Архиваас гаргах</> : <><Archive className="mr-2 h-4 w-4" /> Архивлах</>}
                            </Button>
                            <Button variant="destructive" size="sm" disabled>
                                <Trash2 className="mr-2 h-4 w-4" /> Устгах боломжгүй
                            </Button>
                          </>
                      )
                  ) : (
                      <div className="space-x-2">
                          <Button onClick={() => {
                              if (editingExam) {
                                  void handleSaveExam(editingExam);
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
                            value={editingExam?.title || ''}
                            onChange={(e) => setEditingExam(prev => prev ? { ...prev, title: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedExam.title || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Төрөл:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingExam?.examType || ''}
                            onValueChange={(value: ExamType) => setEditingExam(prev => prev ? { ...prev, examType: value } : null)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                              {examTypeOptions.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedExam.examType || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Хичээл:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="text"
                            value={editingExam?.subject || ''}
                            onChange={(e) => setEditingExam(prev => prev ? { ...prev, subject: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedExam.subject || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Бүлэг:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingExam?.topic || 'all'}
                            onValueChange={(value) => {
                              setEditingExam(prev => prev ? { ...prev, topic: value === 'all' ? null : value, subtopic: null } : null)
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
                          selectedExam.topic || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Дэд бүлэг:</td>
                      <td className="py-1">
                          {isEditing ? (
                            <Select
                              value={editingExam?.subtopic || 'all'}
                              onValueChange={(value) => {
                                setEditingExam(prev => prev ? { ...prev, subtopic: value === 'all' ? null : value } : null)
                              }}
                              disabled={!editingExam?.topic || subtopicOptions.length === 0}
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
                            selectedExam.subtopic || '-'
                          )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Хугацаа:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingExam?.timeLimit || 0}
                            onChange={(e) => setEditingExam(prev => prev ? { ...prev, timeLimit: Number(e.target.value) } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedExam.timeLimit !== undefined ? `${selectedExam.timeLimit} сек` : '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Нийт оноо:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingExam?.totalScore || 0}
                            onChange={(e) => setEditingExam(prev => prev ? { ...prev, totalScore: Number(e.target.value) } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedExam.totalScore || '-'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Огноо:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editingExam?.examDate || ''}
                            onChange={(e) => setEditingExam(prev => prev ? { ...prev, examDate: e.target.value } : null)}
                            className="h-8 text-sm"
                          />
                        ) : (
                          selectedExam.examDate || '-'
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-2 py-1 font-semibold">Төлөв:</td>
                      <td className="py-1">
                        {isEditing ? (
                          <Select
                            value={editingExam?.status || 'active'}
                            onValueChange={(value: ExamStatus) => setEditingExam(prev => prev ? { ...prev, status: value } : null)}
                          >
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                              <SelectValue placeholder="Төлөв сонгоно уу" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Идэвхтэй</SelectItem>
                              <SelectItem value="inactive">Идэвхгүй</SelectItem>
                              <SelectItem value="archived">Архивлагдсан</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedExam.status === 'active' ? 'Идэвхтэй' : selectedExam.status === 'inactive' ? 'Идэвхгүй' : 'Архивлагдсан'
                        )}
                      </td>
                      <td className="pr-2 py-1 font-semibold">Үүсгэсэн огноо:</td>
                      <td className="py-1">
                        {convertToDate(selectedExam.createdAt)?.toLocaleDateString() + ' ' + convertToDate(selectedExam.createdAt)?.toLocaleTimeString() || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p><b>Тайлбар:</b> {isEditing ? (
                  <Textarea
                    value={editingExam?.description || ''}
                    onChange={(e) => setEditingExam(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={3}
                    className="text-sm"
                  />
              ) : (
                  selectedExam.description || '-'
              )}</p>
              <p><b>Модератор:</b> {selectedExam.moderatorName}</p>
              
              <div className="space-y-3 border p-4 rounded-md">
                <h3 className="text-lg font-semibold">Оруулсан асуултууд ({selectedExam.questions.length}):</h3>
                {selectedExam.questions.length === 0 ? (
                  <p className="text-gray-500">Асуулт оруулаагүй байна.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-2">
                    {isEditing ? (
                      <>
                        {editingExam?.questions.map((q, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Select
                              value={q.collection}
                              onValueChange={(value: 'test' | 'problems') => handleEditingQuestionChange(index, 'collection', value)}
                            >
                              <SelectTrigger className="w-[100px] text-xs h-8">
                                <SelectValue placeholder="Коллекц" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="test">Тест</SelectItem>
                                <SelectItem value="problems">Бодлого</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Асуултын ID"
                              value={q.id}
                              onChange={(e) => handleEditingQuestionChange(index, 'id', e.target.value)}
                              className="flex-grow h-8 text-sm"
                            />
                            <Input
                              type="number"
                              placeholder="Оноо"
                              value={q.score}
                              onChange={(e) => handleEditingQuestionChange(index, 'score', Number(e.target.value))}
                              className="w-[80px] h-8 text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveEditingQuestion(index)}
                              className="h-8 w-8"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </li>
                        ))}
                        <Button type="button" onClick={handleAddEditingQuestion} variant="outline" size="sm" className="mt-2">
                          <PlusCircle className="mr-2 h-4 w-4" /> Асуулт нэмэх
                        </Button>
                      </>
                    ) : (
                      selectedExam.questions.map((q, index) => (
                        <li key={index}>
                          Коллекц: {q.collection === 'test' ? 'Тест' : 'Бодлого'}, ID: {q.id}, Оноо: {q.score}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Шалгалт устгах баталгаажуулах цонх */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Та үнэхээр устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Энэ үйлдлийг буцаах боломжгүй. Энэ нь таны шалгалтын мэдээллийг Firebase-ээс бүр мөсөн устгана.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setExamToActOn(null); }}>Цуцлах</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteExam} className="bg-red-600 hover:bg-red-700">
                      Устгах
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Шалгалт архивлах/архиваас гаргах баталгаажуулах цонх */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Та үнэхээр төлөвийг өөрчлөхдөө итгэлтэй байна уу?</AlertDialogTitle>
                  <AlertDialogDescription>
                      {examToActOn?.status === 'archived' ? 'Та энэ шалгалтыг архиваас гаргаж идэвхтэй болгох гэж байна.' : 'Та энэ шалгалтыг архивлах гэж байна. Энэ нь хэрэглэгчдэд харагдахгүй болно.'}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setIsArchiveDialogOpen(false); setExamToActOn(null); }}>Цуцлах</AlertDialogCancel>
                  <AlertDialogAction onClick={handleToggleArchive}>
                      {examToActOn?.status === 'archived' ? 'Архиваас гаргах' : 'Архивлах'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
// moderator/exams/add/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where, // where-г нэмсэн
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCacheContext } from '@/lib/CacheContext';
import { PlusCircle, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch'; // Switch компонентийг импортлосон

// --- Төрлийн тодорхойлолтууд ---
// type DifficultyLevel = 'Амархан' | 'Дунд' | 'Хүнд' | ''; // Устгасан
type ExamType = 'Түвшин тогтоох' | 'Уралдаант' | 'ЭЕШ' | 'Олимпиад' | 'Бусад' | '';

interface Chapter {
  id: string;
  name: string;
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string;
}

interface ExamQuestion {
  id: string; // Асуулт эсвэл бодлогын ID (Firebase document ID)
  collection: 'test' | 'problems'; // Аль коллекцоос ирсэн бэ
  score: number; // Энэ шалгалтад тухайн асуултын оноо
}

interface FormData {
  title: string;
  description: string;
  examType: ExamType;
  subject: string;
  topic: string; // Бүлгийн нэр
  subtopic: string; // Дэд бүлгийн нэр
  // difficulty: DifficultyLevel; // Устгасан
  timeLimit: number; // Нийт хугацаа секундээр
  totalScore: number; // Нийт оноо
  examDate: string; // Шалгалтын огноо (YYYY-MM-DD)
  questions: ExamQuestion[]; // Шалгалтын асуултууд
  isActive: boolean; // Шалгалтын идэвхтэй/идэвхгүй төлөв
}

// --- Кэшийн түлхүүрүүд ---
const FORM_CACHE_KEY = 'moderatorExamAddForm';
const CHAPTERS_CACHE_KEY = 'cachedChaptersForExams';
const SUBCHAPTERS_CACHE_KEY_PREFIX = 'cachedSubchaptersForExams_';

export default function ModeratorExamsAddPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { get, set, remove } = useCacheContext();

  // Формын утгыг шинэчлэх функц
  const handleInputChange = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Формын анхны утга (кэшээс эсвэл default)
  const [form, setForm] = useState<FormData>(() => {
    const cachedForm = get<FormData>(FORM_CACHE_KEY);
    if (cachedForm) {
      return {
        ...cachedForm,
        subtopic: '', // Дэд сэдвийг кэшээс сэргээхгүй байх нь илүү дээр
      };
    }
    return {
      title: '',
      description: '',
      examType: '',
      subject: 'Физик',
      topic: '',
      subtopic: '',
      // difficulty: '', // Устгасан
      timeLimit: 0,
      totalScore: 0,
      examDate: new Date().toISOString().split('T')[0], // Одоогийн огноог default болгоно
      questions: [],
      isActive: true, // Анхны утга нь идэвхтэй
    };
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loadingSubchapters, setLoadingSubchapters] = useState<boolean>(false);

  // Хэрэглэгчийн эрхийг шалгах
  useEffect(() => {
    const allowedRoles = ['moderator', 'admin'];
    if (!authLoading && (!user || !(user.role && allowedRoles.includes(user.role)))) {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Формын өгөгдлийг кэшлэх useEffect
  useEffect(() => {
    set(FORM_CACHE_KEY, form, { expiryMs: 3600000 }); // 1 цаг кэшлэнэ
  }, [form, set]);

  // Бүлгүүдийг Firebase-ээс татаж, кэшлэх useEffect
  useEffect(() => {
    const fetchAndCacheChapters = async () => {
      const cachedChapters = get<Chapter[]>(CHAPTERS_CACHE_KEY);

      if (cachedChapters && cachedChapters.length > 0) {
        setChapters(cachedChapters);
        setLoadingChapters(false);
      } else {
        try {
          const querySnapshot = await getDocs(collection(db, 'chapters'));
          const fetchedChapters: Chapter[] = [];
          querySnapshot.forEach((doc) => {
            fetchedChapters.push({ id: doc.id, ...doc.data() } as Chapter);
          });
          setChapters(fetchedChapters);
          set(CHAPTERS_CACHE_KEY, fetchedChapters, { expiryMs: 86400000 }); // 24 цаг кэшлэнэ
        } catch (error) {
          console.error("Бүлгүүдийг татахад алдаа гарлаа:", error);
          toast.error("Бүлгүүдийг татахад алдаа гарлаа.");
        } finally {
          setLoadingChapters(false);
        }
      }
    };

    if (!authLoading && user && (user.role === 'moderator' || user.role === 'admin')) {
      fetchAndCacheChapters();
    }
  }, [get, set, authLoading, user]);

  // Дэд бүлгүүдийг Firebase-ээс татаж, кэшлэх useEffect (сонгогдсон бүлгээс хамаарч)
  useEffect(() => {
    const fetchAndCacheSubchapters = async () => {
      if (!form.topic) {
        setSubchapters([]);
        setLoadingSubchapters(false);
        return;
      }

      setLoadingSubchapters(true);

      const selectedChapter = chapters.find(chapter => chapter.name === form.topic);
      const chapterId = selectedChapter ? selectedChapter.id : null;

      if (!chapterId) {
        setSubchapters([]);
        setLoadingSubchapters(false);
        console.warn("Сонгосон бүлгийн ID олдсонгүй:", form.topic);
        return;
      }

      const cacheKey = `${SUBCHAPTERS_CACHE_KEY_PREFIX}${chapterId}`;
      const cachedSubchapters = get<Subchapter[]>(cacheKey);

      if (cachedSubchapters && cachedSubchapters.length > 0) {
        setSubchapters(cachedSubchapters);
        setLoadingSubchapters(false);
      } else {
        try {
          // ЭНД ӨӨРЧЛӨЛТ ОРЛОО: Өмнөх кодтой адил болгов.
          const q = query(collection(db, 'subchapters'), where('chapterId', '==', chapterId));
          const querySnapshot = await getDocs(q);
          const fetchedSubchapters: Subchapter[] = [];
          querySnapshot.forEach((doc) => {
            fetchedSubchapters.push({ id: doc.id, ...doc.data() } as Subchapter);
          });
          setSubchapters(fetchedSubchapters);
          set(cacheKey, fetchedSubchapters, { expiryMs: 86400000 }); // 24 цаг кэшлэнэ
        } catch (error) {
          console.error("Дэд бүлгүүдийг татахад алдаа гарлаа:", error);
          toast.error("Дэд бүлгүүдийг татахад алдаа гарлаа.");
        } finally {
          setLoadingSubchapters(false);
        }
      }
    };

    if (form.topic && chapters.length > 0) { // form.topic сонгогдсон, мөн chapters ачаалагдсан үед татна
      fetchAndCacheSubchapters();
    } else if (!form.topic) { // form.topic хоосон бол дэд бүлгийг цэвэрлэнэ
      setSubchapters([]);
      setLoadingSubchapters(false);
    }
  }, [form.topic, chapters, get, set]);

  // Сэдэв өөрчлөгдөхөд дэд сэдвийг хоослох (энэ useEffect-ийг дээрх логикт нэгтгэсэн тул давхардлыг шалгана)
  // useEffect(() => {
  //   handleInputChange('subtopic', '');
  //   if (!form.topic) {
  //     setSubchapters([]);
  //   }
  // }, [form.topic, handleInputChange]);


  // Асуулт нэмэх
  const handleAddQuestion = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, { id: '', collection: 'test', score: 0 }],
    }));
  }, []);

  // Асуулт устгах
  const handleRemoveQuestion = useCallback((index: number) => {
    setForm((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions.splice(index, 1);
      return { ...prev, questions: newQuestions };
    });
  }, []);

  // Асуултын мэдээллийг шинэчлэх
  const handleQuestionChange = useCallback(
    (index: number, field: keyof ExamQuestion, value: string | number) => {
      setForm((prev) => {
        const newQuestions = [...prev.questions];
        if (field === 'score') {
          newQuestions[index] = { ...newQuestions[index], [field]: Number(value) };
        } else {
          newQuestions[index] = { ...newQuestions[index], [field]: value };
        }
        return { ...prev, questions: newQuestions };
      });
    },
    [],
  );

  // Нийт оноог асуултуудын онооноос автоматаар тооцоолох
  useEffect(() => {
    const calculatedTotalScore = form.questions.reduce((sum, q) => sum + q.score, 0);
    if (form.totalScore !== calculatedTotalScore) {
      setForm(prev => ({ ...prev, totalScore: calculatedTotalScore }));
    }
  }, [form.questions, form.totalScore]);


  // Хадгалах функц
  const handleSaveExam = async () => {
    if (!user || !user.uid) {
      toast.error('Нэвтэрнэ үү.');
      return;
    }
    setIsSaving(true);
    try {
      // Шалгалтын өгөгдөл
      const examData = {
        title: form.title,
        description: form.description,
        examType: form.examType,
        subject: form.subject,
        topic: form.topic,
        subtopic: form.subtopic,
        // difficulty: form.difficulty, // Устгасан
        timeLimit: form.timeLimit,
        totalScore: form.totalScore,
        examDate: form.examDate, // String хэлбэрээр хадгална
        questions: form.questions,
        isActive: form.isActive, // Идэвхтэй/идэвхгүй төлөвийг хадгална
        createdAt: new Date(),
        moderatorUid: user.uid,
        status: 'draft', // Анхны төлөв: draft
      };

      // Firestore руу нэмэх
      await addDoc(collection(db, 'exams'), examData);
      toast.success('Шалгалт амжилттай хадгаллаа!');

      // Кэшийг цэвэрлэж, формыг хоослох
      remove(FORM_CACHE_KEY);
      setForm({
        title: '',
        description: '',
        examType: '',
        subject: 'Физик',
        topic: '',
        subtopic: '',
        // difficulty: '', // Устгасан
        timeLimit: 0,
        totalScore: 0,
        examDate: new Date().toISOString().split('T')[0],
        questions: [],
        isActive: true, // Анхны утга нь идэвхтэй
      });
    } catch (e: unknown) {
      console.error("Алдаа гарлаа: ", e);
      toast.error('Шалгалт хадгалахад алдаа гарлаа');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Ачаалж байна...</p>
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
    <div className="max-w-6xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Шалгалт оруулах</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="title">Гарчиг</Label>
                <Input id="title" value={form.title} onChange={(e) => handleInputChange('title', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="examType">Шалгалтын төрөл</Label>
                <Select value={form.examType} onValueChange={(v: ExamType) => handleInputChange('examType', v)}>
                  <SelectTrigger id="examType" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Төрөл сонгоно уу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Түвшин тогтоох">Түвшин тогтоох</SelectItem>
                    <SelectItem value="Уралдаант">Уралдаант</SelectItem>
                    <SelectItem value="ЭЕШ">ЭЕШ</SelectItem>
                    <SelectItem value="Олимпиад">Олимпиад</SelectItem>
                    <SelectItem value="Бусад">Бусад</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label htmlFor="description">Тайлбар</Label>
            <Textarea id="description" value={form.description} onChange={(e) => handleInputChange('description', e.target.value)} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="subject">Хичээл</Label>
                <Input id="subject" value={form.subject} onChange={(e) => handleInputChange('subject', e.target.value)} />
              </div>
              {/* Хүндрэл талбарыг устгасан */}
              {/* <div>
                <Label htmlFor="difficulty">Хүндрэл</Label>
                <Select value={form.difficulty} onValueChange={(v: DifficultyLevel) => handleInputChange('difficulty', v)}>
                  <SelectTrigger id="difficulty" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Хүндрэл" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Амархан">Амархан</SelectItem>
                    <SelectItem value="Дунд">Дунд</SelectItem>
                    <SelectItem value="Хүнд">Хүнд</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="topic">Сэдэв (Бүлэг)</Label>
                <Select
                  value={form.topic}
                  onValueChange={(v) => handleInputChange('topic', v)}
                  disabled={loadingChapters}
                >
                  <SelectTrigger id="topic" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder={loadingChapters ? "Ачаалж байна..." : "Бүлэг сонгоно уу"} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.name}>
                        {chapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subtopic">Дэд сэдэв</Label>
                <Select
                  value={form.subtopic}
                  onValueChange={(v) => handleInputChange('subtopic', v)}
                  disabled={loadingSubchapters || !form.topic}
                >
                  <SelectTrigger id="subtopic" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    {/* Placeholder-ийг хялбаршуулсан */}
                    <SelectValue placeholder="Дэд бүлэг сонгоно уу" />
                  </SelectTrigger>
                  <SelectContent>
                    {subchapters.map((subchapter) => (
                      <SelectItem key={subchapter.id} value={subchapter.name}>
                        {subchapter.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="timeLimit">Хугацаа (сек)</Label>
                <Input id="timeLimit" type="number" value={form.timeLimit} onChange={(e) => handleInputChange('timeLimit', Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="examDate">Шалгалтын огноо</Label>
                <Input id="examDate" type="date" value={form.examDate} onChange={(e) => handleInputChange('examDate', e.target.value)} />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="totalScore">Нийт оноо</Label>
                <Input id="totalScore" type="number" value={form.totalScore} readOnly className="bg-gray-100 cursor-not-allowed" />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="isActive">Идэвхтэй</Label>
                <Switch
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
              </div>
            </div>

            <div className="space-y-3 border p-4 rounded-md">
              <h3 className="text-lg font-semibold">Асуултууд</h3>
              {form.questions.map((q, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={q.collection}
                    onValueChange={(value: 'test' | 'problems') => handleQuestionChange(index, 'collection', value)}
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
                    onChange={(e) => handleQuestionChange(index, 'id', e.target.value)}
                    className="flex-grow h-8 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Оноо"
                    value={q.score}
                    onChange={(e) => handleQuestionChange(index, 'score', Number(e.target.value))}
                    className="w-[80px] h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveQuestion(index)}
                    className="h-8 w-8"
                  >
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={handleAddQuestion} variant="outline" size="sm" className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Асуулт нэмэх
              </Button>
            </div>

            <Button onClick={handleSaveExam} disabled={isSaving}>
              {isSaving ? 'Хадгалж байна...' : 'Шалгалт хадгалах'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview хэсэг - Шалгалт */}
      <div>
        <Card>
          <CardHeader><CardTitle>Шалгалтын Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><b>Гарчиг:</b> {form.title}</p>
            <p><b>Тайлбар:</b> {form.description || '-'}</p>
            <p><b>Шалгалтын төрөл:</b> {form.examType || '-'}</p>
            <p><b>Хичээл:</b> {form.subject}</p>
            <p><b>Сэдэв:</b> {form.topic || '-'}</p>
            <p><b>Дэд сэдэв:</b> {form.subtopic || '-'}</p>
            {/* Хүндрэл талбарыг preview-ээс устгасан */}
            {/* <p><b>Хүндрэл:</b> {form.difficulty || '-'}</p> */}
            <p><b>Хугацаа:</b> {form.timeLimit} сек</p>
            <p><b>Шалгалтын огноо:</b> {form.examDate}</p>
            <p><b>Нийт оноо:</b> {form.totalScore}</p>
            <p><b>Идэвхтэй:</b> {form.isActive ? 'Тийм' : 'Үгүй'}</p>
            
            <div className="space-y-2 border p-3 rounded-md">
              <p className="font-semibold">Оруулсан асуултууд ({form.questions.length}):</p>
              {form.questions.length === 0 ? (
                <p className="text-gray-500">Асуулт оруулаагүй байна.</p>
              ) : (
                <ul className="list-disc pl-5">
                  {form.questions.map((q, index) => (
                    <li key={index}>
                      Коллекц: {q.collection === 'test' ? 'Тест' : 'Бодлого'}, ID: {q.id}, Оноо: {q.score}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
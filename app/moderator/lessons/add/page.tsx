// app/moderator/lessons/add/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, where, doc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Client-side Firebase instance
import { useAuth } from '@/app/context/AuthContext'; // User authentication context

// === ИМПОРТЫН ХЭСГИЙГ ӨӨРИЙН ФАЙЛЫН БҮТЦЭЭР ЗӨВ СОНГОНО УУ ===
import { uploadFileToR2 } from '@/lib/uploadFileToR2'; // Таны R2 хуулах функцийн зам
import { getR2PublicImageUrl } from '@/lib/r2'; // Таны R2 URL авах функцийн зам
import { useCacheContext } from '@/lib/CacheContext'; // useCacheContext hook-ийг импортлоно
// =============================================================

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Trash2, UploadCloud } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// === Кэшний түлхүүрүүд ===
const CHAPTERS_CACHE_KEY = 'cachedChapters';
const SUBCHAPTERS_CACHE_KEY_PREFIX = 'cachedSubchapters_'; // Бүлгийн ID-г араас нь залгана

// === Interfaces ===
interface Chapter {
  id: string;
  name: string;
  lessonCount?: number;
  videoCount?: number;
  // ... бусад талбарууд (chapter-ын Firebase document-оос ирдэг)
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string; // Заавал байх ёстой
  order: number; // order талбар байгааг баталгаажуулна
  lessonCount?: number;
  videoCount?: number;
  // ... бусад талбарууд (subchapter-ын Firebase document-оос ирдэг)
}

interface ExampleProblem {
  id: string;
  problem: string; // Supports LaTeX
  solution: string; // Supports LaTeX
  imageUrl?: string | null;
  imageFile?: File | null; // For direct file upload
  isUploadingImage?: boolean;
}

interface Exercise {
  id: string;
  problem: string; // Supports LaTeX
  correctAnswer: string; // Supports LaTeX
  explanation: string; // Supports LaTeX
  score?: number | null; // null байж болно
  imageUrl?: string | null;
  imageFile?: File | null; // For direct file upload
  isUploadingImage?: boolean;
}

interface QuizQuestion {
  id: string;
  question: string; // Supports LaTeX
  options: string[]; // Supports LaTeX
  correctAnswer: string; // Supports LaTeX
  explanation: string; // Supports LaTeX
}

type AdditionalMaterialType = 'video' | 'pdf' | 'link';

interface AdditionalMaterial {
  id: string;
  type: AdditionalMaterialType;
  title: string;
  url: string | null; // null байж болно
  file?: File | null; // For direct file upload (video, pdf)
  isUploading?: boolean;
}

// === Main Component ===
export default function AddLessonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { get, set } = useCacheContext(); // useCacheContext hook-ийг ашиглана

  // === State Variables ===
  const [form, setForm] = useState({
    lessonTitle: '',
    lessonDescription: '',
    lessonLevel: null as string | null,
    lessonDuration: null as number | null, // null байж болно
    subject: 'physics', // Одоохондоо тогтмол утга
    topic: '', // Сонгогдсон бүлгийн НЭР (жишээ нь: "Механик"). Эхлээд хоосон стринг байна.
    subTopic: '', // Сонгогдсон дэд бүлгийн ID. Эхлээд хоосон стринг байна.
    introductionVideoUrl: null as string | null, // null байж болно
    introductionQuestion: '',
    theoryContent: '',
    theoryImageUrl: null as string | null, // null байж болно
    conclusionSummary: '',
    conclusionFormulasSummary: '',
  });

  const [introductionVideoFile, setIntroductionVideoFile] = useState<File | null>(null);
  const [isUploadingIntroVideo, setIsUploadingIntroVideo] = useState(false);
  const [theoryImageFile, setTheoryImageFile] = useState<File | null>(null);
  const [isUploadingTheoryImage, setIsUploadingTheoryImage] = useState(false);

  // Dynamic sections states
  const [examples, setExamples] = useState<ExampleProblem[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [additionalMaterials, setAdditionalMaterials] = useState<AdditionalMaterial[]>([]);

  // Firebase data states
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loadingSubchapters, setLoadingSubchapters] = useState(false);

  // General form state
  const [loadingForm, setLoadingForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lessonLevelOptions = ['Эхлэн', 'Дунд', 'Ахисан'];

  // === Effects ===
  // User authorization check
  useEffect(() => {
    const allowedRoles = ['moderator', 'admin'];
    if (!authLoading && (!user || !(user.role && allowedRoles.includes(user.role)))) {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Firebase-ээс бүлгүүдийг татах ба кэшлэх
  useEffect(() => {
    const fetchAndCacheChapters = async () => {
      const cachedChapters = get<Chapter[]>(CHAPTERS_CACHE_KEY);

      if (cachedChapters && cachedChapters.length > 0) {
        setChapters(cachedChapters);
        setLoadingChapters(false);
      } else {
        try {
          // 'chapters' цуглуулгаас бүх баримтуудыг нэрээр нь эрэмбэлж татна
          const querySnapshot = await getDocs(query(collection(db, 'chapters'), orderBy('name', 'asc')));
          const fetchedChapters: Chapter[] = [];
          querySnapshot.forEach((doc) => {
            // Firebase-ээс ирж буй өгөгдлийг Chapter interface-д тааруулах
            // doc.data() нь id талбаргүй байдаг тул Omit ашиглана
            fetchedChapters.push({ id: doc.id, ...doc.data() as Omit<Chapter, 'id'> });
          });
          setChapters(fetchedChapters);
          // 24 цагийн хугацаатайгаар кэшлэнэ (86400000ms = 24 цаг)
          set(CHAPTERS_CACHE_KEY, fetchedChapters, { expiryMs: 86400000 });
        } catch (error) {
          console.error("Бүлгүүдийг татахад алдаа гарлаа:", error);
          toast.error("Бүлгүүдийг татахад алдаа гарлаа.");
        } finally {
          setLoadingChapters(false);
        }
      }
    };

    fetchAndCacheChapters();
    // db-г хамаарлын жагсаалтад оруулах шаардлагагүй, учир нь collection функцээр дамжуулж байна
  }, [get, set]);

  // Firebase-ээс дэд бүлгүүдийг татах ба кэшлэх (Сонгогдсон бүлгээс хамаарна)
  useEffect(() => {
    const fetchAndCacheSubchapters = async () => {
      // Хэрэв бүлэг сонгогдоогүй бол дэд бүлгүүдийг цэвэрлээд буцна
      if (!form.topic) {
        setSubchapters([]);
        setLoadingSubchapters(false);
        setForm(prev => ({ ...prev, subTopic: '' })); // Дэд бүлгийн сонголтыг цэвэрлэнэ
        return;
      }

      setLoadingSubchapters(true);

      // Сонгосон бүлгийн нэрээр ID-г нь олох
      // Энэ нь form.topic нь бүлгийн ID биш, нэрээрээ ирж байгаа тохиолдолд
      const selectedChapter = chapters.find(chapter => chapter.name === form.topic);
      const chapterId = selectedChapter ? selectedChapter.id : null;

      console.log("Fetching subchapters for chapter name:", form.topic, "with ID:", chapterId);

      if (!chapterId) {
        setSubchapters([]);
        setLoadingSubchapters(false);
        setForm(prev => ({ ...prev, subTopic: '' }));
        console.warn("Сонгосон бүлгийн ID олдсонгүй:", form.topic);
        toast.info("Сонгосон бүлэгт дэд бүлэг олдсонгүй.");
        return;
      }

      const cacheKey = `${SUBCHAPTERS_CACHE_KEY_PREFIX}${chapterId}`;
      const cachedSubchapters = get<Subchapter[]>(cacheKey);

      if (cachedSubchapters && cachedSubchapters.length > 0) {
        setSubchapters(cachedSubchapters);
        setLoadingSubchapters(false);
      } else {
        try {
          // Firebase Firestore дэх таны дэд бүлгүүдийн бүтцийг нягтална уу!
          // 1. Хэрэв дэд бүлгүүд нь 'chapters' доторх subcollection байдлаар хадгалагдсан бол:
          // const q = query(collection(db, 'chapters', chapterId, 'subchapters'), orderBy('name', 'asc'));
          // 2. Хэрэв дэд бүлгүүд нь үндсэн 'subchapters' цуглуулгад байгаа бөгөөд chapterId-гаар шүүгддэг бол:
          // === Энд orderBy('name', 'asc') -> orderBy('order', 'asc') болгож зассан ===
          const q = query(collection(db, 'subchapters'), where('chapterId', '==', chapterId), orderBy('order', 'asc'));

          const querySnapshot = await getDocs(q);
          const fetchedSubchapters: Subchapter[] = [];
          querySnapshot.forEach((doc) => {
            fetchedSubchapters.push({ id: doc.id, ...doc.data() as Omit<Subchapter, 'id'> });
          });
          setSubchapters(fetchedSubchapters);
          set(cacheKey, fetchedSubchapters, { expiryMs: 86400000 }); // 24 цаг
          if (fetchedSubchapters.length === 0) {
              toast.info("Сонгосон бүлэгт дэд бүлэг байхгүй байна.");
          }
        } catch (error) {
          console.error("Дэд бүлгүүдийг татахад алдаа гарлаа:", error);
          toast.error("Дэд бүлгүүдийг татахад алдаа гарлаа.");
        } finally {
          setLoadingSubchapters(false);
        }
      }
    };

    fetchAndCacheSubchapters();
    // db-г хамаарлын жагсаалтад оруулах шаардлагагүй
  }, [form.topic, chapters, get, set]); // form.topic, chapters, get, set нь энэ эффектэд нөлөөлнө


  // === File Upload Utility Function ===
  const handleFileUpload = useCallback(
    async (
      file: File | null,
      fieldSetter: (url: string | null) => void, // Callback function to set the URL in form/state
      loadingSetter: React.Dispatch<React.SetStateAction<boolean>> // React state setter for boolean
    ) => {
      if (!file) {
        fieldSetter(null);
        return;
      }
      loadingSetter(true);
      try {
        const key = await uploadFileToR2(file);
        const publicUrl = getR2PublicImageUrl(key);
        if (publicUrl) {
            fieldSetter(publicUrl);
            toast.success("Файл амжилттай байршсан!", { description: `Файлын URL: ${publicUrl.slice(0, 50)}...` });
        } else {
            throw new Error("R2 public URL үүсгэхэд алдаа гарлаа.");
        }
      } catch (error) {
        console.error("Файл байршуулахад алдаа гарлаа:", error);
        fieldSetter(null);
        toast.error("Файл байршуулахад алдаа гарлаа.", { description: error instanceof Error ? error.message : String(error) });
      } finally {
        loadingSetter(false);
      }
    },
    []
  );

  // === Dynamic Section Change Handlers (useCallback-аар бүрсэн) ===
  const handleExampleChange = useCallback(
    <K extends keyof ExampleProblem>(id: string, field: K, value: ExampleProblem[K]) => {
      setExamples(prev =>
        prev.map(ex =>
          ex.id === id ? { ...ex, [field]: value } : ex
        )
      );
    },
    []
  );

  const handleExerciseChange = useCallback(
    <K extends keyof Exercise>(id: string, field: K, value: Exercise[K]) => {
      setExercises(prev => prev.map(ex => (ex.id === id ? { ...ex, [field]: value } : ex)));
    },
    []
  );

  const handleQuizQuestionChange = useCallback(
    <K extends keyof QuizQuestion>(id: string, field: K, value: QuizQuestion[K]) => {
      setQuizQuestions(prev => prev.map(q => (q.id === id ? { ...q, [field]: value } : q)));
    },
    []
  );

  const handleQuizOptionChange = useCallback(
    (qId: string, optionIndex: number, value: string) => {
      setQuizQuestions(prev => prev.map(q => {
        if (q.id === qId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      }));
    },
    []
  );

  const handleAdditionalMaterialChange = useCallback(
    <K extends keyof AdditionalMaterial>(id: string, field: K, value: AdditionalMaterial[K]) => {
      setAdditionalMaterials(prev => prev.map(mat => (mat.id === id ? { ...mat, [field]: value } : mat)));
    },
    []
  );

  // === Dynamic Section File Upload Handlers (useCallback-аар бүрсэн) ===
  const handleExampleImageUpload = useCallback(
    (id: string, file: File | null) => {
      // isUploadingImage-ийг эхлээд true болгоно
      setExamples(prev =>
        prev.map(ex =>
          ex.id === id ? { ...ex, imageFile: file, imageUrl: null, isUploadingImage: true } : ex
        )
      );
  
      if (file) {
        handleFileUpload(
          file,
          (url) => handleExampleChange(id, 'imageUrl', url),
          // Энд isUploadingImage state-ийг update хийх setter функцийг шууд дамжуулна
          (loadingStatus: React.SetStateAction<boolean>) => {
              // React.Dispatch функц нь шууд утга эсвэл функц хүлээж авдаг.
              // Энэ нь `setIsUploadingExampleImage(status)` гэсэнтэй ижил.
              setExamples(prev => prev.map(ex => 
                  ex.id === id ? { ...ex, isUploadingImage: typeof loadingStatus === 'function' ? loadingStatus(ex.isUploadingImage || false) : loadingStatus } : ex
              ));
          }
        );
      } else {
         // Файл байхгүй бол isUploadingImage-ийг false болгоно
        setExamples(prev =>
          prev.map(ex =>
            ex.id === id ? { ...ex, isUploadingImage: false } : ex
          )
        );
      }
    },
    [handleFileUpload, handleExampleChange]
  );

  const handleExerciseImageUpload = useCallback(
    (id: string, file: File | null) => {
      setExercises(prev => prev.map(ex => (ex.id === id ? { ...ex, imageFile: file, imageUrl: null, isUploadingImage: true } : ex)));
      if (file) {
        handleFileUpload(file,
          (url) => handleExerciseChange(id, 'imageUrl', url),
          (loadingStatus: React.SetStateAction<boolean>) => {
            setExercises(prev => prev.map(ex => 
                ex.id === id ? { ...ex, isUploadingImage: typeof loadingStatus === 'function' ? loadingStatus(ex.isUploadingImage || false) : loadingStatus } : ex
            ));
          }
        );
      } else {
        setExercises(prev => prev.map(ex => (ex.id === id ? { ...ex, isUploadingImage: false } : ex)));
      }
    },
    [handleFileUpload, handleExerciseChange]
  );

  const handleAdditionalMaterialFileUpload = useCallback(
    (id: string, file: File | null, type: AdditionalMaterialType) => {
      setAdditionalMaterials(prev => prev.map(mat => (mat.id === id ? { ...mat, file: file, url: null, type: type, isUploading: true } : mat)));
      if (file) {
        handleFileUpload(file,
          (url) => handleAdditionalMaterialChange(id, 'url', url),
          (loadingStatus: React.SetStateAction<boolean>) => {
            setAdditionalMaterials(prev => prev.map(mat => 
                mat.id === id ? { ...mat, isUploading: typeof loadingStatus === 'function' ? loadingStatus(mat.isUploading || false) : loadingStatus } : mat
            ));
          }
        );
      } else {
        setAdditionalMaterials(prev => prev.map(mat => (mat.id === id ? { ...mat, isUploading: false } : mat)));
      }
    },
    [handleFileUpload, handleAdditionalMaterialChange]
  );


  // === Dynamic Section Add/Remove Handlers ===
  const handleAddExample = () => setExamples(prev => [...prev, { id: Date.now().toString(), problem: '', solution: '', imageUrl: null, imageFile: null, isUploadingImage: false }]);
  const handleRemoveExample = (id: string) => setExamples(prev => prev.filter(ex => ex.id !== id));

  const handleAddExercise = () => setExercises(prev => [...prev, { id: Date.now().toString(), problem: '', correctAnswer: '', explanation: '', score: null, imageUrl: null, imageFile: null, isUploadingImage: false }]);
  const handleRemoveExercise = (id: string) => setExercises(prev => prev.filter(ex => ex.id !== id));

  const handleAddQuizQuestion = () => setQuizQuestions(prev => [...prev, { id: Date.now().toString(), question: '', options: ['', '', '', ''], correctAnswer: '', explanation: '' }]);
  const handleRemoveQuizQuestion = (id: string) => setQuizQuestions(prev => prev.filter(q => q.id !== id));

  const handleAddAdditionalMaterial = () => setAdditionalMaterials(prev => [...prev, { id: Date.now().toString(), type: 'link', title: '', url: null, file: null, isUploading: false }]);
  const handleRemoveAdditionalMaterial = (id: string) => setAdditionalMaterials(prev => prev.filter(mat => mat.id !== id));


  // === Form Submission ===
  const handleSubmitLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
  
    if (!user || !(user.role && ['moderator', 'admin'].includes(user.role))) {
      setError("Та хичээл нэмэх эрхгүй байна.");
      toast.error("Эрх хүрэлцэхгүй.", { description: "Та хичээл нэмэх эрхгүй байна." });
      return;
    }
  
    // Basic Validations (existing code, unchanged)
    if (!form.lessonTitle.trim()) { setError("Хичээлийн гарчиг заавал шаардлагатай."); toast.error("Гарчиг хоосон.", {description: "Хичээлийн гарчиг заавал шаардлагатай."}); return; }
    if (!form.lessonLevel) { setError("Хичээлийн түвшинг сонгоно уу."); toast.error("Түвшин сонгогдоогүй.", {description: "Хичээлийн түвшинг сонгоно уу."}); return; }
    if (!form.lessonDuration || form.lessonDuration <= 0) { setError("Хичээлийн хугацааг зөв оруулна уу."); toast.error("Хугацаа буруу.", {description: "Хичээлийн хугацааг зөв оруулна у."}); return; }
    if (!form.topic) { setError("Хичээл харьяалагдах бүлгийг сонгоно уу."); toast.error("Бүлэг сонгогдоогүй.", {description: "Хичээл харьяалагдах бүлгийг сонгоно уу."}); return; }
    if (!form.theoryContent.trim()) { setError("Онолын хэсэг хоосон байна. Заавал бөглөнө үү."); toast.error("Онол хоосон.", {description: "Онолын хэсэг хоосон байна."}); return; }
    if (!form.conclusionSummary.trim()) { setError("Дүгнэлтийн хэсэг хоосон байна. Заавал бөглөнө үү."); toast.error("Дүгнэлт хоосон.", {description: "Дүгнэлтийн хэсэг хоосон байна."}); return; }
  
    // Check if any uploads are still in progress (existing code, unchanged)
    if (isUploadingIntroVideo || isUploadingTheoryImage || examples.some(ex => ex.isUploadingImage === true) || exercises.some(ex => ex.isUploadingImage === true) || additionalMaterials.some(mat => mat.isUploading === true)) {
        setError("Файл байршуулах үйлдэл дуусаагүй байна. Түр хүлээнэ үү.");
        toast.error("Файл байршуулж байна.", {description: "Зарим файл байршиж дуусаагүй байна. Түр хүлээнэ үү."});
        return;
    }
  
    const selectedChapter = chapters.find(c => c.name === form.topic);
    const chapterIdToSave = selectedChapter?.id || null;
  
    if (!chapterIdToSave) {
        setError("Сонгосон бүлгийн ID олдсонгүй.");
        toast.error("Алдаа.", {description: "Сонгосон бүлгийн ID олдсонгүй."});
        return;
    }
  
    setLoadingForm(true);
  
    try {
      await runTransaction(db, async (transaction) => {
        // === 1. Бүх унших үйлдлүүдийг эхлээд гүйцэтгэнэ ===
        const chapterRef = doc(db, 'chapters', chapterIdToSave);
        const chapterDoc = await transaction.get(chapterRef);
  
        let subChapterDoc = null;
        if (form.subTopic) {
          const subChapterRef = doc(db, 'subchapters', form.subTopic);
          subChapterDoc = await transaction.get(subChapterRef);
        }
  
        // === 2. Шаардлагатай тооцооллуудыг хийнэ ===
        let currentChapterLessonCount = 0;
        let currentChapterVideoCount = 0;
        if (chapterDoc.exists()) {
          currentChapterLessonCount = chapterDoc.data()?.lessonCount || 0;
          currentChapterVideoCount = chapterDoc.data()?.videoCount || 0;
        } else {
          console.warn(`Chapter with ID ${chapterIdToSave} not found. Counts may be incorrect.`);
          // Энд алдаа гаргах эсвэл шинээр үүсгэх логик нэмж болно, гэхдээ одоохондоо зүгээр л анхааруулга өгч байна.
        }
  
        let currentSubChapterLessonCount = 0;
        let currentSubChapterVideoCount = 0;
        if (subChapterDoc && subChapterDoc.exists()) {
          currentSubChapterLessonCount = subChapterDoc.data()?.lessonCount || 0;
          currentSubChapterVideoCount = subChapterDoc.data()?.videoCount || 0;
        } else if (form.subTopic) {
          console.warn(`Subchapter with ID ${form.subTopic} not found. Counts may be incorrect.`);
        }
  
        let totalVideoCountToAdd = 0;
        if (form.introductionVideoUrl && form.introductionVideoUrl.trim() !== '') {
          totalVideoCountToAdd += 1;
        }
        additionalMaterials.forEach(material => {
          if (material.type === 'video' && material.url && material.url.trim() !== '') {
            totalVideoCountToAdd += 1;
          }
        });
  
        // === 3. Бүх бичих үйлдлүүдийг гүйцэтгэнэ ===
  
        // Хичээлийг нэмэх (энэ нь Firestore-д шинэ баримт үүсгэнэ)
        const lessonsColRef = collection(db, 'lessons');
        await addDoc(lessonsColRef, { // addDoc нь transaction.set эсвэл transaction.update-ээс ялгаатай.
          title: form.lessonTitle.trim(),
          description: form.lessonDescription.trim() || null,
          level: form.lessonLevel,
          duration: form.lessonDuration,
          moderatorUid: user.uid,
          moderatorName: user.name || user.email || 'Үл мэдэгдэх модератор',
          subjectId: form.subject,
          chapterId: chapterIdToSave,
          subChapterId: form.subTopic || null,
          introduction: {
            videoUrl: form.introductionVideoUrl,
            questionText: form.introductionQuestion.trim() || null,
          },
          theory: {
            content: form.theoryContent.trim(),
            imageUrl: form.theoryImageUrl,
          },
          // unused-vars алдааг зассан:
          examples: examples.map(ex => ({ problem: ex.problem, solution: ex.solution, imageUrl: ex.imageUrl || null })),
          exercises: exercises.map(ex => ({ problem: ex.problem, correctAnswer: ex.correctAnswer, explanation: ex.explanation, score: ex.score || null, imageUrl: ex.imageUrl || null })),
          conclusion: {
            summary: form.conclusionSummary.trim(),
            formulasSummary: form.conclusionFormulasSummary.trim() || null,
          },
          quiz: quizQuestions.map(q => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation })),
          additionalMaterials: additionalMaterials.map(mat => ({ type: mat.type, title: mat.title, url: mat.url || null })),
          createdAt: serverTimestamp(),
          createdByUid: user.uid,
          createdByName: user.name || user.email,
        });
  
        // Бүлгийн тооцооллыг шинэчлэх
        transaction.update(chapterRef, {
          lessonCount: currentChapterLessonCount + 1,
          videoCount: currentChapterVideoCount + totalVideoCountToAdd,
        });
  
        // Дэд бүлгийн тооцооллыг шинэчлэх (хэрэв байгаа бол)
        if (form.subTopic && subChapterDoc && subChapterDoc.exists()) {
          const subChapterRef = doc(db, 'subchapters', form.subTopic); // subChapterRef-ийг дахин үүсгэх
          transaction.update(subChapterRef, {
            lessonCount: currentSubChapterLessonCount + 1,
            videoCount: currentSubChapterVideoCount + totalVideoCountToAdd,
          });
        }
      }); // Transaction дуусах
  
      toast.success("Амжилттай.", {
        description: `"${form.lessonTitle}" хичээл амжилттай нэмэгдэж, тооцоолол шинэчлэгдлээ.`,
      });
  
      // Reset form (existing code, unchanged)
      setForm({
        lessonTitle: '',
        lessonDescription: '',
        lessonLevel: null,
        lessonDuration: null,
        subject: 'physics',
        topic: '',
        subTopic: '',
        introductionVideoUrl: null,
        introductionQuestion: '',
        theoryContent: '',
        theoryImageUrl: null,
        conclusionSummary: '',
        conclusionFormulasSummary: '',
      });
      setIntroductionVideoFile(null);
      setIsUploadingIntroVideo(false);
      setTheoryImageFile(null);
      setIsUploadingTheoryImage(false);
      setExamples([]);
      setExercises([]);
      setQuizQuestions([]);
      setAdditionalMaterials([]);
  
    } catch (err) {
      console.error("Хичээл нэмэхэд эсвэл тооцоолол шинэчлэхэд алдаа гарлаа:", err);
      setError("Хичээл нэмэхэд эсвэл тооцоолол шинэчлэхэд алдаа гарлаа: " + (err instanceof Error ? err.message : String(err)));
      toast.error("Алдаа гарлаа.", {
        description: `Хичээл нэмэхэд эсвэл тооцоолол шинэчлэхэд алдаа гарлаа: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoadingForm(false);
    }
  };

  // === Loading and Authorization UI ===
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
    <div className="flex justify-center items-start min-h-[calc(100vh-80px)] p-4 bg-gray-50">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-center">Шинэ Хичээл Нэмэх</CardTitle>
          <CardDescription className="text-center">Нарийвчилсан бүтэцтэй хичээл үүсгэнэ үү.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-500 text-center mb-4 p-2 border border-red-300 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmitLesson} className="space-y-8">
            {/* 1. Танилцуулга */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">1. Танилцуулга</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lessonTitle">Хичээлийн Гарчиг *</Label>
                    <Input id="lessonTitle" type="text" value={form.lessonTitle ?? ''} onChange={(e) => setForm(prev => ({ ...prev, lessonTitle: e.target.value }))} placeholder="Хичээлийн гарчиг" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lessonLevel">Түвшин *</Label>
                    <Select value={form.lessonLevel ?? ''} onValueChange={(value) => setForm(prev => ({ ...prev, lessonLevel: value }))}>
                      <SelectTrigger id="lessonLevel">
                        <SelectValue placeholder="Түвшин сонгох" />
                      </SelectTrigger>
                      <SelectContent>
                        {lessonLevelOptions.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lessonDuration">Хугацаа (минутаар) *</Label>
                    <Input
                      id="lessonDuration"
                      type="number"
                      value={form.lessonDuration === null ? '' : form.lessonDuration} // null үед хоосон стринг болгох
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => ({ ...prev, lessonDuration: val === '' ? null : Number(val) })); // Хоосон бол null болгох
                      }}
                      placeholder="60"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Модератор</Label>
                    <Input type="text" value={user?.name || user?.email || 'Unknown'} disabled className="bg-gray-100" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessonDescription">Зорилго / Танилцуулга (Заавал биш)</Label>
                  <Textarea id="lessonDescription" value={form.lessonDescription ?? ''} onChange={(e) => setForm(prev => ({ ...prev, lessonDescription: e.target.value }))} placeholder="Хичээлийн зорилго, товч танилцуулга" rows={3} />
                </div>

                {/* Хичээлийн ангилал сонгох хэсэг */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Хичээл *</Label>
                    <Select value={form.subject ?? ''} onValueChange={(value) => setForm(prev => ({ ...prev, subject: value }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Хичээл сонгох" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physics">Физик</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chapter">Бүлэг *</Label>
                    <Select
                      value={form.topic ?? ''} // ?? '' нэмсэн
                      onValueChange={(value) => setForm(prev => ({
                        ...prev,
                        // '__clear_topic__' бол хоосон болгоно, үгүй бол сонгосон утга
                        topic: value === '__clear_topic__' ? '' : value
                      }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Бүлэг сонгох" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* value prop нь хоосон байж болохгүй тул тусгай утга өгсөн */}
                        <SelectItem value="__clear_topic__">Бүлэг сонгохгүй</SelectItem>
                        {loadingChapters ? (
                          <SelectItem value="loading" disabled>Ачаалж байна...</SelectItem>
                        ) : (
                          chapters.map(chapter => (
                            <SelectItem key={chapter.id} value={chapter.name}>
                              {chapter.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subChapter">Дэд Бүлэг (Заавал биш)</Label>
                    <Select
                      value={form.subTopic ?? ''} // ?? '' нэмсэн
                      onValueChange={(value) => setForm(prev => ({
                        ...prev,
                        // '__clear_subtopic__' бол хоосон болгоно, үгүй бол сонгосон утга
                        subTopic: value === '__clear_subtopic__' ? '' : value
                      }))}
                      disabled={!form.topic || loadingSubchapters}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Дэд бүлэг сонгох" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* value prop нь хоосон байж болохгүй тул тусгай утга өгсөн */}
                        <SelectItem value="__clear_subtopic__">Дэд бүлэг сонгохгүй</SelectItem>
                        {loadingSubchapters ? (
                          <SelectItem value="loading" disabled>Ачаалж байна...</SelectItem>
                        ) : (
                          subchapters.map(sub => (
                            <SelectItem key={sub.id} value={sub.id}> {/* Энд ID-г value болгож байгааг анхаарна уу! */}
                              {sub.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* 2. Оршил */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">2. Оршил</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="introVideo">Богино видео (Заавал биш)</Label>
                  <Input
                    id="introVideo"
                    type="file"
                    accept="video/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      setIntroductionVideoFile(file as File | null);
                    }}
                  />
                  {introductionVideoFile && (
                    <Button type="button" onClick={() => handleFileUpload(introductionVideoFile, (url) => setForm(prev => ({ ...prev, introductionVideoUrl: url })), setIsUploadingIntroVideo)} disabled={isUploadingIntroVideo} className="mt-2">
                      {isUploadingIntroVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      {isUploadingIntroVideo ? "Байршуулж байна..." : "Видео байршуулах"}
                    </Button>
                  )}
                  {form.introductionVideoUrl && (
                    <p className="text-sm text-gray-500 mt-1">Одоогийн URL: <a href={form.introductionVideoUrl} target="_blank" rel="noopener noreferrer" className="underline">{form.introductionVideoUrl.slice(0, 50)}...</a></p>
                  )}
                  <Input type="url" value={form.introductionVideoUrl ?? ''} onChange={(e) => setForm(prev => ({ ...prev, introductionVideoUrl: e.target.value || null }))} placeholder="Эсвэл видеоны URL-г шууд оруулна уу (Youtube, Vimeo гэх мэт)" className="mt-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="introQuestion">Сонирхол татах асуулт (Заавал биш, Latex дэмжлэгтэй)</Label>
                  <Textarea id="introQuestion" value={form.introductionQuestion ?? ''} onChange={(e) => setForm(prev => ({ ...prev, introductionQuestion: e.target.value }))} placeholder="Хичээлийн эхэнд тавих сонирхолтой асуулт" rows={3} />
                </div>
              </div>
            </section>

            <Separator />

            {/* 3. Онол */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">3. Онол *</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theoryContent">Үндсэн ойлголт, томъёо (Latex дэмжлэгтэй)</Label>
                  <Textarea id="theoryContent" value={form.theoryContent ?? ''} onChange={(e) => setForm(prev => ({ ...prev, theoryContent: e.target.value }))} placeholder="Хичээлийн онолын хэсэг, томъёо, ойлголтууд" rows={8} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theoryImage">Зураг / Схем (Заавал биш)</Label>
                  <Input
                    id="theoryImage"
                    type="file"
                    accept="image/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      setTheoryImageFile(file as File | null);
                    }}
                  />
                  {theoryImageFile && (
                    <Button type="button" onClick={() => handleFileUpload(theoryImageFile, (url) => setForm(prev => ({ ...prev, theoryImageUrl: url })), setIsUploadingTheoryImage)} disabled={isUploadingTheoryImage} className="mt-2">
                      {isUploadingTheoryImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      {isUploadingTheoryImage ? "Байршуулж байна..." : "Зураг байршуулах"}
                    </Button>
                  )}
                   {form.theoryImageUrl && (
                    <p className="text-sm text-gray-500 mt-1">Одоогийн URL: <a href={form.theoryImageUrl} target="_blank" rel="noopener noreferrer" className="underline">{form.theoryImageUrl.slice(0, 50)}...</a></p>
                  )}
                  <Input type="url" value={form.theoryImageUrl ?? ''} onChange={(e) => setForm(prev => ({ ...prev, theoryImageUrl: e.target.value || null }))} placeholder="Эсвэл зурагны URL-г шууд оруулна уу" className="mt-2" />
                </div>
              </div>
            </section>

            <Separator />

            {/* 4. Жишээ Бодлого */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">4. Жишээ Бодлого</h3>
              <div className="space-y-4">
                {examples.map((example, index) => (
                  <Card key={example.id} className="p-4 relative">
                    <div className="absolute top-2 right-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExample(example.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Label className="block mb-2 font-medium">Жишээ Бодлого {index + 1}</Label>
                    <div className="space-y-2">
                      <Label htmlFor={`example-problem-${example.id}`}>Бодлого (Latex дэмжлэгтэй)</Label>
                      <Textarea id={`example-problem-${example.id}`} value={example.problem ?? ''} onChange={(e) => handleExampleChange(example.id, 'problem', e.target.value)} placeholder="Жишээ бодлогын нөхцөл" rows={3} required />
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`example-solution-${example.id}`}>Тайлбартай Бодолт (Latex дэмжлэгтэй)</Label>
                      <Textarea id={`example-solution-${example.id}`} value={example.solution ?? ''} onChange={(e) => handleExampleChange(example.id, 'solution', e.target.value)} placeholder="Бодлогын дэлгэрэнгүй бодолт" rows={4} required />
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`example-image-${example.id}`}>Бодлогын Зураг (Заавал биш)</Label>
                      <Input
                        id={`example-image-${example.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                          handleExampleImageUpload(example.id, file as File | null);
                        }}
                      />
                      {/* Upload button displayed only if a file is selected OR if there's an existing image URL */}
                      {(example.imageFile || example.imageUrl) && (
                        <Button type="button" onClick={() => handleExampleImageUpload(example.id, example.imageFile || null)} disabled={example.isUploadingImage} className="mt-2">
                          {example.isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                          {example.isUploadingImage ? "Байршуулж байна..." : "Зураг байршуулах"}
                        </Button>
                      )}
                      {example.imageUrl && (
                        <p className="text-sm text-gray-500 mt-1">Одоогийн URL: <a href={example.imageUrl} target="_blank" rel="noopener noreferrer" className="underline">{example.imageUrl.slice(0, 50)}...</a></p>
                      )}
                      <Input type="url" value={example.imageUrl ?? ''} onChange={(e) => handleExampleChange(example.id, 'imageUrl', e.target.value || null)} placeholder="Эсвэл зурагны URL-г шууд оруулна уу" className="mt-2" />
                    </div>
                  </Card>
                ))}
              </div>
              <Button type="button" onClick={handleAddExample} variant="outline" className="w-full mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Жишээ Бодлого Нэмэх
              </Button>
            </section>

            <Separator />

            {/* 5. Дасгал */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">5. Дасгал</h3>
              <div className="space-y-4">
                {exercises.map((exercise, index) => (
                  <Card key={exercise.id} className="p-4 relative">
                    <div className="absolute top-2 right-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveExercise(exercise.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Label className="block mb-2 font-medium">Дасгал {index + 1}</Label>
                    <div className="space-y-2">
                      <Label htmlFor={`exercise-problem-${exercise.id}`}>Бодлого (Latex дэмжлэгтэй)</Label>
                      <Textarea id={`exercise-problem-${exercise.id}`} value={exercise.problem ?? ''} onChange={(e) => handleExerciseChange(exercise.id, 'problem', e.target.value)} placeholder="Дасгалын бодлого" rows={3} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-2">
                            <Label htmlFor={`exercise-correctAnswer-${exercise.id}`}>Зөв Хариу (Latex дэмжлэгтэй)</Label>
                            <Input id={`exercise-correctAnswer-${exercise.id}`} type="text" value={exercise.correctAnswer ?? ''} onChange={(e) => handleExerciseChange(exercise.id, 'correctAnswer', e.target.value)} placeholder="Зөв хариулт" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`exercise-score-${exercise.id}`}>Оноо (Заавал биш)</Label>
                            <Input
                              id={`exercise-score-${exercise.id}`}
                              type="number"
                              value={exercise.score === null ? '' : exercise.score} // null бол хоосон болгох
                              onChange={(e) => {
                                const val = e.target.value;
                                handleExerciseChange(exercise.id, 'score', val === '' ? null : Number(val)); // Хоосон бол null болгох
                              }}
                              placeholder="Оноо"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`exercise-explanation-${exercise.id}`}>Тайлбар (Latex дэмжлэгтэй)</Label>
                      <Textarea id={`exercise-explanation-${exercise.id}`} value={exercise.explanation ?? ''} onChange={(e) => handleExerciseChange(exercise.id, 'explanation', e.target.value)} placeholder="Бодлогын тайлбар" rows={3} required />
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`exercise-image-${exercise.id}`}>Дасгалын Зураг (Заавал биш)</Label>
                      <Input
                        id={`exercise-image-${exercise.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                          handleExerciseImageUpload(exercise.id, file as File | null);
                        }}
                      />
                      {(exercise.imageFile || exercise.imageUrl) && (
                        <Button type="button" onClick={() => handleExerciseImageUpload(exercise.id, exercise.imageFile || null)} disabled={exercise.isUploadingImage} className="mt-2">
                          {exercise.isUploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                          {exercise.isUploadingImage ? "Байршуулж байна..." : "Зураг байршуулах"}
                        </Button>
                      )}
                      {exercise.imageUrl && (
                        <p className="text-sm text-gray-500 mt-1">Одоогийн URL: <a href={exercise.imageUrl} target="_blank" rel="noopener noreferrer" className="underline">{exercise.imageUrl.slice(0, 50)}...</a></p>
                      )}
                      <Input type="url" value={exercise.imageUrl ?? ''} onChange={(e) => handleExerciseChange(exercise.id, 'imageUrl', e.target.value || null)} placeholder="Эсвэл зурагны URL-г шууд оруулна уу" className="mt-2" />
                    </div>
                  </Card>
                ))}
              </div>
              <Button type="button" onClick={handleAddExercise} variant="outline" className="w-full mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Дасгал Нэмэх
              </Button>
            </section>

            <Separator />

            {/* 6. Дүгнэлт */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">6. Дүгнэлт *</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="conclusionSummary">Гол санаанууд (Latex дэмжлэгтэй)</Label>
                  <Textarea id="conclusionSummary" value={form.conclusionSummary ?? ''} onChange={(e) => setForm(prev => ({ ...prev, conclusionSummary: e.target.value }))} placeholder="Хичээлийн гол санаануудыг нэгтгэнэ үү." rows={4} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conclusionFormulasSummary">Томъёоны нэгтгэл (Заавал биш, Latex дэмжлэгтэй)</Label>
                  <Textarea id="conclusionFormulasSummary" value={form.conclusionFormulasSummary ?? ''} onChange={(e) => setForm(prev => ({ ...prev, conclusionFormulasSummary: e.target.value }))} placeholder="Хичээл дээр гарсан томъёонуудыг нэгтгэнэ үү." rows={3} />
                </div>
              </div>
            </section>

            <Separator />

            {/* 7. Шалгалт (Quiz) */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">7. Шалгалт (Quiz)</h3>
              <div className="space-y-4">
                {quizQuestions.map((quizQ, index) => (
                  <Card key={quizQ.id} className="p-4 relative">
                    <div className="absolute top-2 right-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveQuizQuestion(quizQ.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Label className="block mb-2 font-medium">Асуулт {index + 1}</Label>
                    <div className="space-y-2">
                      <Label htmlFor={`quiz-question-${quizQ.id}`}>Асуулт (Latex дэмжлэгтэй)</Label>
                      <Textarea id={`quiz-question-${quizQ.id}`} value={quizQ.question ?? ''} onChange={(e) => handleQuizQuestionChange(quizQ.id, 'question', e.target.value)} placeholder="Шалгалтын асуулт" rows={3} required />
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label>Сонголтууд (Latex дэмжлэгтэй):</Label>
                      {quizQ.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <Input
                            type="text"
                            value={option ?? ''} // 'option' undefined бол хоосон стринг болгоно
                            onChange={(e) => handleQuizOptionChange(quizQ.id, optIndex, e.target.value)}
                            placeholder={`Сонголт ${String.fromCharCode(65 + optIndex)}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`quiz-correctAnswer-${quizQ.id}`}>Зөв Хариулт (Сонголтуудаас нэгийг оруулна уу. Жишээ нь: А эсвэл контент)</Label>
                      <Input id={`quiz-correctAnswer-${quizQ.id}`} type="text" value={quizQ.correctAnswer ?? ''} onChange={(e) => handleQuizQuestionChange(quizQ.id, 'correctAnswer', e.target.value)} placeholder="Зөв хариулт" required />
                    </div>
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`quiz-explanation-${quizQ.id}`}>Тайлбар (Latex дэмжлэгтэй)</Label>
                      <Textarea id={`quiz-explanation-${quizQ.id}`} value={quizQ.explanation ?? ''} onChange={(e) => handleQuizQuestionChange(quizQ.id, 'explanation', e.target.value)} placeholder="Хариултын тайлбар" rows={3} required />
                    </div>
                  </Card>
                ))}
              </div>
              <Button type="button" onClick={handleAddQuizQuestion} variant="outline" className="w-full mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Шалгалтын Асуулт Нэмэх
              </Button>
            </section>

            <Separator />

            {/* 8. Нэмэлт Материал */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-blue-700">8. Нэмэлт Материал</h3>
              <div className="space-y-4">
                {additionalMaterials.map((material, index) => (
                  <Card key={material.id} className="p-4 relative">
                    <div className="absolute top-2 right-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAdditionalMaterial(material.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Label className="block mb-2 font-medium">Нэмэлт Материал {index + 1}</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor={`material-type-${material.id}`}>Төрөл</Label>
                        <Select value={material.type ?? ''} onValueChange={(value: AdditionalMaterialType) => handleAdditionalMaterialChange(material.id, 'type', value)}>
                          <SelectTrigger id={`material-type-${material.id}`}>
                            <SelectValue placeholder="Материалын төрөл" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Видео</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="link">Линк</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`material-title-${material.id}`}>Гарчиг</Label>
                        <Input id={`material-title-${material.id}`} type="text" value={material.title ?? ''} onChange={(e) => handleAdditionalMaterialChange(material.id, 'title', e.target.value)} placeholder="Материалын гарчиг" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      { (material.type === 'video' || material.type === 'pdf') ? (
                        <>
                          <Label htmlFor={`material-file-${material.id}`}>Файл</Label>
                          <Input
                            id={`material-file-${material.id}`}
                            type="file"
                            accept={material.type === 'video' ? 'video/*' : 'application/pdf'}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                              handleAdditionalMaterialFileUpload(material.id, file as File | null, material.type);
                            }}
                          />
                          {(material.file || material.url) && ( // Зөвхөн файл сонгогдсон эсвэл URL байгаа тохиолдолд харуулах
                            <Button type="button" onClick={() => handleAdditionalMaterialFileUpload(material.id, material.file || null, material.type)} disabled={material.isUploading} className="mt-2">
                              {material.isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                              {material.isUploading ? "Байршуулж байна..." : "Файл байршуулах"}
                            </Button>
                          )}
                           {material.url && (
                            <p className="text-sm text-gray-500 mt-1">Одоогийн URL: <a href={material.url} target="_blank" rel="noopener noreferrer" className="underline">{material.url.slice(0, 50)}...</a></p>
                          )}
                          <Input type="url" value={material.url ?? ''} onChange={(e) => handleAdditionalMaterialChange(material.id, 'url', e.target.value || null)} placeholder="Эсвэл файлын URL-г шууд оруулна уу" className="mt-2" />
                        </>
                      ) : (
                        <>
                          <Label htmlFor={`material-url-${material.id}`}>Линк URL</Label>
                          <Input id={`material-url-${material.id}`} type="url" value={material.url ?? ''} onChange={(e) => handleAdditionalMaterialChange(material.id, 'url', e.target.value || null)} placeholder="Линкний URL" required />
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <Button type="button" onClick={handleAddAdditionalMaterial} variant="outline" className="w-full mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Нэмэлт Материал Нэмэх
              </Button>
            </section>

            <Button type="submit" className="w-full mt-8" disabled={loadingForm || isUploadingIntroVideo || isUploadingTheoryImage || examples.some(ex => ex.isUploadingImage === true) || exercises.some(ex => ex.isUploadingImage === true) || additionalMaterials.some(mat => mat.isUploading === true)}>
              {loadingForm || isUploadingIntroVideo || isUploadingTheoryImage || examples.some(ex => ex.isUploadingImage === true) || exercises.some(ex => ex.isUploadingImage === true) || additionalMaterials.some(mat => mat.isUploading === true) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Хичээл Үүсгэж байна...
                </>
              ) : (
                "Хичээл Үүсгэх"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
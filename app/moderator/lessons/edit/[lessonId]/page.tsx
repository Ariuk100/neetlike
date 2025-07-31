'use client';

import React, { useState, useEffect, useMemo } from 'react'; // useCallback-ийг хассан
import { useRouter, useParams } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  where,
  Timestamp,
  // addDoc, // Хассан
  // deleteDoc, // Хассан
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Checkbox } from '@/components/ui/checkbox'; // Хассан
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, PlusCircle, Trash2, FileText, XCircle } from 'lucide-react'; // Video, Image-ийг хассан

// Custom components (if applicable)
// import { RichTextEditor } from '@/components/RichTextEditor';
// import FilePreview from '@/components/FilePreview';

import { useCacheContext } from '@/lib/CacheContext';

// Interfaces (Make sure these are consistent with your Firebase data)
// NOTE: Ensure your CustomUser interface in AuthContext.tsx has 'displayName: string | null;'
interface Lesson {
  id: string;
  title: string;
  description: string;
  introductionVideoUrl: string | null;
  theoryText: string;
  theoryImageUrl: string | null;
  level: string;
  duration: number;
  subjectId: string;
  chapterId: string;
  subChapterId: string | null;
  examples: Example[];
  exercises: Exercise[];
  additionalMaterials: AdditionalMaterial[];
  moderatorUid: string;
  moderatorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Example {
  id: string;
  text: string;
  imageUrl: string | null;
}

interface Exercise {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  imageUrl: string | null;
}

interface AdditionalMaterial {
  id: string;
  title: string;
  type: 'video' | 'pdf';
  url: string;
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

export default function EditLessonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const lessonId = params.lessonId as string;
  const { get, set } = useCacheContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Lesson, 'id' | 'moderatorUid' | 'moderatorName' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    introductionVideoUrl: null,
    theoryText: '',
    theoryImageUrl: null,
    level: '',
    duration: 0,
    subjectId: '',
    chapterId: '',
    subChapterId: null,
    examples: [],
    exercises: [],
    additionalMaterials: [],
  });
  const [initialFormState, setInitialFormState] = useState<typeof form | null>(null);

  // File states
  const [introductionVideoFile, setIntroductionVideoFile] = useState<File | null>(null);
  const [theoryImageFile, setTheoryImageFile] = useState<File | null>(null);
  const [exampleImageFiles, setExampleImageFiles] = useState<Map<string, File>>(new Map());
  const [exerciseImageFiles, setExerciseImageFiles] = useState<Map<string, File>>(new Map());
  const [additionalMaterialFiles, setAdditionalMaterialFiles] = useState<Map<string, File>>(new Map());


  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingSubchapters, setLoadingSubchapters] = useState(false);

  const lessonLevelOptions = ['Эхлэн', 'Дунд', 'Ахисан'];

  // Authorization Check Effect
  useEffect(() => {
    const allowedRoles = ['moderator', 'admin'];
    if (!authLoading && (!user || !(user.role && allowedRoles.includes(user.role)))) {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Fetch Chapters Effect
  useEffect(() => {
    const fetchAndCacheChapters = async () => {
      const cachedChapters = get<Chapter[]>(CHAPTERS_CACHE_KEY);
      if (cachedChapters && cachedChapters.length > 0) {
        setChapters(cachedChapters);
        setLoadingChapters(false);
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
        } finally {
          setLoadingChapters(false);
        }
      }
    };
    fetchAndCacheChapters();
  }, [get, set]);

  // Fetch Subchapters Effect based on selected chapter
  useEffect(() => {
    const fetchAndCacheSubchapters = async () => {
      if (!form.chapterId) {
        setSubchapters([]);
        setForm(prev => ({ ...prev, subChapterId: null }));
        setLoadingSubchapters(false);
        return;
      }

      setLoadingSubchapters(true);
      const cacheKey = `${SUBCHAPTERS_CACHE_KEY_PREFIX}${form.chapterId}`;
      const cachedSubchapters = get<Subchapter[]>(cacheKey);

      if (cachedSubchapters && cachedSubchapters.length > 0) {
        setSubchapters(cachedSubchapters);
        setLoadingSubchapters(false);
      } else {
        try {
          const q = query(collection(db, 'subchapters'), where('chapterId', '==', form.chapterId), orderBy('order', 'asc'));
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
        } finally {
          setLoadingSubchapters(false);
        }
      }
    };
    fetchAndCacheSubchapters();
  }, [form.chapterId, get, set]);

  // Fetch Lesson Data
  useEffect(() => {
    if (!lessonId || authLoading || !user) return;

    const fetchLesson = async () => {
      try {
        const lessonRef = doc(db, 'lessons', lessonId);
        const lessonSnap = await getDoc(lessonRef);

        if (!lessonSnap.exists()) {
          toast.error('Хичээл олдсонгүй.');
          router.push('/moderator/lessons/view');
          return;
        }

        const data = lessonSnap.data() as Lesson;

        // Populate form state
        setForm({
          title: data.title,
          description: data.description,
          introductionVideoUrl: data.introductionVideoUrl || null,
          theoryText: data.theoryText,
          theoryImageUrl: data.theoryImageUrl || null,
          level: data.level,
          duration: data.duration,
          subjectId: data.subjectId,
          chapterId: data.chapterId,
          subChapterId: data.subChapterId || null,
          examples: data.examples || [],
          exercises: data.exercises || [],
          additionalMaterials: data.additionalMaterials || [],
        });
        setInitialFormState({
          title: data.title,
          description: data.description,
          introductionVideoUrl: data.introductionVideoUrl || null,
          theoryText: data.theoryText,
          theoryImageUrl: data.theoryImageUrl || null,
          level: data.level,
          duration: data.duration,
          subjectId: data.subjectId,
          chapterId: data.chapterId,
          subChapterId: data.subChapterId || null,
          examples: data.examples || [],
          exercises: data.exercises || [],
          additionalMaterials: data.additionalMaterials || [],
        });

      } catch (error) {
        console.error('Хичээлийн мэдээлэл татахад алдаа гарлаа:', error);
        toast.error('Хичээлийн мэдээлэл татахад алдаа гарлаа.', { description: error instanceof Error ? error.message : String(error) });
        router.push('/moderator/lessons/view');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, authLoading, router, user]);


  // Handlers for dynamic fields (Examples, Exercises, Additional Materials)

  // Example Handlers
  const addExample = () => {
    setForm(prev => ({
      ...prev,
      examples: [...prev.examples, { id: Date.now().toString(), text: '', imageUrl: null }],
    }));
  };

  const updateExample = (id: string, field: 'text' | 'imageUrl', value: string | null) => {
    setForm(prev => ({
      ...prev,
      examples: prev.examples.map(ex => ex.id === id ? { ...ex, [field]: value } : ex),
    }));
  };

  const removeExample = (id: string) => {
    setForm(prev => ({
      ...prev,
      examples: prev.examples.filter(ex => ex.id !== id),
    }));
    setExampleImageFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const handleExampleImageUpload = (id: string, file: File | null) => {
    setExampleImageFiles(prev => {
      const newMap = new Map(prev);
      if (file) {
        newMap.set(id, file);
      } else {
        newMap.delete(id);
      }
      return newMap;
    });
    if (!file) {
      updateExample(id, 'imageUrl', null);
    }
  };

  // Exercise Handlers
  const addExercise = () => {
    setForm(prev => ({
      ...prev,
      exercises: [...prev.exercises, { id: Date.now().toString(), question: '', options: ['', '', '', ''], correctAnswer: '', imageUrl: null }],
    }));
  };

  const updateExercise = (id: string, field: 'question' | 'correctAnswer' | 'imageUrl', value: string | null) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex),
    }));
  };

  const updateExerciseOption = (exerciseId: string, optionIndex: number, value: string) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex =>
        ex.id === exerciseId
          ? { ...ex, options: ex.options.map((opt, i) => i === optionIndex ? value : opt) }
          : ex
      ),
    }));
  };

  const removeExercise = (id: string) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== id),
    }));
    setExerciseImageFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const handleExerciseImageUpload = (id: string, file: File | null) => {
    setExerciseImageFiles(prev => {
      const newMap = new Map(prev);
      if (file) {
        newMap.set(id, file);
      } else {
        newMap.delete(id);
      }
      return newMap;
    });
    if (!file) {
      updateExercise(id, 'imageUrl', null);
    }
  };


  // Additional Material Handlers
  const addAdditionalMaterial = () => {
    setForm(prev => ({
      ...prev,
      additionalMaterials: [...prev.additionalMaterials, { id: Date.now().toString(), title: '', type: 'pdf', url: '' }],
    }));
  };

  const updateAdditionalMaterial = (id: string, field: 'title' | 'type' | 'url', value: string) => {
    setForm(prev => ({
      ...prev,
      additionalMaterials: prev.additionalMaterials.map(mat => mat.id === id ? { ...mat, [field]: value } : mat),
    }));
  };

  const removeAdditionalMaterial = (id: string) => {
    setForm(prev => ({
      ...prev,
      additionalMaterials: prev.additionalMaterials.filter(mat => mat.id !== id),
    }));
    setAdditionalMaterialFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const handleAdditionalMaterialFileUpload = (id: string, file: File | null, type: 'video' | 'pdf') => {
    setAdditionalMaterialFiles(prev => {
      const newMap = new Map(prev);
      if (file) {
        newMap.set(id, file);
      } else {
        newMap.delete(id);
      }
      return newMap;
    });
    if (!file) {
      updateAdditionalMaterial(id, 'url', '');
    }
    updateAdditionalMaterial(id, 'type', type);
  };

  // Helper to check if any changes were made
  const hasChanges = useMemo(() => {
    if (!initialFormState) {
        return introductionVideoFile !== null ||
               theoryImageFile !== null ||
               exampleImageFiles.size > 0 ||
               exerciseImageFiles.size > 0 ||
               additionalMaterialFiles.size > 0;
    }

    return JSON.stringify(form) !== JSON.stringify(initialFormState) ||
           introductionVideoFile !== null ||
           theoryImageFile !== null ||
           exampleImageFiles.size > 0 ||
           exerciseImageFiles.size > 0 ||
           additionalMaterialFiles.size > 0;
  }, [form, initialFormState, introductionVideoFile, theoryImageFile, exampleImageFiles, exerciseImageFiles, additionalMaterialFiles]);


  // Upload File to Firebase Storage
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  // Delete File from Firebase Storage (if existing URL)
  const deleteFile = async (url: string | null) => {
    if (!url || !url.startsWith('https://firebasestorage.googleapis.com')) return;
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
      console.log('Old file deleted from storage:', url);
    } catch (error) {
      console.warn('Failed to delete old file from storage:', url, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid || !user.displayName) {
      toast.error('Модераторын мэдээлэл дутуу байна. Нэвтэрч орох хэрэгтэй.');
      return;
    }

    if (saving) return;

    setSaving(true);
    // updatedForm-ийг const болгосон
    const updatedForm = { ...form };

    try {
      // 1. Upload Introduction Video if changed
      if (introductionVideoFile) {
        if (initialFormState?.introductionVideoUrl) {
          await deleteFile(initialFormState.introductionVideoUrl);
        }
        const videoUrl = await uploadFile(introductionVideoFile, `lessons/${lessonId}/introVideo/${introductionVideoFile.name}`);
        updatedForm.introductionVideoUrl = videoUrl;
      } else if (introductionVideoFile === null && initialFormState?.introductionVideoUrl !== null && form.introductionVideoUrl === null) {
        await deleteFile(initialFormState?.introductionVideoUrl || null);
        updatedForm.introductionVideoUrl = null;
      }


      // 2. Upload Theory Image if changed
      if (theoryImageFile) {
        if (initialFormState?.theoryImageUrl) {
          await deleteFile(initialFormState.theoryImageUrl);
        }
        const imageUrl = await uploadFile(theoryImageFile, `lessons/${lessonId}/theoryImage/${theoryImageFile.name}`);
        updatedForm.theoryImageUrl = imageUrl;
      } else if (theoryImageFile === null && initialFormState?.theoryImageUrl !== null && form.theoryImageUrl === null) {
        await deleteFile(initialFormState?.theoryImageUrl || null);
        updatedForm.theoryImageUrl = null;
      }

      // 3. Process Examples (Upload new images, retain old URLs, delete removed images)
      const processedExamples = await Promise.all(
        updatedForm.examples.map(async (example) => {
          const file = exampleImageFiles.get(example.id);
          const initialExample = initialFormState?.examples?.find(e => e.id === example.id);

          if (file) {
            if (initialExample?.imageUrl) {
              await deleteFile(initialExample.imageUrl);
            }
            const url = await uploadFile(file, `lessons/${lessonId}/examples/${example.id}/${file.name}`);
            return { ...example, imageUrl: url };
          } else if (example.imageUrl === null && initialExample?.imageUrl !== null) {
            await deleteFile(initialExample?.imageUrl || null);
            return { ...example, imageUrl: null };
          }
          return example;
        })
      );
      updatedForm.examples = processedExamples;

      // 4. Process Exercises (Upload new images, retain old URLs, delete removed images)
      const processedExercises = await Promise.all(
        updatedForm.exercises.map(async (exercise) => {
          const file = exerciseImageFiles.get(exercise.id);
          const initialExercise = initialFormState?.exercises?.find(e => e.id === exercise.id);

          if (file) {
            if (initialExercise?.imageUrl) {
              await deleteFile(initialExercise.imageUrl);
            }
            const url = await uploadFile(file, `lessons/${lessonId}/exercises/${exercise.id}/${file.name}`);
            return { ...exercise, imageUrl: url };
          } else if (exercise.imageUrl === null && initialExercise?.imageUrl !== null) {
            await deleteFile(initialExercise?.imageUrl || null);
            return { ...exercise, imageUrl: null };
          }
          return exercise;
        })
      );
      updatedForm.exercises = processedExercises;

      // 5. Process Additional Materials (Upload new files, retain old URLs, delete removed files)
      const processedAdditionalMaterials = await Promise.all(
        updatedForm.additionalMaterials.map(async (material) => {
          const file = additionalMaterialFiles.get(material.id);
          const initialMaterial = initialFormState?.additionalMaterials?.find(m => m.id === material.id);

          if (file) {
            if (initialMaterial?.url) {
              await deleteFile(initialMaterial.url);
            }
            const url = await uploadFile(file, `lessons/${lessonId}/additionalMaterials/${material.id}/${file.name}`);
            return { ...material, url };
          } else if (material.url === '' && initialMaterial?.url) {
            await deleteFile(initialMaterial.url);
            return { ...material, url: '' };
          }
          return material;
        })
      );
      updatedForm.additionalMaterials = processedAdditionalMaterials;

      // Prepare data for update
      const lessonDataToUpdate = {
        ...updatedForm,
        moderatorUid: user.uid,
        moderatorName: user.displayName,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'lessons', lessonId), lessonDataToUpdate);

      toast.success('Хичээл амжилттай шинэчлэгдлээ!');
      router.push('/moderator/lessons/view');

    } catch (error) {
      console.error('Хичээл шинэчлэхэд алдаа гарлаа:', error);
      toast.error('Хичээл шинэчлэхэд алдаа гарлаа.', { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  };

  // === Early Return for Authorization/Loading ===
  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
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

  // --- Render Section ---
  return (
    <div className="flex justify-center items-start min-h-[calc(100vh-80px)] p-4 bg-gray-50">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Хичээл Засварлах</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2 mb-4">Ерөнхий мэдээлэл</h3>
              <div>
                <Label htmlFor="title">Гарчиг *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Тайлбар *</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Түвшин *</Label>
                  <Select
                    value={form.level}
                    onValueChange={(value) => setForm(prev => ({ ...prev, level: value }))}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Түвшин сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessonLevelOptions.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Үргэлжлэх хугацаа (мин) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    min="0"
                    required
                  />
                </div>
              </div>
              {/* Chapter and Subchapter Selects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chapter">Бүлэг *</Label>
                  <Select
                    value={form.chapterId}
                    onValueChange={(value) => setForm(prev => ({
                      ...prev,
                      chapterId: value,
                      subjectId: chapters.find(c => c.id === value)?.name || '',
                      subChapterId: null
                    }))}
                    disabled={loadingChapters}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Бүлэг сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingChapters ? (
                        <SelectItem value="loading" disabled>Ачаалж байна...</SelectItem>
                      ) : (
                        chapters.map(chapterItem => (
                          <SelectItem key={chapterItem.id} value={chapterItem.id}>
                            {chapterItem.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subChapter">Дэд Бүлэг (Заавал биш)</Label>
                  <Select
                    value={form.subChapterId || ''}
                    onValueChange={(value) => setForm(prev => ({
                      ...prev,
                      subChapterId: value === 'none' ? null : value
                    }))}
                    disabled={!form.chapterId || loadingSubchapters}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Дэд бүлэг сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Дэд бүлэг сонгохгүй</SelectItem>
                      {loadingSubchapters ? (
                        <SelectItem value="loading" disabled>Ачаалж байна...</SelectItem>
                      ) : (
                        subchapters.map(subItem => (
                          <SelectItem key={subItem.id} value={subItem.id}>
                            {subItem.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Introduction Video */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2 mb-4">Танилцуулга Видео</h3>
              {form.introductionVideoUrl && (
                <div className="relative w-full h-64 bg-gray-200 rounded-md overflow-hidden">
                  <video src={form.introductionVideoUrl} controls className="w-full h-full object-contain" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full"
                    onClick={() => {
                      setForm(prev => ({ ...prev, introductionVideoUrl: null }));
                      setIntroductionVideoFile(null);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!form.introductionVideoUrl && (
                <div className="space-y-2">
                  <Label htmlFor="introVideo">Видео файл сонгох (.mp4, .mov)</Label>
                  <Input
                    id="introVideo"
                    type="file"
                    accept="video/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      setIntroductionVideoFile(file);
                    }}
                  />
                  {introductionVideoFile && (
                    <p className="text-sm text-gray-500">Сонгосон файл: {introductionVideoFile.name}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Theory Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2 mb-4">Онолын Хэсэг</h3>
              <div>
                <Label htmlFor="theoryText">Онолын текст</Label>
                <Textarea
                  id="theoryText"
                  value={form.theoryText}
                  onChange={(e) => setForm(prev => ({ ...prev, theoryText: e.target.value }))}
                  rows={6}
                />
              </div>
              {form.theoryImageUrl && (
                <div className="relative w-full h-64 bg-gray-200 rounded-md overflow-hidden">
                  <img src={form.theoryImageUrl} alt="Онолын зураг" className="w-full h-full object-contain" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full"
                    onClick={() => {
                      setForm(prev => ({ ...prev, theoryImageUrl: null }));
                      setTheoryImageFile(null);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!form.theoryImageUrl && (
                <div className="space-y-2">
                  <Label htmlFor="theoryImage">Онолын зураг сонгох (.jpg, .png)</Label>
                  <Input
                    id="theoryImage"
                    type="file"
                    accept="image/*"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                      setTheoryImageFile(file);
                    }}
                  />
                  {theoryImageFile && (
                    <p className="text-sm text-gray-500">Сонгосон файл: {theoryImageFile.name}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Examples Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2 flex justify-between items-center">
                Жишээнүүд
                <Button type="button" onClick={addExample} variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" /> Жишээ нэмэх
                </Button>
              </h3>
              {form.examples.map((example) => (
                <Card key={example.id} className="p-4 bg-gray-50 shadow-sm relative">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeExample(example.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor={`example-text-${example.id}`}>Жишээний текст</Label>
                    <Textarea
                      id={`example-text-${example.id}`}
                      value={example.text}
                      onChange={(e) => updateExample(example.id, 'text', e.target.value)}
                      rows={3}
                    />
                  </div>
                  {example.imageUrl && (
                    <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden mb-2">
                      <img src={example.imageUrl} alt="Жишээний зураг" className="w-full h-full object-contain" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={() => updateExample(example.id, 'imageUrl', null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {!example.imageUrl && (
                    <div className="space-y-2">
                      <Label htmlFor={`example-image-${example.id}`}>Жишээний зураг сонгох (.jpg, .png)</Label>
                      <Input
                        id={`example-image-${example.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                          handleExampleImageUpload(example.id, file);
                        }}
                      />
                      {exampleImageFiles.has(example.id) && (
                        <p className="text-sm text-gray-500">Сонгосон файл: {exampleImageFiles.get(example.id)?.name}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
              {form.examples.length === 0 && <p className="text-gray-500 text-center">Одоогоор жишээ байхгүй.</p>}
            </div>

            <Separator />

            {/* Exercises Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2 flex justify-between items-center">
                Дасгалууд
                <Button type="button" onClick={addExercise} variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" /> Дасгал нэмэх
                </Button>
              </h3>
              {form.exercises.map((exercise) => (
                <Card key={exercise.id} className="p-4 bg-gray-50 shadow-sm relative">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeExercise(exercise.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor={`exercise-question-${exercise.id}`}>Асуулт</Label>
                    <Textarea
                      id={`exercise-question-${exercise.id}`}
                      value={exercise.question}
                      onChange={(e) => updateExercise(exercise.id, 'question', e.target.value)}
                      rows={2}
                    />
                  </div>
                  {exercise.imageUrl && (
                    <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden mb-2">
                      <img src={exercise.imageUrl} alt="Дасгалын зураг" className="w-full h-full object-contain" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={() => updateExercise(exercise.id, 'imageUrl', null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {!exercise.imageUrl && (
                    <div className="space-y-2">
                      <Label htmlFor={`exercise-image-${exercise.id}`}>Дасгалын зураг сонгох (.jpg, .png)</Label>
                      <Input
                        id={`exercise-image-${exercise.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                          handleExerciseImageUpload(exercise.id, file);
                        }}
                      />
                      {exerciseImageFiles.has(exercise.id) && (
                        <p className="text-sm text-gray-500">Сонгосон файл: {exerciseImageFiles.get(exercise.id)?.name}</p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 mb-4">
                    <Label>Сонголтууд</Label>
                    {exercise.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => updateExerciseOption(exercise.id, index, e.target.value)}
                        placeholder={`Сонголт ${index + 1}`}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`correct-answer-${exercise.id}`}>Зөв хариулт</Label>
                    <Input
                      id={`correct-answer-${exercise.id}`}
                      value={exercise.correctAnswer}
                      onChange={(e) => updateExercise(exercise.id, 'correctAnswer', e.target.value)}
                      placeholder="Зөв хариултыг оруулна уу (Сонголтуудаас нэг нь)"
                    />
                  </div>
                </Card>
              ))}
              {form.exercises.length === 0 && <p className="text-gray-500 text-center">Одоогоор дасгал байхгүй.</p>}
            </div>

            <Separator />

            {/* Additional Materials Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2 flex justify-between items-center">
                Нэмэлт Материал
                <Button type="button" onClick={addAdditionalMaterial} variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" /> Материал нэмэх
                </Button>
              </h3>
              {form.additionalMaterials.map((material) => (
                <Card key={material.id} className="p-4 bg-gray-50 shadow-sm relative">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeAdditionalMaterial(material.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor={`material-title-${material.id}`}>Гарчиг</Label>
                    <Input
                      id={`material-title-${material.id}`}
                      value={material.title}
                      onChange={(e) => updateAdditionalMaterial(material.id, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor={`material-type-${material.id}`}>Төрөл</Label>
                    <Select
                      value={material.type}
                      onValueChange={(value) => updateAdditionalMaterial(material.id, 'type', value as 'video' | 'pdf')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Видео</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {material.url && (
                    <div className="relative w-full h-48 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center mb-2">
                      {material.type === 'video' ? (
                        <video src={material.url} controls className="w-full h-full object-contain" />
                      ) : (
                        <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex flex-col items-center">
                          <FileText className="h-12 w-12 text-gray-600" />
                          <span className="mt-2 text-center">{material.title || 'PDF файл'}</span>
                        </a>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={() => updateAdditionalMaterial(material.id, 'url', '')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {!material.url && (
                    <div className="space-y-2">
                      <Label htmlFor={`material-file-${material.id}`}>Файл сонгох ({material.type === 'video' ? '.mp4, .mov' : '.pdf'})</Label>
                      <Input
                        id={`material-file-${material.id}`}
                        type="file"
                        accept={material.type === 'video' ? 'video/*' : 'application/pdf'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                          handleAdditionalMaterialFileUpload(material.id, file, material.type);
                        }}
                      />
                      {additionalMaterialFiles.has(material.id) && (
                        <p className="text-sm text-gray-500">Сонгосон файл: {additionalMaterialFiles.get(material.id)?.name}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
              {form.additionalMaterials.length === 0 && <p className="text-gray-500 text-center">Одоогоор нэмэлт материал байхгүй.</p>}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/moderator/lessons/view')}>
                Буцах
              </Button>
              <Button type="submit" disabled={saving || !hasChanges}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Хадгалж байна...
                  </>
                ) : (
                  'Хадгалах'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
// moderator/problems/add/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import LatexRenderer from '@/components/LatexRenderer';
import { uploadFileToR2 } from '@/lib/uploadFileToR2';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/AuthContext';
import { useCacheContext } from '@/lib/CacheContext';
import { TagsInput } from 'react-tag-input-component';


// --- Төрлийн тодорхойлолтууд (BloomLevel устгагдсан) ---
type DifficultyLevel = 'Амархан' | 'Дунд' | 'Хүнд' | '';
type ProblemType = 'Дасгал бодлого' | 'Олимпиадын бодлого' | 'Түгээмэл бодлого' | 'Сонирхолтой бодлого' | '';

interface Chapter {
  id: string;
  name: string;
  problemCount?: number;
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string;
  problemCount?: number;
}

interface FormData {
  title: string;
  problemText: string;
  problemImageFile: File | null;
  solutionText: string;
  solutionImageFile: File | null;
  correctAnswerInput: string;
  answerHint: string;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: DifficultyLevel;
  problemType: ProblemType;
  tags: string[];
  references: string;
  score: number;
}

// --- Кэшийн түлхүүрүүд ---
const FORM_CACHE_KEY = 'moderatorProblemAddForm';
const CHAPTERS_CACHE_KEY = 'cachedChaptersForProblems';
const SUBCHAPTERS_CACHE_KEY_PREFIX = 'cachedSubchaptersForProblems_';

export default function ProblemAddPage() {
  const { user } = useAuth();
  const { get, set, remove } = useCacheContext();

  const handleInputChange = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [form, setForm] = useState<FormData>(() => {
    const cachedForm = get<FormData>(FORM_CACHE_KEY);
    if (cachedForm) {
      return {
        ...cachedForm,
        problemImageFile: null,
        solutionImageFile: null,
        subtopic: '',
      };
    }
    return {
      title: '',
      problemText: '',
      problemImageFile: null,
      solutionText: '',
      solutionImageFile: null,
      correctAnswerInput: '',
      answerHint: '',
      subject: 'Физик',
      topic: '',
      subtopic: '',
      difficulty: '',
      problemType: '',
      tags: [],
      references: '',
      score: 1,
    };
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loadingSubchapters, setLoadingSubchapters] = useState<boolean>(false);

  useEffect(() => {
    const formToCache = { ...form };
    formToCache.problemImageFile = null;
    formToCache.solutionImageFile = null;

    set(FORM_CACHE_KEY, formToCache, { expiryMs: 3600000 });
  }, [form, set]);

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
  }, [get, set]);

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
          const q = query(collection(db, 'subchapters'), where('chapterId', '==', chapterId));
          const querySnapshot = await getDocs(q);
          const fetchedSubchapters: Subchapter[] = [];
          querySnapshot.forEach((doc) => {
            fetchedSubchapters.push({ id: doc.id, ...doc.data() } as Subchapter);
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
  }, [form.topic, chapters, get, set]);

  useEffect(() => {
    handleInputChange('subtopic', '');
    if (!form.topic) {
      setSubchapters([]);
    }
  }, [form.topic, handleInputChange]);

  const handleFileChange = useCallback((key: 'problemImageFile' | 'solutionImageFile', file: File | null) => {
    setForm((prev) => ({ ...prev, [key]: file }));
  }, []);

  const handleSave = async () => {
    if (!user || !user.uid) {
      toast.error('Нэвтэрнэ үү.');
      return;
    }
    setIsSaving(true);
    try {
      const problemImageUrl = form.problemImageFile ? await uploadFileToR2(form.problemImageFile) : null;
      const solutionImageUrl = form.solutionImageFile ? await uploadFileToR2(form.solutionImageFile) : null;

      const problemData = {
        title: form.title,
        problemText: form.problemText,
        problemImage: problemImageUrl,
        solutionText: form.solutionText,
        solutionImage: solutionImageUrl,
        correctAnswerInput: form.correctAnswerInput,
        answerHint: form.answerHint,
        subject: form.subject,
        topic: form.topic,
        subtopic: form.subtopic,
        difficulty: form.difficulty,
        problemType: form.problemType,
        tags: form.tags,
        references: form.references,
        score: form.score,
        createdAt: new Date(),
        moderatorUid: user.uid,
      };

      await addDoc(collection(db, 'problems'), problemData);
      toast.success('Бодлого амжилттай хадгаллаа!');

      try {
        const selectedChapter = chapters.find(chapter => chapter.name === form.topic);
        if (selectedChapter) {
          const chapterRef = doc(db, 'chapters', selectedChapter.id);
          await updateDoc(chapterRef, {
            problemCount: increment(1)
          });
          console.log(`Бүлэг "${selectedChapter.name}"-ийн problemCount нэмэгдлээ.`);
        } else {
          console.warn(`Бүлэг "${form.topic}" олдсонгүй, problemCount нэмэгдүүлээгүй.`);
        }

        const selectedSubchapter = subchapters.find(sub => sub.name === form.subtopic);
        if (selectedSubchapter) {
          const subchapterRef = doc(db, 'subchapters', selectedSubchapter.id);
          await updateDoc(subchapterRef, {
            problemCount: increment(1)
          });
          console.log(`Дэд бүлэг "${selectedSubchapter.name}"-ийн problemCount нэмэгдлээ.`);
        } else {
          console.warn(`Дэд бүлэг "${form.subtopic}" олдсонгүй, problemCount нэмэгдүүлээгүй.`);
        }
      } catch (countError) {
        console.error("ProblemCount-ийг шинэчлэхэд алдаа гарлаа:", countError);
        toast.error("ProblemCount-ийг шинэчлэхэд алдаа гарлаа.");
      }

      remove(FORM_CACHE_KEY);
      setForm({
        title: '',
        problemText: '',
        problemImageFile: null,
        solutionText: '',
        solutionImageFile: null,
        correctAnswerInput: '',
        answerHint: '',
        subject: 'Физик',
        topic: '',
        subtopic: '',
        difficulty: '',
        problemType: '',
        tags: [],
        references: '',
        score: 1,
      });
    } catch (e: unknown) {
      console.error("Алдаа гарлаа: ", e);
      toast.error('Бодлого хадгалахад алдаа гарлаа');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Бодлого оруулах</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="title">Гарчиг</Label>
                <Input id="title" value={form.title} onChange={(e) => handleInputChange('title', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="score">Оноо</Label>
                <Input id="score" type="number" value={form.score} onChange={(e) => handleInputChange('score', Number(e.target.value))} />
              </div>
            </div>

            <Label htmlFor="problemText">Бодлого (Latex)</Label>
            <Textarea id="problemText" value={form.problemText} onChange={(e) => handleInputChange('problemText', e.target.value)} />
            <Label htmlFor="problemImage">Бодлогын зураг</Label>
            <Input id="problemImage" type="file" accept="image/*" onChange={(e) => handleFileChange('problemImageFile', e.target.files?.[0] || null)} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="subject">Хичээл</Label>
                <Input id="subject" value={form.subject} onChange={(e) => handleInputChange('subject', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="problemType">Бодлогын төрөл</Label>
                <Select value={form.problemType} onValueChange={(v: ProblemType) => handleInputChange('problemType', v)}>
                  <SelectTrigger id="problemType" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Төрөл сонгоно уу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Дасгал бодлого">Дасгал бодлого</SelectItem>
                    <SelectItem value="Олимпиадын бодлого">Олимпиадын бодлого</SelectItem>
                    <SelectItem value="Түгээмэл бодлого">Түгээмэл бодлого</SelectItem>
                    <SelectItem value="Сонирхолтой бодлого">Сонирхолтой бодлого</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    {/* Placeholder-ийг тогтмол болгосон */}
                    <SelectValue placeholder="Бүлэг сонгоно уу" />
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
                    {/* Placeholder-ийг тогтмол болгосон */}
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

            <div className="grid grid-cols-1 gap-2">
              <div>
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
              </div>
            </div>

            <Label htmlFor="correctAnswerInput">Зөв хариулт (Latex)</Label>
            <Textarea id="correctAnswerInput" value={form.correctAnswerInput} onChange={(e) => handleInputChange('correctAnswerInput', e.target.value)} />

            <Label htmlFor="answerHint">Хариултын заавар / зөвлөгөө (Latex)</Label>
            <Textarea id="answerHint" value={form.answerHint} onChange={(e) => handleInputChange('answerHint', e.target.value)} />

            <Label htmlFor="solutionText">Бодолт (Latex)</Label>
            <Textarea id="solutionText" value={form.solutionText} onChange={(e) => handleInputChange('solutionText', e.target.value)} />
            <Label htmlFor="solutionImage">Бодолтын зураг</Label>
            <Input id="solutionImage" type="file" accept="image/*" onChange={(e) => handleFileChange('solutionImageFile', e.target.files?.[0] || null)} />

            <Label htmlFor="references">Эх сурвалж / Лавлах материал</Label>
            <Input id="references" value={form.references} onChange={(e) => handleInputChange('references', e.target.value)} />

            <div>
              <Label htmlFor="tags">Түлхүүр үгс (Tags)</Label>
              <TagsInput
                value={form.tags}
                onChange={(newTags) => handleInputChange('tags', newTags)}
                name="tags"
                placeHolder="Тагуудаа нэмнэ үү (Enter дарах)"
              />
            </div>

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Хадгалж байна...' : 'Бодлого хадгалах'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview хэсэг (Bloom-ийн мэдээлэл устгагдсан) */}
      <div>
        <Card>
          <CardHeader><CardTitle>Бодлогын Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><b>Гарчиг:</b> {form.title}</p>
            <p><b>Бодлого:</b></p>
            <LatexRenderer text={form.problemText} />
            {form.problemImageFile && (
              <div className="relative w-full h-64">
                <Image src={URL.createObjectURL(form.problemImageFile)} alt="Бодлогын зураг" fill style={{ objectFit: 'contain' }} className="rounded border" />
              </div>
            )}
            <p><b>Зөв хариулт:</b></p>
            <LatexRenderer text={form.correctAnswerInput} />
            <p><b>Хариултын заавар:</b></p>
            <LatexRenderer text={form.answerHint} />
            <p><b>Бодолт:</b></p>
            <LatexRenderer text={form.solutionText} />
            {form.solutionImageFile && (
              <div className="relative w-full h-64">
                <Image src={URL.createObjectURL(form.solutionImageFile)} alt="Бодолтын зураг" fill style={{ objectFit: 'contain' }} className="rounded border" />
              </div>
            )}
            <p><b>Хичээл:</b> {form.subject}</p>
            <p><b>Сэдэв:</b> {form.topic}</p>
            <p><b>Дэд сэдэв:</b> {form.subtopic}</p>
            <p><b>Оноо:</b> {form.score}</p>
            <p><b>Хүндрэл:</b> {form.difficulty}</p>
            <p><b>Төрөл:</b> {form.problemType}</p>
            <p><b>Эх сурвалж:</b> {form.references}</p>
            <p><b>Түлхүүр үгс:</b> {form.tags.join(', ')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCacheContext } from '@/lib/CacheContext';

// Өөрчлөгдсөн TYPEs
type AnswerType = 'choice-single' | 'choice-multiple' | 'input' | 'problem' | 'experiment' | 'truefalse';
type BloomLevel = 'СЭРГЭЭН САНАХ' | 'ОЙЛГОХ' | 'ХЭРЭГЛЭХ' | 'ЗАДЛАН ШИНЖЛЭХ' | 'ҮНЭЛЭХ' | 'БҮТЭЭХ' | '';
type DifficultyLevel = 'Амархан' | 'Дунд' | 'Хүнд' | '';
type SourceType = 'IGCSE' | 'IB' | 'NEET' | 'JEE' | 'AS LEVEL' | 'A LEVEL' | 'RUSSIA' | 'AP' | 'SAT' | 'MONGOL' | '';
type SubjectType = 'Математик' | 'Хими' | 'Биологи' | 'Физик';

interface Chapter {
  id: string;
  name: string;
  quizCount?: number;
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string;
  quizCount?: number;
}

interface FormData {
  questionNumber: string;
  question: string;
  questionImageFile: File | null;
  answerType: AnswerType;
  options: string[];
  correctAnswerSingle: string;
  correctAnswerMultiple: string[];
  correctAnswerText: string;
  correctAnswerTrueFalse: 'true' | 'false' | '';
  imageFiles: (File | null)[];
  explanation: string;
  explanationImage: File | null;
  subject: SubjectType;
  topic: string;
  subtopic: string;
  bloom: BloomLevel;
  difficulty: DifficultyLevel;
  score: number;
  source: SourceType;
  timeLimit: number;
  tableAnswerJson: string;
}

const FORM_CACHE_KEY = 'teacherTestPageForm';
const CHAPTERS_CACHE_KEY = 'cachedChapters';
const SUBCHAPTERS_CACHE_KEY_PREFIX = 'cachedSubchapters_';

export default function TeacherTestPage() {
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
        questionImageFile: null,
        explanationImage: null,
        imageFiles: cachedForm.imageFiles.map(() => null),
        subtopic: '',
      };
    }
    return {
      questionNumber: '',
      question: '',
      questionImageFile: null,
      answerType: 'choice-single',
      options: ['', '', '', '', '', ''],
      correctAnswerSingle: 'A',
      correctAnswerMultiple: [],
      correctAnswerText: '',
      correctAnswerTrueFalse: '',
      imageFiles: [null, null, null, null, null, null],
      explanation: '',
      explanationImage: null,
      subject: 'Физик', // Анхны утгыг "Физик" болгосон
      topic: '',
      subtopic: '',
      bloom: '',
      difficulty: '',
      score: 1,
      source: '',
      timeLimit: 0,
      tableAnswerJson: '',
    };
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [loadingSubchapters, setLoadingSubchapters] = useState<boolean>(false);

  useEffect(() => {
    const formToCache = { ...form };
    formToCache.questionImageFile = null;
    formToCache.explanationImage = null;
    formToCache.imageFiles = formToCache.imageFiles.map(() => null);

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

  const handleFileChange = useCallback((key: 'questionImageFile' | 'explanationImage', file: File | null) => {
    setForm((prev) => ({ ...prev, [key]: file }));
  }, []);

  const handleOptionTextChange = useCallback((index: number, value: string) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    handleInputChange('options', newOptions);
  }, [form.options, handleInputChange]);

  const handleOptionImageChange = useCallback((index: number, file: File | null) => {
    const newImageFiles = [...form.imageFiles];
    newImageFiles[index] = file;
    handleInputChange('imageFiles', newImageFiles);
  }, [form.imageFiles, handleInputChange]);

  const handleSave = async () => {
    if (!user || !user.uid) {
      toast.error('Нэвтэрнэ үү.');
      return;
    }
    setIsSaving(true);
    try {
      const questionImageUrl = form.questionImageFile ? await uploadFileToR2(form.questionImageFile) : null;
      const explanationImageUrl = form.explanationImage ? await uploadFileToR2(form.explanationImage) : null;
      const optionImageUrls = await Promise.all(
        form.imageFiles.map((f) => (f ? uploadFileToR2(f) : Promise.resolve(null)))
      );

      let correctAnswerToSend: string | string[] = '';
      if (form.answerType === 'choice-single') {
        correctAnswerToSend = form.correctAnswerSingle;
      } else if (form.answerType === 'choice-multiple') {
        correctAnswerToSend = form.correctAnswerMultiple.sort().join(',');
      } else if (form.answerType === 'truefalse') {
        correctAnswerToSend = form.correctAnswerTrueFalse;
      } else {
        correctAnswerToSend = form.correctAnswerText;
      }

      // Бүлэг болон дэд бүлгийн ID-г хадгалах
      const selectedChapter = chapters.find(chapter => chapter.name === form.topic);
      const selectedSubchapter = subchapters.find(sub => sub.name === form.subtopic);

      const questionData = {
        questionNumber: parseInt(form.questionNumber) || 0,
        question: form.question,
        questionImage: questionImageUrl,
        answerType: form.answerType,
        options: form.options,
        optionImages: optionImageUrls,
        correctAnswer: correctAnswerToSend,
        explanation: form.explanation,
        explanationImage: explanationImageUrl,
        subject: form.subject,
        chapterId: selectedChapter?.id || null, // ID-г хадгалах
        subchapterId: selectedSubchapter?.id || null, // ID-г хадгалах
        bloom: form.bloom,
        difficulty: form.difficulty,
        score: form.score,
        source: form.source,
        timeLimit: form.timeLimit,
        tableAnswerJson: form.tableAnswerJson,
        createdAt: new Date(),
        moderatorUid: user.uid,
      };
      await addDoc(collection(db, 'test'), questionData);
      toast.success('Амжилттай хадгаллаа!');

      // Chapters болон Subchapters-ийн quizCount-ийг нэмэгдүүлэх хэсэг
      try {
        if (selectedChapter) {
          const chapterRef = doc(db, 'chapters', selectedChapter.id);
          await updateDoc(chapterRef, {
            quizCount: increment(1)
          });
          console.log(`Бүлэг "${selectedChapter.name}"-ийн quizCount нэмэгдлээ.`);
        } else {
          console.warn(`Бүлэг "${form.topic}" олдсонгүй, quizCount нэмэгдүүлээгүй.`);
        }

        if (selectedSubchapter) {
          const subchapterRef = doc(db, 'subchapters', selectedSubchapter.id);
          await updateDoc(subchapterRef, {
            quizCount: increment(1)
          });
          console.log(`Дэд бүлэг "${selectedSubchapter.name}"-ийн quizCount нэмэгдлээ.`);
        } else {
          console.warn(`Дэд бүлэг "${form.subtopic}" олдсонгүй, quizCount нэмэгдүүлээгүй.`);
        }
      } catch (countError) {
        console.error("QuizCount-ийг шинэчлэхэд алдаа гарлаа:", countError);
        toast.error("QuizCount-ийг шинэчлэхэд алдаа гарлаа.");
      }

      remove(FORM_CACHE_KEY);
      setForm({
        questionNumber: '',
        question: '',
        questionImageFile: null,
        answerType: 'choice-single',
        options: ['', '', '', '', '', ''],
        correctAnswerSingle: 'A',
        correctAnswerMultiple: [],
        correctAnswerText: '',
        correctAnswerTrueFalse: '',
        imageFiles: [null, null, null, null, null, null],
        explanation: '',
        explanationImage: null,
        subject: 'Физик',
        topic: '',
        subtopic: '',
        bloom: '',
        difficulty: '',
        score: 1,
        source: '',
        timeLimit: 0,
        tableAnswerJson: '',
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      toast.error('Алдаа гарлаа');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Тест оруулах</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="questionNumber">Асуултын №</Label>
                <Input id="questionNumber" value={form.questionNumber} onChange={(e) => handleInputChange('questionNumber', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="answerType">Төрөл</Label>
                <Select value={form.answerType} onValueChange={(v: AnswerType) => handleInputChange('answerType', v)}>
                  <SelectTrigger id="answerType" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Тестийн төрөл" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choice-single">Нэг сонголттой</SelectItem>
                    <SelectItem value="choice-multiple">Олон сонголттой</SelectItem>
                    <SelectItem value="input">Нөхөх</SelectItem>
                    <SelectItem value="problem">Бодлого</SelectItem>
                    <SelectItem value="experiment">Туршилт</SelectItem>
                    <SelectItem value="truefalse">Үнэн / Худал</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Хичээл</Label>
                <Select value={form.subject} onValueChange={(v: SubjectType) => handleInputChange('subject', v)}>
                  <SelectTrigger id="subject" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Хичээл сонгоно уу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Математик">Математик</SelectItem>
                    <SelectItem value="Хими">Хими</SelectItem>
                    <SelectItem value="Биологи">Биологи</SelectItem>
                    <SelectItem value="Физик">Физик</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="score">Оноо</Label>
                <Input id="score" type="number" value={form.score} onChange={(e) => handleInputChange('score', Number(e.target.value))} />
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
                  <SelectValue placeholder={!form.topic && loadingChapters ? "Ачаалж байна..." : "Бүлэг сонгоно уу"} />
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
                  <SelectValue
  placeholder={
    form.topic && loadingSubchapters
      ? "Дэд бүлэг ачаалж байна..."
      : !form.topic
        ? "Эхлээд бүлэг сонгоно уу"
        : form.topic && !loadingSubchapters && subchapters.length === 0
          ? "Дэд бүлэг байхгүй"
          : "Дэд бүлэг сонгоно уу"
  }
/>
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

            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="bloom">Bloom&apos;s</Label>
                <Select value={form.bloom} onValueChange={(v: BloomLevel) => handleInputChange('bloom', v)}>
                  <SelectTrigger id="bloom" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Bloom&apos;s" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="СЭРГЭЭН САНАХ">СЭРГЭЭН САНАХ</SelectItem>
                    <SelectItem value="ОЙЛГОХ">ОЙЛГОХ</SelectItem>
                    <SelectItem value="ХЭРЭГЛЭХ">ХЭРЭГЛЭХ</SelectItem>
                    <SelectItem value="ЗАДЛАН ШИНЖЛЭХ">ЗАДЛАН ШИНЖЛЭХ</SelectItem>
                    <SelectItem value="ҮНЭЛЭХ">ҮНЭЛЭХ</SelectItem>
                    <SelectItem value="БҮТЭЭХ">БҮТЭЭХ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Хүндрэл</Label>
                <Select value={form.difficulty} onValueChange={(v: DifficultyLevel) => handleInputChange('difficulty', v)}>
                  <SelectTrigger id="difficulty" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Хүндрэл" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="амархан">Амархан</SelectItem>
                    <SelectItem value="дунд">Дунд</SelectItem>
                    <SelectItem value="хүнд">Хүнд</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeLimit">Хугацаа (сек)</Label>
                <Input id="timeLimit" type="number" value={form.timeLimit} onChange={(e) => handleInputChange('timeLimit', Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select value={form.source} onValueChange={(v: SourceType) => handleInputChange('source', v)}>
                  <SelectTrigger id="source" className="w-full overflow-hidden whitespace-nowrap text-ellipsis">
                    <SelectValue placeholder="Эх сурвалж" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IGCSE">IGCSE</SelectItem>
                    <SelectItem value="IB">IB</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="AS LEVEL">AS LEVEL</SelectItem>
                    <SelectItem value="A LEVEL">A LEVEL</SelectItem>
                    <SelectItem value="RUSSIA">RUSSIA</SelectItem>
                    <SelectItem value="AP">AP</SelectItem>
                    <SelectItem value="SAT">SAT</SelectItem>
                    <SelectItem value="MONGOL">MONGOL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Label htmlFor="question">Асуулт</Label>
            <Textarea id="question" value={form.question} onChange={(e) => handleInputChange('question', e.target.value)} />
            <Label htmlFor="questionImage">Асуултын зураг</Label>
            <Input id="questionImage" type="file" accept="image/*" onChange={(e) => handleFileChange('questionImageFile', e.target.files?.[0] || null)} />

            {(form.answerType === 'choice-single' || form.answerType === 'choice-multiple') && (
              <>
                <Label>Сонголтууд</Label>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span>{String.fromCharCode(65 + i)}.</span>
                    <Input
                      value={form.options[i]}
                      onChange={(e) => handleOptionTextChange(i, e.target.value)}
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleOptionImageChange(i, e.target.files?.[0] || null)}
                    />
                  </div>
                ))}

                {form.answerType === 'choice-single' && (
                  <>
                    <Label>Зөв хариулт</Label>
                    <RadioGroup
                      value={form.correctAnswerSingle}
                      onValueChange={(v: string) => handleInputChange('correctAnswerSingle', v)}
                      className="grid grid-cols-5 gap-2"
                    >
                      {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                        <div
                          key={opt}
                          className="flex items-center justify-center border rounded-md p-2 cursor-pointer
                                     hover:bg-primary/10 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
                                     aria-checked:bg-primary aria-checked:text-primary-foreground transition-colors"
                          data-state={form.correctAnswerSingle === opt ? 'checked' : 'unchecked'}
                          onClick={() => handleInputChange('correctAnswerSingle', opt)}
                        >
                          <RadioGroupItem value={opt} id={`single-choice-${opt}`} className="sr-only" />
                          <Label htmlFor={`single-choice-${opt}`} className="cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </>
                )}

{form.answerType === 'choice-multiple' && (
  <>
    <Label>Зөв хариултууд</Label>
    <div className="grid grid-cols-5 gap-2">
      {['A', 'B', 'C', 'D', 'E'].map((opt) => {
        const isSelected = form.correctAnswerMultiple.includes(opt);
        return (
          <Button
            key={opt}
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            className="w-full"
            onClick={() => {
              const updated = isSelected
                ? form.correctAnswerMultiple.filter((v) => v !== opt)
                : [...form.correctAnswerMultiple, opt];
              handleInputChange('correctAnswerMultiple', updated);
            }}
          >
            {opt}
          </Button>
        );
      })}
    </div>
  </>
)}
              </>
            )}

            {(form.answerType === 'input' || form.answerType === 'problem' || form.answerType === 'experiment') && (
              <>
                <Label htmlFor="correctAnswerText">Зөв хариулт (Latex)</Label>
                <Textarea id="correctAnswerText" value={form.correctAnswerText} onChange={(e) => handleInputChange('correctAnswerText', e.target.value)} />
              </>
            )}

{form.answerType === 'truefalse' && (
  <>
    <Label>Зөв хариулт</Label>
    <div className="grid grid-cols-2 gap-4 max-w-sm">
      {[
        { value: 'true', label: 'Үнэн' },
        { value: 'false', label: 'Худал' },
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          className={`py-2 rounded border text-center font-medium ${
            form.correctAnswerTrueFalse === item.value
              ? 'bg-black text-white'
              : 'bg-white text-black border-gray-300'
          }`}
          onClick={() => handleInputChange('correctAnswerTrueFalse', item.value as 'true' | 'false')}
        >
          {item.label}
        </button>
      ))}
    </div>
  </>
)}

            <Label htmlFor="explanation">Бодолт (Latex)</Label>
            <Textarea id="explanation" value={form.explanation} onChange={(e) => handleInputChange('explanation', e.target.value)} />
            <Label htmlFor="explanationImage">Бодолтын зураг</Label>
            <Input id="explanationImage" type="file" accept="image/*" onChange={(e) => handleFileChange('explanationImage', e.target.files?.[0] || null)} />
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Хадгалж байна...' : 'Хадгалах'}</Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><b>Асуулт:</b></p>
            <LatexRenderer text={form.question} />
            {form.questionImageFile && (
              <div className="relative w-full h-64">
                <Image src={URL.createObjectURL(form.questionImageFile)} alt="Асуултын зураг" fill style={{ objectFit: 'contain' }} className="rounded border" />
              </div>
            )}
            {(form.answerType === 'choice-single' || form.answerType === 'choice-multiple') && form.options.slice(0, 5).map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span>{String.fromCharCode(65 + idx)}.</span>
                <LatexRenderer text={opt} />
                {form.imageFiles[idx] && (
                  <div className="relative w-20 h-20">
                    <Image src={URL.createObjectURL(form.imageFiles[idx]!)} alt={`Сонголтын зураг ${idx + 1}`} fill style={{ objectFit: 'contain' }} className="rounded border" />
                  </div>
                )}
              </div>
            ))}
            <p><b>Зөв хариулт:</b>{' '}
              {form.answerType === 'choice-single' && form.correctAnswerSingle}
              {form.answerType === 'choice-multiple' && form.correctAnswerMultiple.sort().join(', ')}
              {(form.answerType === 'input' || form.answerType === 'problem' || form.answerType === 'experiment') && <LatexRenderer text={form.correctAnswerText} />}
              {form.answerType === 'truefalse' && (form.correctAnswerTrueFalse === 'true' ? 'Үнэн' : form.correctAnswerTrueFalse === 'false' ? 'Худал' : '')}
            </p>
            <p><b>Бодолт:</b></p>
            <LatexRenderer text={form.explanation} />
            {form.explanationImage && (
              <div className="relative w-full h-64">
                <Image src={URL.createObjectURL(form.explanationImage)} alt="Бодолтын зураг" fill style={{ objectFit: 'contain' }} className="rounded border" />
              </div>
            )}
            <p><b>Хичээл:</b> {form.subject}</p>
            <p><b>Сэдэв:</b> {form.topic}</p>
            <p><b>Дэд сэдэв:</b> {form.subtopic}</p>
            <p><b>Оноо:</b> {form.score}</p>
            <p><b>Bloom&apos;s:</b> {form.bloom}</p>
            <p><b>Хүндрэл:</b> {form.difficulty}</p>
            <p><b>Source:</b> {form.source}</p>
            <p><b>Хугацаа:</b> {form.timeLimit} сек</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
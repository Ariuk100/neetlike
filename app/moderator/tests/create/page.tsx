// app/moderator/tests/create/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image'; // next/image-г импортлосон
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import LatexRenderer from '@/components/LatexRenderer'; // LatexRenderer компонентыг импортлосон
import { uploadFileToR2 } from '@/lib/uploadFileToR2'; // R2 Storage руу файл байршуулах функц
import { db } from '@/lib/firebase'; // Firestore instance
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'sonner'; // sonner toast-ийг импортлосон
import { useAuth } from '@/app/context/AuthContext'; // useAuth-г импортлосон

export default function TeacherTestPage() {
  const { user } = useAuth(); // Нэвтэрсэн хэрэглэгчийн мэдээллийг авах
  const [form, setForm] = useState({
    questionNumber: '' as string | number, // Шинээр нэмэгдсэн: Асуултын дугаар
    question: '',
    questionImageFile: null as File | null,
    answerType: 'choice-single',
    options: ['', '', '', '', '', ''],
    correctAnswer: '',
    imageFiles: [null, null, null, null, null, null] as (File | null)[],
    explanation: '',
    explanationImage: null as File | null,
    subject: '',
    topic: '',
    subtopic: '',
    bloom: '',
    difficulty: '',
    score: 1,
    source: '',
    timeLimit: 0,
    tableAnswerJson: '',
  });
  const [isSaving, setIsSaving] = useState(false); // Хадгалах үйлдэл хийгдэж байгаа эсэхийг хянах

  const handleInputChange = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user || !user.uid) {
      toast.error('Хэрэглэгч нэвтрээгүй байна. Та нэвтэрнэ үү.');
      return;
    }

    setIsSaving(true); // Хадгалах үйлдэл эхэллээ
    try {
      // Асуултын зургийг R2 руу байршуулах
      const questionImageUrl = form.questionImageFile
        ? await uploadFileToR2(form.questionImageFile)
        : null;
  
      // Бодолтын зургийг R2 руу байршуулах
      const explanationImageUrl = form.explanationImage
        ? await uploadFileToR2(form.explanationImage)
        : null;
  
      // Сонголтуудын зургуудыг R2 руу байршуулах
      const optionImageUrls = await Promise.all(
        form.imageFiles.map((file) =>
          file ? uploadFileToR2(file) : Promise.resolve(null)
        )
      );
  
      // Firestore-д хадгалах өгөгдлийг бэлдэнэ
      const questionData = {
        questionNumber: typeof form.questionNumber === 'string' ? parseInt(form.questionNumber) : form.questionNumber, // Дугаарыг тоо болгож хадгалах
        question: form.question,
        questionImage: questionImageUrl,
        answerType: form.answerType,
        options: form.options,
        optionImages: optionImageUrls,
        correctAnswer: form.correctAnswer,
        explanation: form.explanation,
        explanationImage: explanationImageUrl,
        subject: form.subject,
        topic: form.topic,
        subtopic: form.subtopic,
        bloom: form.bloom,
        difficulty: form.difficulty,
        score: form.score,
        source: form.source,
        timeLimit: form.timeLimit,
        tableAnswerJson: form.tableAnswerJson || '',
        createdAt: new Date(), // Үүсгэсэн огноог нэмсэн
        moderatorUid: user.uid, // Нэвтэрсэн модераторын UID-г хадгалах
      };
  
      // Firestore руу хадгалах
      const docRef = await addDoc(collection(db, 'test'), questionData);
      console.log('Амжилттай хадгаллаа:', docRef.id);
      console.log('Firestore-д хадгалах өгөгдөл:', questionData);
      toast.success('Тест амжилттай хадгалагдлаа!'); // Амжилттай хадгалсан тухай мэдэгдэл
      
      // Формыг цэвэрлэх
      setForm({
        questionNumber: '',
        question: '',
        questionImageFile: null,
        answerType: 'choice-single',
        options: ['', '', '', '', '', ''],
        correctAnswer: '',
        imageFiles: [null, null, null, null, null, null],
        explanation: '',
        explanationImage: null,
        subject: '',
        topic: '',
        subtopic: '',
        bloom: '',
        difficulty: '',
        score: 1,
        source: '',
        timeLimit: 0,
        tableAnswerJson: '',
      });

    } catch (err: unknown) {
      const errorAsAny = err as { message?: string };
      console.error('Хадгалахад алдаа гарлаа:', errorAsAny);
      // Хэрэглэгчид мэдэгдэл өгөх
      toast.error(`Хадгалахад алдаа гарлаа: ${errorAsAny.message || 'Үл мэдэгдэх алдаа'}`);
    } finally {
      setIsSaving(false); // Хадгалах үйлдэл дууслаа
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto py-10 px-4">
      {/* Left: Form */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Тест оруулах</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="questionNumber">Асуултын дугаар</Label>
            <Input
              id="questionNumber"
              type="number"
              placeholder="Асуултын дугаар"
              value={form.questionNumber}
              onChange={(e) => handleInputChange('questionNumber', e.target.value)}
            />

            <Label htmlFor="answerType">Төрөл</Label>
            <Select value={form.answerType} onValueChange={(v) => handleInputChange('answerType', v)}>
              <SelectTrigger id="answerType"><SelectValue placeholder="Тестийн төрөл" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="choice-single">Нэг сонголттой</SelectItem>
                <SelectItem value="choice-multiple">Олон сонголттой</SelectItem>
                <SelectItem value="input">Нөхөх</SelectItem>
                <SelectItem value="problem">Бодолт</SelectItem>
                <SelectItem value="experiment">Туршилт</SelectItem>
                <SelectItem value="truefalse">Үнэн / Худал</SelectItem>
              </SelectContent>
            </Select>

            <Label htmlFor="question">Асуулт</Label>
            <Textarea
              id="question"
              placeholder="Асуултын текст (Latex ашиглаж болно)"
              value={form.question}
              onChange={(e) => handleInputChange('question', e.target.value)}
            />
            <Label htmlFor="questionImageFile">Асуултын зураг</Label>
            <Input id="questionImageFile" type="file" accept="image/*" onChange={(e) => handleInputChange('questionImageFile', e.target.files?.[0] || null)} />

            {(form.answerType === 'choice-single' || form.answerType === 'choice-multiple') && (
              <>
                <Label>Сонголтууд</Label>
                {form.options.slice(0, 5).map((opt, idx) => (
                  <div key={idx} className="flex flex-col gap-1 mb-2">
                    <Input
                      placeholder={`Сонголт ${String.fromCharCode(65 + idx)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...form.options];
                        newOpts[idx] = e.target.value;
                        handleInputChange('options', newOpts);
                      }}
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const newFiles = [...form.imageFiles];
                        newFiles[idx] = e.target.files?.[0] || null;
                        handleInputChange('imageFiles', newFiles);
                      }}
                    />
                  </div>
                ))}
                <Label htmlFor="correctAnswer">Зөв хариулт</Label>
                <Input id="correctAnswer" value={form.correctAnswer} onChange={(e) => handleInputChange('correctAnswer', e.target.value)} />
              </>
            )}

            {['input', 'problem', 'experiment'].includes(form.answerType) && (
              <>
                <Label htmlFor="correctAnswerInput">Зөв хариулт</Label>
                <Input id="correctAnswerInput" value={form.correctAnswer} onChange={(e) => handleInputChange('correctAnswer', e.target.value)} />
              </>
            )}

            {form.answerType === 'truefalse' && (
              <>
                <Label htmlFor="correctAnswerTrueFalse">Зөв хариулт</Label>
                <Select value={form.correctAnswer} onValueChange={(v) => handleInputChange('correctAnswer', v)}>
                  <SelectTrigger id="correctAnswerTrueFalse"><SelectValue placeholder="Зөв хариулт" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Үнэн</SelectItem>
                    <SelectItem value="false">Худал</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            <Label htmlFor="explanation">Бодолт</Label>
            <Textarea
              id="explanation"
              placeholder="Latex форматаар бодолт"
              value={form.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
            />
            <Label htmlFor="explanationImage">Бодолтын зураг</Label>
            <Input id="explanationImage" type="file" accept="image/*" onChange={(e) => handleInputChange('explanationImage', e.target.files?.[0] || null)} />

            <Label htmlFor="subject">Хичээл</Label>
            <Input id="subject" value={form.subject} onChange={(e) => handleInputChange('subject', e.target.value)} />
            <Label htmlFor="topic">Сэдэв</Label>
            <Input id="topic" value={form.topic} onChange={(e) => handleInputChange('topic', e.target.value)} />
            <Label htmlFor="subtopic">Дэд сэдэв</Label>
            <Input id="subtopic" value={form.subtopic} onChange={(e) => handleInputChange('subtopic', e.target.value)} />

            <Label htmlFor="score">Оноо</Label>
            <Input id="score" type="number" value={form.score} onChange={(e) => handleInputChange('score', Number(e.target.value))} />

            <Label htmlFor="bloom">Bloom&#39;s</Label>
            <Select value={form.bloom} onValueChange={(v) => handleInputChange('bloom', v)}>
              <SelectTrigger id="bloom"><SelectValue placeholder="Bloom&#39;s" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="МЭДЭХ">МЭДЭХ</SelectItem>
                <SelectItem value="ОЙЛГОХ">ОЙЛГОХ</SelectItem>
                <SelectItem value="ХЭРЭГЛЭХ">ХЭРЭГЛЭХ</SelectItem>
                <SelectItem value="ЗАДЛАН ШИНЖЛЭХ">ЗАДЛАН ШИНЖЛЭХ</SelectItem>
                <SelectItem value="ҮНЭЛЭХ">ҮНЭЛЭХ</SelectItem>
                <SelectItem value="БҮТЭЭХ">БҮТЭЭХ</SelectItem>
              </SelectContent>
            </Select>

            <Label htmlFor="difficulty">Хүндрэл</Label>
            <Select value={form.difficulty} onValueChange={(v) => handleInputChange('difficulty', v)}>
              <SelectTrigger id="difficulty"><SelectValue placeholder="Түвшин" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="амархан">Амархан</SelectItem>
                <SelectItem value="дунд">Дунд</SelectItem>
                <SelectItem value="хүнд">Хүнд</SelectItem>
              </SelectContent>
            </Select>

            <Label htmlFor="source">Source</Label>
            <Select value={form.source} onValueChange={(v) => handleInputChange('source', v)}>
              <SelectTrigger id="source"><SelectValue placeholder="Эх сурвалж" /></SelectTrigger>
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

            <Label htmlFor="timeLimit">Хугацаа (сек)</Label>
            <Input id="timeLimit" type="number" value={form.timeLimit} onChange={(e) => handleInputChange('timeLimit', Number(e.target.value))} />

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right: Preview */}
      <div>
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><b>Асуултын дугаар:</b> {form.questionNumber || '-'}</p>
            <p><b>Асуулт:</b></p>
            <LatexRenderer text={form.question} />
            {form.questionImageFile && (
              <div className="relative w-full h-64">
                <Image 
                  src={URL.createObjectURL(form.questionImageFile)} 
                  alt="Асуултын зураг" 
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded border" 
                />
              </div>
            )}
            {(form.answerType === 'choice-single' || form.answerType === 'choice-multiple') && form.options.slice(0, 5).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span>{String.fromCharCode(65 + idx)}.</span>
                <LatexRenderer text={opt} />
                {form.imageFiles[idx] && (
                  <div className="relative w-20 h-20">
                    <Image 
                      src={URL.createObjectURL(form.imageFiles[idx]!)} 
                      alt={`Сонголтын зураг ${idx + 1}`} 
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded border" 
                    />
                  </div>
                )}
              </div>
            ))}
            {['input', 'problem', 'experiment'].includes(form.answerType) && (
              <>
                <p><b>Зөв хариулт:</b></p>
                <LatexRenderer text={form.correctAnswer} />
              </>
            )}
            {form.answerType === 'truefalse' && (
              <p><b>Зөв хариулт:</b> {form.correctAnswer === 'true' ? '✓ Үнэн' : '✗ Худал'}</p>
            )}
            {form.explanation && (
              <div>
                <p><b>Бодолт:</b></p>
                <LatexRenderer text={form.explanation} />
              </div>
            )}
            {form.explanationImage && (
              <div className="relative w-full h-64">
                <Image 
                  src={URL.createObjectURL(form.explanationImage)} 
                  alt="Бодолтын зураг" 
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded border" 
                />
              </div>
            )}
            <p><b>Хичээл:</b> {form.subject || '-'}</p>
            <p><b>Сэдэв:</b> {form.topic || '-'}</p>
            <p><b>Дэд сэдэв:</b> {form.subtopic || '-'}</p>
            <p><b>Оноо:</b> {form.score}</p>
            <p><b>Bloom&#39;s:</b> {form.bloom || '-'}</p>
            <p><b>Хүндрэл:</b> {form.difficulty || '-'}</p>
            <p><b>Source:</b> {form.source || '-'}</p>
            <p><b>Хугацаа:</b> {form.timeLimit} сек</p>
            <p><b>Модераторын UID:</b> {user?.uid || '-'}</p> {/* Preview-д модераторын UID-г харуулах */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

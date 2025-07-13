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
import LatexRenderer from '@/components/LatexRenderer';
import { uploadFileToR2 } from '@/lib/uploadFileToR2';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';


export default function TeacherTestPage() {
  const [form, setForm] = useState({
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

  // 'value: any' -г 'value: unknown' болгон өөрчилсөн
  const handleInputChange = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      const questionImageUrl = form.questionImageFile
        ? await uploadFileToR2(form.questionImageFile)
        : null;
  
      const explanationImageUrl = form.explanationImage
        ? await uploadFileToR2(form.explanationImage)
        : null;
  
      const optionImageUrls = await Promise.all(
        form.imageFiles.map((file) =>
          file ? uploadFileToR2(file) : Promise.resolve(null)
        )
      );
  
      // Firestore-д хадгалах өгөгдлийг бэлдэнэ
      const questionData = {
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
        createdAt: new Date(),
      };
  
      // Firestore руу хадгалах
      const docRef = await addDoc(collection(db, 'test'), questionData);
      console.log('Амжилттай хадгаллаа:', docRef.id);
      console.log('Firestore-д хадгалах өгөгдөл:', questionData);
    } catch (err: unknown) {
      const errorAsAny = err as { message?: string };
      console.error('Хадгалахад алдаа гарлаа:', errorAsAny);
      // Хэрэглэгчид мэдэгдэл өгөх
      alert(`Хадгалахад алдаа гарлаа: ${errorAsAny.message || 'Үл мэдэгдэх алдаа'}`);
    }
  };


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto py-10">
      {/* Left: Form */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Тест оруулах</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label>Төрөл</Label>
            <Select value={form.answerType} onValueChange={(v) => handleInputChange('answerType', v)}>
              <SelectTrigger><SelectValue placeholder="Тестийн төрөл" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="choice-single">Нэг сонголттой</SelectItem>
                <SelectItem value="choice-multiple">Олон сонголттой</SelectItem>
                <SelectItem value="input">Нөхөх</SelectItem>
                <SelectItem value="problem">Бодолт</SelectItem>
                <SelectItem value="experiment">Туршилт</SelectItem>
                <SelectItem value="truefalse">Үнэн / Худал</SelectItem>
              </SelectContent>
            </Select>

            <Label>Асуулт</Label>
            <Textarea
              placeholder="Асуултын текст"
              value={form.question}
              onChange={(e) => handleInputChange('question', e.target.value)}
            />
            <Label>Асуултын зураг</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleInputChange('questionImageFile', e.target.files?.[0] || null)} />

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
                <Label>Зөв хариулт</Label>
                <Input value={form.correctAnswer} onChange={(e) => handleInputChange('correctAnswer', e.target.value)} />
              </>
            )}

            {['input', 'problem', 'experiment'].includes(form.answerType) && (
              <>
                <Label>Зөв хариулт</Label>
                <Input value={form.correctAnswer} onChange={(e) => handleInputChange('correctAnswer', e.target.value)} />
              </>
            )}

            {form.answerType === 'truefalse' && (
              <>
                <Label>Зөв хариулт</Label>
                <Select value={form.correctAnswer} onValueChange={(v) => handleInputChange('correctAnswer', v)}>
                  <SelectTrigger><SelectValue placeholder="Зөв хариулт" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Үнэн</SelectItem>
                    <SelectItem value="false">Худал</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            <Label>Бодолт</Label>
            <Textarea
              placeholder="Latex форматаар бодолт"
              value={form.explanation}
              onChange={(e) => handleInputChange('explanation', e.target.value)}
            />
            <Label>Бодолтын зураг</Label>
            <Input type="file" accept="image/*" onChange={(e) => handleInputChange('explanationImage', e.target.files?.[0] || null)} />

            <Label>Хичээл</Label>
            <Input value={form.subject} onChange={(e) => handleInputChange('subject', e.target.value)} />
            <Label>Сэдэв</Label>
            <Input value={form.topic} onChange={(e) => handleInputChange('topic', e.target.value)} />
            <Label>Дэд сэдэв</Label>
            <Input value={form.subtopic} onChange={(e) => handleInputChange('subtopic', e.target.value)} />

            <Label>Оноо</Label>
            <Input type="number" value={form.score} onChange={(e) => handleInputChange('score', Number(e.target.value))} />

            <Label>Bloom&#39;s</Label>
            <Select value={form.bloom} onValueChange={(v) => handleInputChange('bloom', v)}>
              <SelectTrigger><SelectValue placeholder="Bloom&#39;s" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="МЭДЭХ">МЭДЭХ</SelectItem>
                <SelectItem value="ОЙЛГОХ">ОЙЛГОХ</SelectItem>
                <SelectItem value="ХЭРЭГЛЭХ">ХЭРЭГЛЭХ</SelectItem>
                <SelectItem value="ЗАДЛАН ШИНЖЛЭХ">ЗАДЛАН ШИНЖЛЭХ</SelectItem>
                <SelectItem value="ҮНЭЛЭХ">ҮНЭЛЭХ</SelectItem>
                <SelectItem value="БҮТЭЭХ">БҮТЭЭХ</SelectItem>
              </SelectContent>
            </Select>

            <Label>Хүндрэл</Label>
            <Select value={form.difficulty} onValueChange={(v) => handleInputChange('difficulty', v)}>
              <SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="амархан">Амархан</SelectItem>
                <SelectItem value="дунд">Дунд</SelectItem>
                <SelectItem value="хүнд">Хүнд</SelectItem>
              </SelectContent>
            </Select>

            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => handleInputChange('source', v)}>
              <SelectTrigger><SelectValue placeholder="Эх сурвалж" /></SelectTrigger>
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

            <Label>Хугацаа (сек)</Label>
            <Input type="number" value={form.timeLimit} onChange={(e) => handleInputChange('timeLimit', Number(e.target.value))} />

            <Button onClick={handleSave}>Хадгалах</Button>
          </CardContent>
        </Card>
      </div>

      {/* Right: Preview */}
      <div>
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><b>Асуулт:</b></p>
            <LatexRenderer text={form.question} />
            {form.questionImageFile && (
              // Image компонент ашигласан
              <div className="relative w-full h-64"> {/* Эцэг элементийн хэмжээг тохируулсан */}
                <Image 
                  src={URL.createObjectURL(form.questionImageFile)} 
                  alt="Асуултын зураг" 
                  fill // Эцэг элементийн хэмжээг дүүргэнэ
                  style={{ objectFit: 'contain' }} // Зургийг хайчлахгүйгээр тааруулна
                  className="rounded border" 
                />
              </div>
            )}
            {(form.answerType === 'choice-single' || form.answerType === 'choice-multiple') && form.options.slice(0, 5).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span>{String.fromCharCode(65 + idx)}.</span>
                <LatexRenderer text={opt} />
                {form.imageFiles[idx] && (
                  // Image компонент ашигласан
                  <div className="relative w-20 h-20"> {/* Жижиг зургийн хэмжээг тохируулсан */}
                    <Image 
                      src={URL.createObjectURL(form.imageFiles[idx]!)} 
                      alt={`img-${idx}`} 
                      fill // Эцэг элементийн хэмжээг дүүргэнэ
                      style={{ objectFit: 'contain' }} // Зургийг хайчлахгүйгээр тааруулна
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
              // Image компонент ашигласан
              <div className="relative w-full h-64"> {/* Эцэг элементийн хэмжээг тохируулсан */}
                <Image 
                  src={URL.createObjectURL(form.explanationImage)} 
                  alt="Бодолтын зураг" 
                  fill // Эцэг элементийн хэмжээг дүүргэнэ
                  style={{ objectFit: 'contain' }} // Зургийг хайчлахгүйгээр тааруулна
                  className="rounded border" 
                />
              </div>
            )}
            <p><b>Хичээл:</b> {form.subject}</p>
            <p><b>Сэдэв:</b> {form.topic}</p>
            <p><b>Дэд сэдэв:</b> {form.subtopic}</p>
            <p><b>Оноо:</b> {form.score}</p>
            <p><b>Bloom&#39;s:</b> {form.bloom}</p>
            <p><b>Хүндрэл:</b> {form.difficulty}</p>
            <p><b>Source:</b> {form.source}</p>
            <p><b>Хугацаа:</b> {form.timeLimit} сек</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

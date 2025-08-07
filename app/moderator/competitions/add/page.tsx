'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { 
  ChoiceSingleForm, 
  ProblemForm, 
  OrderingForm, 
  MatchingForm,
  TrueOrFalseForm,
  FillInTheBlankForm,
} from '@/components/questiontype';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// R2-д хуулах функцийг энд түр хувилбараар оруулсан.
async function uploadFileToR2(file: File): Promise<string> {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
  console.log(`R2 руу файл хуулж байна: ${fileName}`);
  
  return Promise.resolve(`uploads/${fileName}`);
}

type TargetAudience = '6-р анги' | '7-р анги' | '8-р анги' | '9-р анги' | '10-р анги' | '11-р анги' | '12-р анги' | 'Багш';
type QuestionType = 'choice-single' | 'problem' | 'true-or-false' | 'ordering' | 'matching' | 'fillblank' | 'numerical' | 'hotspot'; // 'hotspot'-ийг нэмсэн

interface Option {
  text: string;
  mediaUrl: string | null;
  mediaFile: File | null;
}

interface OrderingItem {
  id: string;
  text: string;
  mediaUrl: string | null;
  mediaFile: File | null;
}

interface MatchingPair {
  leftId: string;
  leftText: string;
  leftMediaFile: File | null;
  leftMediaUrl: string | null;
  rightId: string;
  rightText: string;
  rightMediaFile: File | null;
  rightMediaUrl: string | null;
}

interface FirestoreOrderingItem {
  id: string;
  text: string;
  mediaUrl: string | null;
}

interface FirestoreMatchingItem {
  id: string;
  text: string;
  mediaUrl: string | null;
}

interface Hotspot {
  id: string;
  text: string; // Энэ нь хариултын текст эсвэл шошго байж болно
  coords: string; // Жишээ нь: "x1,y1,x2,y2"
}

interface QuestionData {
  questionText: string;
  questionMediaUrl: string | null;
  questionFile: File | null;
  options?: Option[];
  orderedItems?: OrderingItem[];
  matchingPairs?: MatchingPair[];
  hotspots?: Hotspot[]; // Шинэ hotspots-ийг нэмсэн
  correctAnswer: string | string[] | { [key: string]: string } | { value: number; tolerance?: number; unit?: string } | string;
  explanationText: string;
  explanationMediaUrl: string | null;
  explanationFile: File | null;
}

export default function AddCompetitionPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [competitionName, setCompetitionName] = useState('');
  const [competitionDescription, setCompetitionDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('choice-single');

  const handleSaveCompetition = async () => {
    if (!user || !user.uid) {
      toast.error('Нэвтэрнэ үү.');
      return;
    }
    if (!competitionName || !startDate || !endDate || !targetAudience) {
      toast.error('Бүх талбарыг бөглөнө үү.');
      return;
    }
    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'competitions'), {
        name: competitionName,
        description: competitionDescription,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetAudience,
        moderatorUid: user.uid,
        createdAt: new Date(),
      });
      setCompetitionId(docRef.id);
      toast.success('Тэмцээн амжилттай үүслээ. Одоо асуултуудаа нэмнэ үү.');
    } catch (e) {
      console.error("Тэмцээн нэмэхэд алдаа гарлаа: ", e);
      toast.error('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestion = async (data: QuestionData) => {
    if (!competitionId) {
      toast.error('Тэмцээнийг эхлээд хадгална уу.');
      return;
    }
    setIsSaving(true);
    try {
      let questionMediaUrl = data.questionMediaUrl;
      if (data.questionFile) {
        questionMediaUrl = await uploadFileToR2(data.questionFile);
      }

      let explanationMediaUrl = data.explanationMediaUrl;
      if (data.explanationFile) {
        explanationMediaUrl = await uploadFileToR2(data.explanationFile);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const questionDataToSave: { [key: string]: any } = {
        competitionId,
        questionText: data.questionText,
        questionMediaUrl,
        questionType: selectedQuestionType,
        questionNumber,
        score: 1,
        createdAt: new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let correctAnswerForFirestore: any = data.correctAnswer;

      if (selectedQuestionType === 'choice-single' && data.options) {
        const optionUploadPromises = data.options.map(async (option) => {
          let mediaUrl = option.mediaUrl;
          if (option.mediaFile) {
            mediaUrl = await uploadFileToR2(option.mediaFile);
          }
          return { text: option.text, mediaUrl };
        });
        questionDataToSave.options = (await Promise.all(optionUploadPromises)).filter(opt => opt.text || opt.mediaUrl);
      } else if (selectedQuestionType === 'ordering' && data.orderedItems) {
        const itemUploadPromises = data.orderedItems.map(async (item) => {
          let mediaUrl = item.mediaUrl;
          if (item.mediaFile) {
            mediaUrl = await uploadFileToR2(item.mediaFile);
          }
          return { id: item.id, text: item.text, mediaUrl };
        });
        questionDataToSave.items = (await Promise.all(itemUploadPromises)).filter(item => item.text || item.mediaUrl);
        correctAnswerForFirestore = questionDataToSave.items.map((item: FirestoreOrderingItem) => item.id).join(',');
      } else if (selectedQuestionType === 'matching' && data.matchingPairs) {
        const leftItems: FirestoreMatchingItem[] = [];
        const rightItems: FirestoreMatchingItem[] = [];
        const correctMatches: { [key: string]: string } = {};

        const pairUploadPromises = data.matchingPairs.map(async (pair) => {
          let leftMediaUrl = pair.leftMediaUrl;
          if (pair.leftMediaFile) {
            leftMediaUrl = await uploadFileToR2(pair.leftMediaFile);
          }
          let rightMediaUrl = pair.rightMediaUrl;
          if (pair.rightMediaFile) {
            rightMediaUrl = await uploadFileToR2(pair.rightMediaFile);
          }

          leftItems.push({ id: pair.leftId, text: pair.leftText, mediaUrl: leftMediaUrl });
          rightItems.push({ id: pair.rightId, text: pair.rightText, mediaUrl: rightMediaUrl });
          correctMatches[pair.leftId] = pair.rightId;
        });

        await Promise.all(pairUploadPromises);
        
        questionDataToSave.leftItems = leftItems.filter(item => item.text || item.mediaUrl);
        questionDataToSave.rightItems = rightItems.filter(item => item.text || item.mediaUrl);
        correctAnswerForFirestore = correctMatches;
      } else if (selectedQuestionType === 'hotspot' && data.hotspots) {
          questionDataToSave.hotspots = data.hotspots;
          correctAnswerForFirestore = data.correctAnswer;
      }

      const questionDocRef = await addDoc(collection(db, 'competition_questions'), questionDataToSave);

      await addDoc(collection(db, 'competition_answers'), {
        questionId: questionDocRef.id,
        correctAnswer: correctAnswerForFirestore,
        explanation: data.explanationText,
        explanationMediaUrl: explanationMediaUrl,
        createdAt: new Date(),
      });

      toast.success(`Асуулт №${questionNumber} амжилттай нэмэгдлээ.`);
      setQuestionNumber(prev => prev + 1);
    } catch (e) {
      console.error("Асуулт нэмэхэд алдаа гарлаа: ", e);
      toast.error('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishCompetition = () => {
    router.push('/moderator');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {!competitionId ? (
        <Card>
          <CardHeader>
            <CardTitle>Шинэ тэмцээн үүсгэх</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="competitionName">Тэмцээний нэр</Label>
              <Input id="competitionName" value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="competitionDescription">Тайлбар</Label>
              <Textarea id="competitionDescription" value={competitionDescription} onChange={(e) => setCompetitionDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="targetAudience">Зорилтот түвшин</Label>
              <Select value={targetAudience} onValueChange={(v: TargetAudience) => setTargetAudience(v)}>
                <SelectTrigger id="targetAudience">
                  <SelectValue placeholder="Ангилал сонгоно уу" />
                </SelectTrigger>
                <SelectContent>
                  {['6-р анги', '7-р анги', '8-р анги', '9-р анги', '10-р анги', '11-р анги', '12-р анги', 'Багш'].map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Эхлэх огноо</Label>
                <Input id="startDate" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="endDate">Дуусах огноо</Label>
                <Input id="endDate" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSaveCompetition} disabled={isSaving || !competitionName || !startDate || !endDate || !targetAudience}>
              {isSaving ? 'Хадгалж байна...' : 'Дараах'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Тэмцээн: {competitionName}</CardTitle>
            <p className="text-sm text-gray-500">Асуулт №{questionNumber}</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="questionType">Асуултын төрөл</Label>
              <Select value={selectedQuestionType} onValueChange={(v: QuestionType) => setSelectedQuestionType(v)}>
                <SelectTrigger id="questionType">
                  <SelectValue placeholder="Төрөл сонгоно уу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="choice-single">Нэг сонголттой</SelectItem>
                  <SelectItem value="problem">Бодлого</SelectItem>
                  <SelectItem value="ordering">Дарааллуулж байрлуулах</SelectItem>
                  <SelectItem value="matching">Тааруулах</SelectItem>
                  <SelectItem value="true-or-false">Үнэн эсвэл худaл</SelectItem>
                  <SelectItem value="fillblank">Нөхөх</SelectItem>
                  <SelectItem value="numerical">Тоон хариулт</SelectItem>
                  <SelectItem value="hotspot">Зурган дээр ажиллах</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedQuestionType === 'choice-single' && (
              <ChoiceSingleForm onSave={handleSaveQuestion} isSaving={isSaving} />
            )}
            {selectedQuestionType === 'problem' && (
              <ProblemForm onSave={handleSaveQuestion} isSaving={isSaving} />
            )}
            {selectedQuestionType === 'ordering' && (
              <OrderingForm onSave={handleSaveQuestion} isSaving={isSaving} />
            )}
            {selectedQuestionType === 'matching' && (
              <MatchingForm onSave={handleSaveQuestion} isSaving={isSaving} />
            )}
            {selectedQuestionType === 'true-or-false' && (
              <TrueOrFalseForm onSave={handleSaveQuestion} isSaving={isSaving} />
            )}
            {selectedQuestionType === 'fillblank' && (
              <FillInTheBlankForm onSave={handleSaveQuestion} isSaving={isSaving} />
            )}
          </CardContent>
          <div className="flex gap-2 p-6 pt-0">
            <Button onClick={handleFinishCompetition} variant="outline">
              Тэмцээн үүсгэж дуусах
            </Button>
          </div>
        </Card>
      )}
      <Button
        variant="outline"
        onClick={() => router.push('/moderator')}
        className="mt-4"
      >
        Буцах
      </Button>
    </div>
  );
}
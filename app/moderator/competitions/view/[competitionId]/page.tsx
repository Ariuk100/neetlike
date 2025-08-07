'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  orderBy,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

interface Competition {
  id: string;
  name: string;
  description: string;
}

interface FirestoreQuestion extends DocumentData {
  id: string;
  competitionId: string;
  questionText: string;
  questionNumber: number;
  questionType: string;
  questionMediaUrl: string | null;
  options?: { value: string; label: string }[];
  orderedItems?: string[];
  matchingPairs?: { item1: string; item2: string }[];
}

export default function ModeratorCompetitionQuestionsPage() {
  const router = useRouter();
  const { competitionId } = useParams() as { competitionId: string };

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [questions, setQuestions] = useState<FirestoreQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [questionToDeleteId, setQuestionToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!competitionId) {
      toast.error('Тэмцээний ID олдсонгүй.');
      router.push('/moderator/competitions/view');
      return;
    }

    const fetchCompetitionData = async () => {
      setLoading(true);
      try {
        const competitionDocRef = doc(db, 'competitions', competitionId);
        const competitionDocSnap = await getDoc(competitionDocRef);

        if (competitionDocSnap.exists()) {
          setCompetition({ id: competitionDocSnap.id, ...competitionDocSnap.data() } as Competition);
        } else {
          toast.error('Тэмцээн олдсонгүй.');
          router.push('/moderator/competitions/view');
          return;
        }

        const questionsQuery = query(
          collection(db, 'competition_questions'),
          where('competitionId', '==', competitionId),
          orderBy('questionNumber')
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        const fetchedQuestions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FirestoreQuestion[];
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error('Тэмцээн эсвэл асуулт татахад алдаа гарлаа:', error);
        toast.error('Мэдээлэл татахад алдаа гарлаа.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitionData();
  }, [competitionId, router]);

  const handleDeleteQuestion = async () => {
    if (!questionToDeleteId) return;

    setIsDeleting(true);
    try {
      const questionDocRef = doc(db, 'competition_questions', questionToDeleteId);
      const answersQuery = query(collection(db, 'competition_answers'), where('questionId', '==', questionToDeleteId));
      const answersSnapshot = await getDocs(answersQuery);
      
      await deleteDoc(questionDocRef);
      if (!answersSnapshot.empty) {
        await deleteDoc(answersSnapshot.docs[0].ref);
      }

      setQuestions(prev => prev.filter(q => q.id !== questionToDeleteId));
      toast.success('Асуулт амжилттай устгагдлаа.');
      setQuestionToDeleteId(null);
    } catch (error) {
      console.error('Асуулт устгахад алдаа гарлаа:', error);
      toast.error('Асуулт устгахад алдаа гарлаа.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 text-center">
        <h1 className="text-2xl font-bold">Тэмцээн олдсонгүй</h1>
        <Button onClick={() => router.push('/moderator/dashboard')} className="mt-4">Буцах</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            {competition.name}
            {/* Асуулт нэмэх товчийг хассан */}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{competition.description}</p>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-4">Асуултууд ({questions.length})</h2>

      <div className="space-y-4">
        {questions.map((question) => (
          <div key={question.id} className="flex items-center gap-4 p-4 border rounded-md">
            <div className="flex-1">
              <p className="font-bold">Асуулт №{question.questionNumber} - ({question.questionType})</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                {question.questionText}
              </p>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => setQuestionToDeleteId(question.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Та устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Энэ асуултыг устгаснаар буцааж сэргээх боломжгүй болно. Та үнэхээр устгахыг хүсэж байна уу?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setQuestionToDeleteId(null)}>Болих</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={handleDeleteQuestion}
                        disabled={isDeleting}
                        variant="destructive"
                      >
                        {isDeleting ? 'Устгаж байна...' : 'Устгах'}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
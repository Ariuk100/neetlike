'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Archive, Loader2, RotateCcw } from 'lucide-react'; // RotateCcw иконыг нэмсэн
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Competition {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetAudience: string;
  isArchived?: boolean;
}

export default function ModeratorCompetitionsViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [competitionToDeleteId, setCompetitionToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const fetchCompetitions = async () => {
      setLoading(true);
      try {
        const competitionsRef = collection(db, 'competitions');
        const q = query(competitionsRef, where('moderatorUid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedCompetitions = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
            targetAudience: data.targetAudience,
            isArchived: data.isArchived || false,
          };
        }) as Competition[];
        setCompetitions(fetchedCompetitions);
      } catch (error) {
        console.error('Тэмцээнүүд татахад алдаа гарлаа:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [user, authLoading, router]);

  const handleDeleteCompetition = async () => {
    if (!competitionToDeleteId) return;

    setIsDeleting(true);
    try {
      const questionsQuery = query(collection(db, 'competition_questions'), where('competitionId', '==', competitionToDeleteId));
      const questionsSnapshot = await getDocs(questionsQuery);

      for (const qDoc of questionsSnapshot.docs) {
        const answersQuery = query(collection(db, 'competition_answers'), where('questionId', '==', qDoc.id));
        const answersSnapshot = await getDocs(answersQuery);
        for (const aDoc of answersSnapshot.docs) {
          await deleteDoc(aDoc.ref);
        }
        await deleteDoc(qDoc.ref);
      }

      const competitionDocRef = doc(db, 'competitions', competitionToDeleteId);
      await deleteDoc(competitionDocRef);
      
      setCompetitions(prev => prev.filter(c => c.id !== competitionToDeleteId));
      toast.success('Тэмцээн амжилттай устгагдлаа.');
      setCompetitionToDeleteId(null);
    } catch (error) {
      console.error('Тэмцээн устгахад алдаа гарлаа:', error);
      toast.error('Тэмцээн устгахад алдаа гарлаа.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveCompetition = async (competitionId: string, isArchived: boolean) => {
    setIsArchiving(true);
    try {
      const competitionDocRef = doc(db, 'competitions', competitionId);
      await updateDoc(competitionDocRef, { isArchived: !isArchived });

      setCompetitions(prev => 
        prev.map(c => 
          c.id === competitionId ? { ...c, isArchived: !isArchived } : c
        )
      );
      toast.success(isArchived ? 'Тэмцээний архивыг цуцалж, идэвхтэй болголоо.' : 'Тэмцээнийг амжилттай архивдлаа.');
    } catch (error) {
      console.error('Тэмцээн архивлахад алдаа гарлаа:', error);
      toast.error('Тэмцээн архивлахад алдаа гарлаа.');
    } finally {
      setIsArchiving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Таны үүсгэсэн тэмцээнүүд</h1>
        <Button onClick={() => router.push('/moderator/competitions/add')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Шинэ тэмцээн үүсгэх
        </Button>
      </div>

      {competitions.length === 0 ? (
        <div className="text-center p-10 border rounded-md">
          <p className="text-lg text-gray-500">Та одоогоор ямар ч тэмцээн үүсгээгүй байна.</p>
          <Button onClick={() => router.push('/moderator/competitions/add')} className="mt-4">
            Эхний тэмцээнээ үүсгэх
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {competitions.map((competition) => (
            <Card key={competition.id} className="relative">
              <div 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors p-6"
                onClick={() => router.push(`/moderator/competitions/view/${competition.id}`)}
              >
                <CardHeader className="p-0 mb-2">
                  <CardTitle className={`flex items-center ${competition.isArchived ? 'text-gray-400' : ''}`}>
                    {competition.name}
                    {competition.isArchived && <span className="ml-2 text-sm text-gray-500">[Архивлагдсан]</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p className={`${competition.isArchived ? 'line-through text-gray-400' : ''}`}>{competition.description}</p>
                  <div className={`flex justify-between text-xs ${competition.isArchived ? 'text-gray-400' : ''}`}>
                    <span>Эхлэх: {competition.startDate.toLocaleDateString()}</span>
                    <span>Дуусах: {competition.endDate.toLocaleDateString()}</span>
                    <span>Түвшин: {competition.targetAudience}</span>
                  </div>
                </CardContent>
              </div>
              <div className="absolute top-2 right-2 flex gap-2">
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveCompetition(competition.id, competition.isArchived || false);
                  }}
                  disabled={isArchiving}
                >
                  {competition.isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompetitionToDeleteId(competition.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Та устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Энэ тэмцээнийг устгаснаар бүх асуулт, хариулт хамт устгагдах бөгөөд буцаах боломжгүй.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Болих</AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          onClick={handleDeleteCompetition}
                          disabled={isDeleting}
                          variant="destructive"
                        >
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ''}
                          Устгах
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
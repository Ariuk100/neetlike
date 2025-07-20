'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Firestore instance-ээ импортлох
import { useAuth } from '@/app/context/AuthContext'; // Хэрэглэгчийн мэдээллийг авах
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image'; // Image компонентыг импортлох
import LatexRenderer from '@/components/LatexRenderer'; // LatexRenderer-ийг импортлосон
import { ScrollArea } from '@/components/ui/scroll-area'; // Скролл хийхэд зориулсан UI
import { Label } from '@/components/ui/label'; // Label компонентыг импортлосон

// Тестийн мэдээллийн төрөл
interface TestData {
  id: string;
  questionNumber: number; // Асуултын дугаар
  questionText: string;
  moderatorUid: string; // Модераторын UID
  moderatorName?: string; // Шинээр нэмэгдсэн: Модераторын нэр
  questionType?: string;
  options?: string[];
  correctAnswer?: string;
  difficulty?: string;
  tags?: string[];
  createdAt?: Date; // Firestore Timestamp-ээс хөрвүүлэгдсэн Date
  questionImage?: string; // R2 дээрх зургийн key (imageKey)
  optionImages?: string[]; // Сонголтын зургуудын key-үүд
  explanation?: string; // Бодолтын текст
  explanationImage?: string; // Бодолтын зургийн key
  subject?: string; // Хичээл
  topic?: string; // Сэдэв
  subtopic?: string; // Дэд сэдэв
  bloom?: string; // Bloom's
  source?: string; // Эх сурвалж
  score?: number; // Оноо
  timeLimit?: number; // Хугацаа
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Бусад талбарудыг хүлээн авах
}

// Firestore Timestamp-ээс Date объект руу хөрвүүлэх туслах функц
const convertToDate = (timestamp: Date | { toDate: () => Date } | string | number | undefined | null): Date | undefined => {
  if (!timestamp) {
    return undefined;
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'object' && timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    const parsedDate = new Date(timestamp);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  console.warn('Unknown timestamp format for createdAt:', timestamp);
  return undefined;
};

// Cloudflare R2-ийн public access тохиргоо (client-side)
const NEXT_PUBLIC_R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID; 
const NEXT_PUBLIC_R2_BUCKET = process.env.NEXT_PUBLIC_R2_BUCKET; 

export default function ModeratorTestsViewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [allTests, setAllTests] = useState<TestData[]>([]);
  const [loadingTests, setLoadingTests] = useState(true); // Энэ нь бүх ачааллын төлөвийг хянана
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Шинэ төлөв: Анхны ачаалалт уу?
  const [selectedTest, setSelectedTest] = useState<TestData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Хэрэглэгчийн эрхийг шалгах useEffect
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'moderator' && user.role !== 'admin'))) {
      router.push('/unauthorized'); // Зөвшөөрөлгүй бол буцаана
    }
  }, [user, authLoading, router]);

  // Firestore-оос тестүүдийг татах
  useEffect(() => {
    if (!authLoading && user && (user.role === 'moderator' || user.role === 'admin')) {
      if (!db) {
        setError("Firestore database not initialized.");
        setLoadingTests(false);
        setIsInitialLoad(false); 
        return;
      }

      setLoadingTests(true); 
      setError(null);

      const testsColRef = collection(db, 'test'); 
      const q = query(testsColRef);

      const unsubscribe = onSnapshot(q, async (snapshot) => { 
        const testsList: TestData[] = [];
        const moderatorUids = new Set<string>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const testItem: TestData = {
            id: doc.id,
            questionNumber: data.questionNumber || 0,
            questionText: data.question || 'Асуултын текст байхгүй',
            moderatorUid: data.moderatorUid || 'Үл мэдэгдэх UID',
            questionType: data.answerType,
            options: data.options,
            correctAnswer: data.correctAnswer,
            difficulty: data.difficulty,
            tags: data.tags,
            createdAt: convertToDate(data.createdAt),
            questionImage: data.questionImage || undefined,
            optionImages: (Array.isArray(data.optionImages) ? data.optionImages.map(String) : undefined),
            explanation: data.explanation || undefined,
            explanationImage: data.explanationImage || undefined,
            subject: data.subject || undefined,
            topic: data.topic || undefined,
            subtopic: data.subtopic || undefined,
            bloom: data.bloom || undefined,
            source: data.source || undefined,
            score: data.score || undefined,
            timeLimit: data.timeLimit || undefined,
            ...data
          };
          testsList.push(testItem);
          if (testItem.moderatorUid && testItem.moderatorUid !== 'Үл мэдэгдэх UID') {
            moderatorUids.add(testItem.moderatorUid);
          }
        });

        const moderatorNamesMap = new Map<string, string>();
        if (moderatorUids.size > 0) {
          const userPromises = Array.from(moderatorUids).map(async (uid) => {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              return { uid, name: userData.name || userData.email || 'Нэргүй' };
            }
            return { uid, name: 'Олдсонгүй' };
          });
          const fetchedUsers = await Promise.all(userPromises);
          fetchedUsers.forEach(user => moderatorNamesMap.set(user.uid, user.name));
        }

        const testsListWithNames = testsList.map(test => ({
          ...test,
          moderatorName: moderatorNamesMap.get(test.moderatorUid) || test.moderatorUid.substring(0, 8) + '...'
        }));

        testsListWithNames.sort((a, b) => a.questionNumber - b.questionNumber);
        setAllTests(testsListWithNames);
        setLoadingTests(false);

        // Maximum update depth exceeded алдааг зассан: Зөвхөн анхны ачааллаар сонгоно
        if (isInitialLoad && testsListWithNames.length > 0 && !selectedTest) {
          setSelectedTest(testsListWithNames[0]);
        }
        setIsInitialLoad(false); // Анхны ачаалалт дууслаа

      }, (err) => {
        console.error("Error fetching tests:", err);
        setError("Firestore-оос тестүүдийг татахад алдаа гарлаа: " + err.message);
        setLoadingTests(false);
        setIsInitialLoad(false); 
      });

      return () => unsubscribe();
    }
  }, [user, authLoading, isInitialLoad, selectedTest]); // db-г хассан, selectedTest-ийг нэмсэн


  // R2 public URL-ийг үүсгэх функц
  const getR2PublicImageUrl = useCallback((imageKey?: string): string | null => {
    console.log("--- getR2PublicImageUrl Called ---"); 
    console.log("Input imageKey:", imageKey); 
    console.log("NEXT_PUBLIC_R2_ACCOUNT_ID:", NEXT_PUBLIC_R2_ACCOUNT_ID); 
    console.log("NEXT_PUBLIC_R2_BUCKET:", NEXT_PUBLIC_R2_BUCKET); 

    if (!imageKey || !NEXT_PUBLIC_R2_ACCOUNT_ID) { // NEXT_PUBLIC_R2_BUCKET-ийг энд шалгахгүй
      console.log("getR2PublicImageUrl: Missing imageKey or R2 Account ID. Returning null."); 
      return null;
    }

    const cleanedImageKey = imageKey.trim(); // 'let' to 'const'

    // Хэрэв imageKey нь аль хэдийн бүрэн URL байвал түүнийг шууд буцаана.
    if (cleanedImageKey.startsWith('http://') || cleanedImageKey.startsWith('https://')) {
      console.log(`getR2PublicImageUrl: imageKey '${cleanedImageKey}' is already a full URL. Returning directly.`); 
      return cleanedImageKey;
    }

    // Cloudflare R2 Public Development URL-ийн зөв бүтцийг ашиглана:
    // https://pub-<ACCOUNT_ID>.r2.dev/<OBJECT_KEY>
    // Энд OBJECT_KEY нь bucket доторх файлын бүрэн зам (жишээ нь: uploads/image.jpg)
    const imageUrl = `https://pub-${NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.dev/${cleanedImageKey}`;
    console.log(`getR2PublicImageUrl: Constructed URL for key '${cleanedImageKey}': ${imageUrl}`); 
    return imageUrl;
  }, []); // NEXT_PUBLIC_R2_ACCOUNT_ID-г хассан


  // Pagination logic
  const totalPages = Math.ceil(allTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTests = useMemo(() => allTests.slice(startIndex, endIndex), [allTests, startIndex, endIndex]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedTest(null); // Хуудас солигдоход сонголтыг арилгах
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Эхний хуудас руу буцах
    setSelectedTest(null); // Хуудас солигдоход сонголтыг арилгах
  };

  // Зөвхөн анхны ачааллаар Skeleton харуулна
  if (authLoading || isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Skeleton className="h-10 w-1/2" />
      </div>
    );
  }

  if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
    return (
      <div className="p-4 text-red-500 text-center bg-gray-50 min-h-screen flex items-center justify-center">
        Зөвшөөрөлгүй хандалт. Та энэ хуудсанд нэвтрэх эрхгүй байна.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] p-4 gap-4 bg-gray-50">
      {/* Зүүн талын самбар: Тестийн жагсаалт */}
      <Card className="w-full md:w-2/5 lg:w-1/3 flex flex-col">
        <CardHeader>
          <CardTitle className="text-center">Тестийн жагсаалт</CardTitle>
          <CardDescription className="text-center">Бүх тестүүдийн жагсаалт болон хуудаслалт.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          {error && (
            <div className="text-red-500 text-center p-4">
              Алдаа: {error}
            </div>
          )}
          {loadingTests ? ( // loadingTests-ийг ашиглаж байгаа хэсэг
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <>
              {allTests.length === 0 ? (
                <p className="text-center text-gray-500 p-4">Тест олдсонгүй.</p>
              ) : (
                <ScrollArea className="h-[calc(100vh-250px)]"> {/* Жагсаалтын өндрийг тохируулах */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Дугаар</TableHead>
                        <TableHead>Асуулт</TableHead>
                        <TableHead className="w-[120px]">Модератор</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentTests.map((test) => (
                        <TableRow
                          key={test.id}
                          onClick={() => setSelectedTest(test)}
                          className={`cursor-pointer hover:bg-gray-100 ${
                            selectedTest?.id === test.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <TableCell className="font-medium">{String(test.questionNumber)}</TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]"><LatexRenderer text={test.questionText} /></TableCell>
                          <TableCell className="text-sm truncate">{test.moderatorName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4 p-2 border-t">
                <div className="flex items-center gap-2">
                  <Label htmlFor="items-per-page">Нэг хуудсанд:</Label>
                  <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Баруун талын самбар: Сонгосон тестийн дэлгэрэнгүй мэдээлэл */}
      <Card className="w-full md:w-3/5 lg:w-2/3 flex flex-col">
        <CardHeader>
          <CardTitle className="text-center">Сонгосон тестийн дэлгэрэнгүй мэдээлэл</CardTitle>
          <CardDescription className="text-center">Сонгосон тестийн бүх талбарууд.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4">
          {!selectedTest ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Дэлгэрэнгүй мэдээлэл харахын тулд зүүн талаас тест сонгоно уу.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Шинээр нэмэгдсэн: Тестийн үндсэн мэдээллийн хүснэгт */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="font-semibold pr-2 py-1">Төрөл:</td>
                      <td className="py-1">{selectedTest.questionType || '-'}</td>
                      <td className="font-semibold pr-2 py-1">Хичээл:</td>
                      <td className="py-1">{selectedTest.subject || '-'}</td>
                      <td className="font-semibold pr-2 py-1">Сэдэв:</td>
                      <td className="py-1">{selectedTest.topic || '-'}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold pr-2 py-1">Дэд сэдэв:</td>
                      <td className="py-1">{selectedTest.subtopic || '-'}</td>
                      <td className="font-semibold pr-2 py-1">Хүндрэл:</td>
                      <td className="py-1">{selectedTest.difficulty || '-'}</td>
                      <td className="font-semibold pr-2 py-1">Bloom&#39;s:</td>
                      <td className="py-1">{selectedTest.bloom || '-'}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold pr-2 py-1">Source:</td>
                      <td className="py-1">{selectedTest.source || '-'}</td>
                      <td className="font-semibold pr-2 py-1">Оноо:</td>
                      <td className="py-1">{selectedTest.score || '-'}</td>
                      <td className="font-semibold pr-2 py-1">Хугацаа:</td>
                      <td className="py-1">{selectedTest.timeLimit !== undefined ? `${selectedTest.timeLimit} сек` : '-'}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold pr-2 py-1">Үүсгэсэн огноо:</td>
                      <td className="py-1" colSpan={5}>
                        {selectedTest.createdAt && selectedTest.createdAt instanceof Date ? selectedTest.createdAt.toLocaleDateString() + ' ' + selectedTest.createdAt.toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Хүснэгт дууссан */}

              <p><b>Асуултын дугаар:</b> {selectedTest.questionNumber}</p>
              <p><b>Модератор:</b> {selectedTest.moderatorName}</p> {/* Нэрийг харуулах */}
              <p><b>Асуулт:</b></p>
              <LatexRenderer text={selectedTest.questionText} />

              {selectedTest.questionImage && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Асуултын зураг:</h3>
                  <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    <Image
                      src={getR2PublicImageUrl(selectedTest.questionImage) || 'https://placehold.co/600x400/e0e0e0/555555?text=Зураг+байхгүй'}
                      alt={`Тестийн зураг: ${selectedTest.questionNumber}`}
                      fill 
                      style={{ objectFit: 'contain' }} 
                      className="rounded-md"
                      onError={(e) => {
                        console.error(`Image load error for question image '${selectedTest.questionImage}':`, e);
                        e.currentTarget.src = 'https://placehold.co/600x400/e0e0e0/555555?text=Зураг+байхгүй';
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedTest.options && selectedTest.options.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold">Хариултын сонголтууд:</p>
                  {selectedTest.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full border ${
                        option === selectedTest.correctAnswer ? 'bg-green-500 text-white border-green-600' : 'bg-gray-200 text-gray-700 border-gray-300'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <LatexRenderer text={option} />
                      {selectedTest.optionImages && selectedTest.optionImages[idx] && (
                        <div className="relative w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center shadow-sm">
                          <Image
                            src={getR2PublicImageUrl(selectedTest.optionImages[idx]) || 'https://placehold.co/150x100/e0e0e0/555555?text=Сонголт+Зураг+байхгүй'}
                            alt={`Сонголтын зураг ${idx + 1}`}
                            fill 
                            style={{ objectFit: 'contain' }} 
                            className="rounded-md"
                            onError={(e) => {
                              console.error(`Image load error for option image '${selectedTest.optionImages?.[idx]}':`, e);
                              e.currentTarget.src = 'https://placehold.co/150x100/e0e0e0/555555?text=Сонголт+Зураг+байхгүй';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="font-semibold text-green-600">Зөв хариулт: <LatexRenderer text={selectedTest.correctAnswer || '-'} /></p>

              {selectedTest.explanation && (
                <div>
                  <p><b>Бодолт:</b></p>
                  <LatexRenderer text={selectedTest.explanation} />
                </div>
              )}
              {selectedTest.explanationImage && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Бодолтын зураг:</h3>
                  <div className="relative w-full h-64 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    <Image
                      src={getR2PublicImageUrl(selectedTest.explanationImage) || 'https://placehold.co/600x400/e0e0e0/555555?text=Зураг+байхгүй'}
                      alt={`Бодолтын зураг: ${selectedTest.questionNumber}`}
                      fill 
                      style={{ objectFit: 'contain' }} 
                      className="rounded-md"
                      onError={(e) => {
                        console.error(`Image load error for explanation image '${selectedTest.explanationImage}':`, e);
                        e.currentTarget.src = 'https://placehold.co/600x400/e0e0e0/555555?text=Зураг+байхгүй';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

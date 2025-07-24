'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Chapter {
  id: string;
  name: string;
  createdAt?: Date;
  subchapterCount: number;
  lessonCount: number;
  assignmentCount: number;
  videoCount: number;
  problemCount: number;
  quizCount: number;
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string;
  createdAt?: Date;
  lessonCount: number;
  assignmentCount: number;
  videoCount: number;
  problemCount: number;
  quizCount: number;
}

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [newChapterName, setNewChapterName] = useState('');
  const [newSubchapterName, setNewSubchapterName] = useState('');
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  useEffect(() => {
    if (selectedChapterId) fetchSubchapters(selectedChapterId);
  }, [selectedChapterId]);

  const fetchChapters = async () => {
    const snapshot = await getDocs(collection(db, 'chapters'));
    const chapterList: Chapter[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as { name: string; createdAt?: Timestamp };
      const chapterId = docSnap.id;

      const [sub, les, assn, vid, prob, quiz] = await Promise.all([
        countDocs('subchapters', chapterId),
        countDocs('lessons', chapterId),
        countDocs('assignments', chapterId),
        countDocs('videos', chapterId),
        countDocs('problems', chapterId),
        countDocs('test', chapterId),
      ]);

      chapterList.push({
        id: chapterId,
        name: data.name,
        createdAt: data.createdAt?.toDate(),
        subchapterCount: sub,
        lessonCount: les,
        assignmentCount: assn,
        videoCount: vid,
        problemCount: prob,
        quizCount: quiz,
      });
    }

    setChapters(chapterList);
  };

  const fetchSubchapters = async (chapterId: string) => {
    const q = query(collection(db, 'subchapters'), where('chapterId', '==', chapterId));
    const snapshot = await getDocs(q);
    const subList: Subchapter[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as { name: string; chapterId: string; createdAt?: Timestamp };
      const subId = docSnap.id;

      const [les, assn, vid, prob, quiz] = await Promise.all([
        countDocs('lessons', chapterId, subId),
        countDocs('assignments', chapterId, subId),
        countDocs('videos', chapterId, subId),
        countDocs('problems', chapterId, subId),
        countDocs('test', chapterId, subId),
      ]);

      subList.push({
        id: subId,
        name: data.name,
        chapterId: data.chapterId,
        createdAt: data.createdAt?.toDate(),
        lessonCount: les,
        assignmentCount: assn,
        videoCount: vid,
        problemCount: prob,
        quizCount: quiz,
      });
    }
    setSubchapters(subList);
  };

  const countDocs = async (collectionName: string, chapterId: string, subchapterId?: string): Promise<number> => {
    let q = query(collection(db, collectionName), where('chapterId', '==', chapterId));
    if (subchapterId) q = query(q, where('subchapterId', '==', subchapterId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  };

  const addChapter = async () => {
    if (!newChapterName.trim()) return;
    const newId = crypto.randomUUID();
    await setDoc(doc(db, 'chapters', newId), {
      name: newChapterName.trim(),
      createdAt: Timestamp.now(),
    });
    setNewChapterName('');
    fetchChapters();
  };

  const deleteChapter = async (chapterId: string) => {
    await deleteDoc(doc(db, 'chapters', chapterId));
    if (selectedChapterId === chapterId) setSelectedChapterId(null);
    fetchChapters();
    setSubchapters([]);
  };

  const addSubchapter = async () => {
    if (!selectedChapterId || !newSubchapterName.trim()) return;
    const newId = crypto.randomUUID();
    await setDoc(doc(db, 'subchapters', newId), {
      name: newSubchapterName.trim(),
      chapterId: selectedChapterId,
      createdAt: Timestamp.now(),
    });
    setNewSubchapterName('');
    fetchSubchapters(selectedChapterId);
    fetchChapters();
  };

  const confirmDeleteSubchapter = (subId: string) => setConfirmDeleteSubId(subId);

  const deleteSubchapter = async () => {
    if (!confirmDeleteSubId) return;
    await deleteDoc(doc(db, 'subchapters', confirmDeleteSubId));
    if (selectedChapterId) fetchSubchapters(selectedChapterId);
    fetchChapters();
    setConfirmDeleteSubId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h1 className="text-xl font-semibold mb-4">Бүлгүүд</h1>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Шинэ бүлгийн нэр"
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
          />
          <Button onClick={addChapter}>Нэмэх</Button>
        </div>

        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Нэр</th>
              <th className="p-2 border">Дэд бүлэг</th>
              <th className="p-2 border">Хичээл</th>
              <th className="p-2 border">Даалгавар</th>
              <th className="p-2 border">Бичлэг</th>
              <th className="p-2 border">Бодлого</th>
              <th className="p-2 border">Тест</th>
              <th className="p-2 border">✂</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter) => (
              <tr
                key={chapter.id}
                className={`border-t cursor-pointer ${selectedChapterId === chapter.id ? 'bg-blue-100' : ''}`}
              >
                <td
                  className="p-2 border font-medium"
                  onClick={() => setSelectedChapterId(chapter.id)}
                >
                  {chapter.name}
                </td>
                <td className="p-2 border text-center">{chapter.subchapterCount}</td>
                <td className="p-2 border text-center">{chapter.lessonCount}</td>
                <td className="p-2 border text-center">{chapter.assignmentCount}</td>
                <td className="p-2 border text-center">{chapter.videoCount}</td>
                <td className="p-2 border text-center">{chapter.problemCount}</td>
                <td className="p-2 border text-center">{chapter.quizCount}</td>
                <td className="p-2 border text-center">
                  <Button size="sm" variant="destructive" onClick={() => deleteChapter(chapter.id)}>
                    Устгах
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Дэд бүлгүүд</h2>
        {selectedChapterId ? (
          <>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Шинэ дэд бүлгийн нэр"
                value={newSubchapterName}
                onChange={(e) => setNewSubchapterName(e.target.value)}
              />
              <Button onClick={addSubchapter}>Нэмэх</Button>
            </div>
            <ul className="space-y-3">
              {subchapters.map((sub) => (
                <li key={sub.id} className="bg-gray-50 border px-3 py-2 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>{sub.name}</strong>
                      <div className="text-xs text-gray-600">
                        Хичээл: {sub.lessonCount} | Даалгавар: {sub.assignmentCount} | Бичлэг: {sub.videoCount} | Бодлого: {sub.problemCount} | Тест: {sub.quizCount}
                      </div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => confirmDeleteSubchapter(sub.id)}>
                      Устгах
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-gray-500">Бүлэг сонгогдоогүй байна.</p>
        )}
      </div>

      <Dialog open={!!confirmDeleteSubId} onOpenChange={() => setConfirmDeleteSubId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Устгах уу?</DialogTitle>
            <DialogDescription>
              Та энэ дэд бүлгийг устгахдаа итгэлтэй байна уу?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteSubId(null)}>Цуцлах</Button>
            <Button variant="destructive" onClick={deleteSubchapter}>Тийм, устга</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

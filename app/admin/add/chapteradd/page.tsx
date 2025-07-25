'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
  updateDoc,
  getDoc,
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
  description?: string;
  subchapterCount: number;
  lessonCount: number;
  assignmentCount: number;
  videoCount: number;
  problemCount: number;
  quizCount: number;
  order?: number; 
}

interface Subchapter {
  id: string;
  name: string;
  chapterId: string;
  createdAt?: Date;
  description?: string;
  lessonCount: number;
  assignmentCount: number;
  videoCount: number;
  problemCount: number;
  quizCount: number;
  order?: number; 
}

const subchapterCache: Record<string, Subchapter[]> = {};

export default function AdminChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterDescription, setNewChapterDescription] = useState('');
  const [newSubchapterName, setNewSubchapterName] = useState('');
  const [newSubchapterDescription, setNewSubchapterDescription] = useState('');
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  useEffect(() => {
    fetchChapters();
  }, []);

  useEffect(() => {
    if (selectedChapterId) fetchSubchapters(selectedChapterId);
  }, [selectedChapterId]);

  const fetchChapters = async () => {
    const snapshot = await getDocs(collection(db, 'chapters'));
    const chapterList: Chapter[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description || '',
        createdAt: data.createdAt?.toDate(),
        subchapterCount: data.subchapterCount || 0,
        lessonCount: data.lessonCount || 0,
        assignmentCount: data.assignmentCount || 0,
        videoCount: data.videoCount || 0,
        problemCount: data.problemCount || 0,
        quizCount: data.quizCount || 0,
        order: data.order || 0, 
      };
    });
    chapterList.sort((a, b) => (a.order || 0) - (b.order || 0));
    setChapters(chapterList);
  };

  const fetchSubchapters = async (chapterId: string) => {
    if (subchapterCache[chapterId]) {
      setSubchapters(subchapterCache[chapterId]);
      return;
    }
    const q = query(collection(db, 'subchapters'), where('chapterId', '==', chapterId));
    const snapshot = await getDocs(q);
    const subList: Subchapter[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        chapterId: data.chapterId,
        description: data.description || '',
        createdAt: data.createdAt?.toDate(),
        lessonCount: data.lessonCount || 0,
        assignmentCount: data.assignmentCount || 0,
        videoCount: data.videoCount || 0,
        problemCount: data.problemCount || 0,
        quizCount: data.quizCount || 0,
        order: data.order || 0, 
      };
    });
    subList.sort((a, b) => (a.order || 0) - (b.order || 0)); 
    subchapterCache[chapterId] = subList;
    setSubchapters(subList);
  };

  const addChapter = async () => {
    if (!newChapterName.trim()) return;
    const newId = crypto.randomUUID();
    await setDoc(doc(db, 'chapters', newId), {
      name: newChapterName.trim(),
      description: newChapterDescription.trim(),
      createdAt: Timestamp.now(),
      subchapterCount: 0,
      lessonCount: 0,
      assignmentCount: 0,
      videoCount: 0,
      problemCount: 0,
      quizCount: 0,
    });
    setNewChapterName('');
    setNewChapterDescription('');
    fetchChapters();
  };

  const deleteChapter = async (chapterId: string) => {
    await deleteDoc(doc(db, 'chapters', chapterId));
    if (selectedChapterId === chapterId) setSelectedChapterId(null);
    delete subchapterCache[chapterId];
    fetchChapters();
    setSubchapters([]);
  };

  const addSubchapter = async () => {
    if (!selectedChapterId || !newSubchapterName.trim()) return;
    const newId = crypto.randomUUID();
    await setDoc(doc(db, 'subchapters', newId), {
      name: newSubchapterName.trim(),
      chapterId: selectedChapterId,
      description: newSubchapterDescription.trim(),
      createdAt: Timestamp.now(),
      lessonCount: 0,
      assignmentCount: 0,
      videoCount: 0,
      problemCount: 0,
      quizCount: 0,
    });
    const chapterRef = doc(db, 'chapters', selectedChapterId);
    const snap = await getDoc(chapterRef);
    if (snap.exists()) {
      const currentCount = snap.data().subchapterCount || 0;
      await updateDoc(chapterRef, { subchapterCount: currentCount + 1 });
    }
    delete subchapterCache[selectedChapterId];
    setNewSubchapterName('');
    setNewSubchapterDescription('');
    fetchSubchapters(selectedChapterId);
    fetchChapters();
  };

  const confirmDeleteSubchapter = (subId: string) => setConfirmDeleteSubId(subId);

  const deleteSubchapter = async () => {
    if (!confirmDeleteSubId || !selectedChapterId) return;
    await deleteDoc(doc(db, 'subchapters', confirmDeleteSubId));
    const chapterRef = doc(db, 'chapters', selectedChapterId);
    const snap = await getDoc(chapterRef);
    if (snap.exists()) {
      const currentCount = snap.data().subchapterCount || 1;
      await updateDoc(chapterRef, { subchapterCount: Math.max(0, currentCount - 1) });
    }
    delete subchapterCache[selectedChapterId];
    fetchSubchapters(selectedChapterId);
    fetchChapters();
    setConfirmDeleteSubId(null);
  };

  // JSON импортоор оруулах товч
  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      for (const chapter of data) {
        const chapterId = crypto.randomUUID();
        await setDoc(doc(db, 'chapters', chapterId), {
          name: chapter.name,
          description: chapter.description,
          createdAt: Timestamp.now(),
          order: chapter.order || 0, // ✅ order нэмэгдсэн
          subchapterCount: chapter.subchapters?.length || 0,
          lessonCount: 0,
          assignmentCount: 0,
          videoCount: 0,
          problemCount: 0,
          quizCount: 0,
        });
        for (const sub of chapter.subchapters || []) {
          const subId = crypto.randomUUID();
          await setDoc(doc(db, 'subchapters', subId), {
            name: sub.name,
            chapterId,
            description: sub.description || '',
            createdAt: Timestamp.now(),
            order: sub.order || 0, // ✅ дэд бүлгийн order
            lessonCount: 0,
            assignmentCount: 0,
            videoCount: 0,
            problemCount: 0,
            quizCount: 0,
          });
        }
      }
      fetchChapters();
    } catch (err) {
      alert('JSON алдаа: ' + err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* JSON нэмэх */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">📂 JSON импорт</label>
        <label className="flex items-center justify-center px-4 py-2 bg-white text-sm font-medium text-gray-700 border border-gray-300 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50">
          <span>Файл сонгох</span>
          <input
            type="file"
            accept="application/json"
            onChange={handleJsonImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Бүлгүүд */}
      <div>
        <h1 className="text-xl font-semibold mb-4">Бүлгүүд</h1>
        <div className="space-y-2 mb-4">
          <Input placeholder="Шинэ бүлгийн нэр" value={newChapterName} onChange={(e) => setNewChapterName(e.target.value)} />
          <Input placeholder="Бүлгийн тодорхойлолт" value={newChapterDescription} onChange={(e) => setNewChapterDescription(e.target.value)} />
          <Button className="w-full" onClick={addChapter}>Нэмэх</Button>
        </div>
        <ul className="space-y-3">
          {chapters.map((chapter) => (
            <li key={chapter.id} className={`border px-3 py-2 rounded cursor-pointer ${selectedChapterId === chapter.id ? 'bg-blue-100' : ''}`}
              onClick={() => setSelectedChapterId(selectedChapterId === chapter.id ? null : chapter.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <strong>{chapter.order}. {chapter.name}</strong>
                  <div className="text-xs text-gray-600">{chapter.description}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Дэд бүлэг: {chapter.subchapterCount} | Хичээл: {chapter.lessonCount} | Даалгавар: {chapter.assignmentCount} | Бичлэг: {chapter.videoCount} | Бодлого: {chapter.problemCount} | Тест: {chapter.quizCount}
                  </div>
                </div>
                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}>
                  Устгах
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Дэд бүлгүүд */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Дэд бүлгүүд</h2>
        {selectedChapterId ? (
          <>
            <div className="space-y-2 mb-4">
              <Input placeholder="Шинэ дэд бүлгийн нэр" value={newSubchapterName} onChange={(e) => setNewSubchapterName(e.target.value)} />
              <Input placeholder="Дэд бүлгийн тодорхойлолт" value={newSubchapterDescription} onChange={(e) => setNewSubchapterDescription(e.target.value)} />
              <Button className="w-full" onClick={addSubchapter}>Нэмэх</Button>
            </div>
            <ul className="space-y-3">
              {subchapters.map((sub) => (
                <li key={sub.id} className="bg-gray-50 border px-3 py-2 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong>{sub.order} {sub.name}</strong>
                      <div className="text-xs text-gray-600">{sub.description}</div>
                      <div className="text-xs text-gray-600 mt-1">
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

      {/* Popup баталгаажуулалт */}
      <Dialog open={!!confirmDeleteSubId} onOpenChange={() => setConfirmDeleteSubId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Устгах уу?</DialogTitle>
            <DialogDescription>Та энэ дэд бүлгийг устгахдаа итгэлтэй байна уу?</DialogDescription>
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

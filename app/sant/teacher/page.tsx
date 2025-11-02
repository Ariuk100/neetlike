'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

type Student = {
  name: string;
  class: string;
  code: string;
  status: 'Шалгалт өгч байна' | 'Шалгалт дууссан';
};

// аюулгүй хөрвүүлэх туслахууд
const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

export default function TeacherPage() {
  const [pwd, setPwd] = useState('');
  const [authed, setAuthed] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔐 Нэвтрэх
  const login = async () => {
    try {
      const res = await fetch('/api/sant/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.message || 'Нууц үг буруу байна.');
        return;
      }
      setAuthed(true);
      toast.success('Амжилттай нэвтэрлээ.');
    } catch {
      toast.error('Сервертэй холбогдож чадсангүй.');
    }
  };

  // 🔁 Real-time listener
  useEffect(() => {
    if (!authed) return;

    setLoading(true);
    const unsubscribeExam = onSnapshot(collection(db, 'santexam'), (snapshot) => {
      const actives: Student[] = snapshot.docs.map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          name: asString(d.name),
          class: asString(d.class),
          code: asString(d.code) || doc.id,
          status: 'Шалгалт өгч байна',
        };
      });

      setStudents((prev) => {
        const done = prev.filter((p) => p.status === 'Шалгалт дууссан');
        return [...actives, ...done];
      });
      setLoading(false);
    });

    const unsubscribeResult = onSnapshot(collection(db, 'santresult'), (snapshot) => {
      const finished: Student[] = snapshot.docs.map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          name: asString(d.name),
          class: asString(d.class),
          code: asString(d.code) || doc.id,
          status: 'Шалгалт дууссан',
        };
      });

      setStudents((prev) => {
        const active = prev.filter((p) => p.status === 'Шалгалт өгч байна');
        return [...active, ...finished];
      });
      setLoading(false);
    });

    return () => {
      unsubscribeExam();
      unsubscribeResult();
    };
  }, [authed]);

  // 🧾 Excel татах
  const downloadExcel = async () => {
    try {
      const res = await fetch('/api/sant/teacher/data');
      if (!res.ok) throw new Error('Excel fetch failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exam_results.xlsx';
      a.click();
      a.remove();
      toast.success('Excel татаж авлаа. Бүх өгөгдөл устсан.');
      setStudents([]);
    } catch {
      toast.error('Excel татахад алдаа гарлаа.');
    }
  };

  // 🔐 Нэвтрэх дэлгэц
  if (!authed) {
    return (
      <main className="flex justify-center items-center h-screen">
        <Card className="p-6 w-full max-w-sm">
          <CardHeader>
            <CardTitle>Багш нэвтрэх</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="Нууц үг"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <Button className="w-full" onClick={login} disabled={!pwd.trim()}>
              Нэвтрэх
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 🧑‍🏫 Самбар
  return (
    <main className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">🧑‍🏫 Багшийн хяналтын самбар</h1>
        <Button onClick={downloadExcel}>Дүн Excel-ээр татах</Button>
      </div>

      {loading && <p className="text-sm text-gray-500">Уншиж байна...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {students.length === 0 ? (
          <p className="text-sm text-gray-500">Сурагчийн мэдээлэл алга.</p>
        ) : (
          students.map((s) => (
            <Card
              key={s.code}
              className={`border ${
                s.status === 'Шалгалт өгч байна'
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-green-50 border-green-300'
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {s.name} <span className="text-gray-500">({s.class})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Код: <strong>{s.code}</strong>
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    s.status === 'Шалгалт өгч байна'
                      ? 'text-blue-600'
                      : 'text-green-700'
                  }`}
                >
                  {s.status}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
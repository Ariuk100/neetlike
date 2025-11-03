'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';

type ProblemRow = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
};

type Student = {
  name: string;
  class: string;
  code: string;
  status: 'Шалгалт өгч байна' | 'Шалгалт дууссан';
  totalScore: number;
  problems: ProblemRow[];
};

const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const asNumber = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const toProblems = (v: unknown): ProblemRow[] => {
  if (!Array.isArray(v)) return [];
  return v.map((item, idx): ProblemRow => {
    const r = (item ?? {}) as Record<string, unknown>;
    return {
      id: typeof r.id === 'string' ? r.id : `p${idx + 1}`,
      title: typeof r.title === 'string' ? r.title : `Бодлого ${idx + 1}`,
      score: asNumber(r.score, 0),
      maxScore: asNumber(r.maxScore, 0),
    };
  });
};

export default function TeacherPage() {
  const [pwd, setPwd] = useState('');
  const [authed, setAuthed] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const login = async (): Promise<void> => {
    try {
      const res = await fetch('/api/sant/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pwd }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
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

  useEffect(() => {
    if (!authed) return;
    setLoading(true);

    const handleExamSnapshot = (snapshot: QuerySnapshot<DocumentData>): void => {
      const actives: Student[] = snapshot.docs.map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          name: asString(d.name),
          class: asString(d.class),
          code: asString(d.code) || doc.id,
          status: 'Шалгалт өгч байна',
          problems: toProblems(d.problems),
          totalScore: asNumber(d.totalScore, 0),
        };
      });

      setStudents((prev) => {
        const done = prev.filter((p) => p.status === 'Шалгалт дууссан');
        return [...actives, ...done];
      });
      setLoading(false);
    };

    const handleResultSnapshot = (snapshot: QuerySnapshot<DocumentData>): void => {
      const finished: Student[] = snapshot.docs.map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          name: asString(d.name),
          class: asString(d.class),
          code: asString(d.code) || doc.id,
          status: 'Шалгалт дууссан',
          problems: toProblems(d.problems),
          totalScore: asNumber(d.totalScore, 0),
        };
      });

      setStudents((prev) => {
        const active = prev.filter((p) => p.status === 'Шалгалт өгч байна');
        return [...active, ...finished];
      });
      setLoading(false);
    };

    const unsubscribeExam = onSnapshot(collection(db, 'santexam'), handleExamSnapshot);
    const unsubscribeResult = onSnapshot(collection(db, 'santresult'), handleResultSnapshot);

    return () => {
      unsubscribeExam();
      unsubscribeResult();
    };
  }, [authed]);

  const downloadExcel = async (): Promise<void> => {
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
      toast.success('Excel татаж авлаа.');
    } catch {
      toast.error('Excel татахад алдаа гарлаа.');
    }
  };

  // хамгийн олон бодлоготой мөрийн тоогоор баганын тоо гаргана
  const maxProblems = useMemo(
    () => students.reduce((m, s) => Math.max(m, s.problems.length), 0),
    [students]
  );

  // нийлбэрээр эрэмбэлнэ
  const sorted = useMemo(() => {
    const clone = [...students];
    clone.sort((a, b) => b.totalScore - a.totalScore);
    return clone;
  }, [students]);

  // онооны өнгө
  const tone = (score: number, maxScore: number): string => {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio >= 0.8) return 'bg-green-200 text-green-800';
    if (ratio >= 0.4) return 'bg-yellow-200 text-yellow-800';
    return 'bg-red-200 text-red-800';
  };

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

  return (
    <main className="container mx-auto p-6 max-w-[1100px]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">🧑‍🏫 Багшийн хяналтын самбар</h1>
        <Button onClick={downloadExcel}>Дүн Excel-ээр татах</Button>
      </div>

      {loading && <p className="text-sm text-gray-500">Уншиж байна...</p>}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">Сурагчийн мэдээлэл алга.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed border text-sm border-gray-300 bg-white rounded-md">
            {/* colgroup-ийг whitespace үүсгэхгүйгээр динамикаар */}
            <colgroup>
              {[
                'w-12', // №
                'w-20', // Анги
                'w-56', // Нэр
                // Бодлого бүр 96px (эсвэл тааруулж болно)
                ...Array.from({ length: maxProblems }, () => 'w-24'),
                'w-20', // Нийт
                'w-28', // Төлөв
              ].map((cls, i) => (
                <col key={i} className={cls} />
              ))}
            </colgroup>

            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="border px-2 py-1 text-center">№</th>
                <th className="border px-2 py-1 text-center">Анги</th>
                <th className="border px-2 py-1 text-left">Нэр</th>
                {Array.from({ length: maxProblems }).map((_, i) => (
                  <th key={`ph-${i}`} className="border px-2 py-1 text-center">
                    Б{i + 1}
                  </th>
                ))}
                <th className="border px-2 py-1 text-center">Нийт</th>
                <th className="border px-2 py-1 text-center">Төлөв</th>
              </tr>
            </thead>

            <tbody>
              {sorted.map((s, idx) => (
                <tr
                  key={s.code}
                  className={
                    s.status === 'Шалгалт өгч байна'
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'bg-green-50 hover:bg-green-100'
                  }
                >
                  <td className="border text-center px-2">{idx + 1}</td>
                  <td className="border text-center px-2">{s.class}</td>
                  <td className="border px-2 truncate">{s.name || '-'}</td>

                  {/* Бодлого бүр тусдаа нүд */}
                  {Array.from({ length: maxProblems }).map((_, i) => {
                    const p = s.problems[i];
                    if (!p) {
                      return (
                        <td key={`cell-${s.code}-${i}`} className="border text-center text-gray-400">
                          -
                        </td>
                      );
                    }
                    return (
                      <td key={`cell-${s.code}-${p.id}`} className="border">
                        <div
                          className={`mx-auto my-1 h-7 min-w-[84px] max-w-[120px] px-2 rounded-md text-xs font-semibold flex items-center justify-center ${tone(
                            p.score,
                            p.maxScore
                          )}`}
                          title={p.title}
                        >
                          {p.score}/{p.maxScore}
                        </div>
                      </td>
                    );
                  })}

                  <td className="border text-center font-semibold">{s.totalScore}</td>
                  <td
                    className={`border text-center font-medium ${
                      s.status === 'Шалгалт өгч байна' ? 'text-blue-600' : 'text-green-700'
                    }`}
                  >
                    {s.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
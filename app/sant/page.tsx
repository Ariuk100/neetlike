'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Practice from '@/components/sant/Practice';
import Exam from '@/components/sant/Exam';

// ==== Pyodide types ====
type Pyodide = { runPythonAsync: (code: string) => Promise<unknown> };
declare global {
  interface Window {
    loadPyodide: () => Promise<Pyodide>;
  }
}

// ==== Types ====
type Student = { class: string; code: string; name: string };
type TestCase = { input: string; expectedOutput: string };
type Problem = { id: string; title: string; description: string; maxScore: number; tests: TestCase[] };
type RunResult = {
  passed: number;
  total: number;
  passedList: number[];
  details: Array<{ index: number; input: string; expected: string; actual: string }>;
};

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
const indentBlock = (src: string, spaces = 4) => src.split('\n').map((l) => ' '.repeat(spaces) + l).join('\n');

export default function SantPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grade, setGrade] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [results, setResults] = useState<Record<string, RunResult | undefined>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const [pyLoading, setPyLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startTime, setStartTime] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const beforeUnloadHandlerRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);
  const isEndedRef = useRef(false);

  // === Fetch students ===
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/sant/students', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Student[];
        if (Array.isArray(data)) setStudents(data);
      } catch {
        toast.error('Сурагчдын мэдээллийг уншиж чадсангүй.');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (beforeUnloadHandlerRef.current) {
        window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
      }
    };
  }, []);

  const grades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => set.add(s.class));
    return Array.from(set).sort();
  }, [students]);

  const filteredNames = useMemo(() => {
    if (!grade) return [];
    return students
      .filter((s) => s.class === grade)
      .map((s) => s.name)
      .sort();
  }, [grade, students]);

  const handleLogin = async () => {
    if (!grade || !fullName || !code) {
      toast.error('Бүх талбарыг бөглөнө үү.');
      return;
    }

    try {
      const check = await fetch(`/api/sant/exam?code=${code}`);
      const checkData = await check.json();
      if (!checkData.ok) {
        toast.error(checkData.message || 'Шалгалт өгөх боломжгүй байна.');
        return;
      }

      const res = await fetch('/api/sant/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: grade, code }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) return toast.error('Нэр эсвэл код буруу байна.');

      const found = result.student as Student;
      setCurrent(found);
      sessionStorage.setItem('sant_student', JSON.stringify(found));
      toast.success(`Тавтай морил, ${found.name}!`);
    } catch {
      toast.error('Сервертэй холбогдож чадсангүй.');
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('sant_student');
    if (saved) {
      try {
        setCurrent(JSON.parse(saved) as Student);
      } catch {}
    }
  }, []);

  // === Fullscreen guard ===
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement;
      if (!isFullscreen && examStarted && !isEndedRef.current) {
        toast.error('Fullscreen-ээс гарсан тул шалгалт дууслаа.');
        setExamStarted(false);
        endExam();
        // Энд sessionStorage.removeItem-г хийх шаардлагагүй,
        // Учир нь endExam() функц өөрөө үүнийг хийх болно.
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted]); // `endExam` хамаарлаас хасав.

  // === Copy/Paste/Contextmenu-г шалгалтын үед хориглох
  useEffect(() => {
    if (!examStarted) return;

    const preventClipboard = (e: ClipboardEvent) => e.preventDefault();
    const preventKeyCombos = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(k)) {
        e.preventDefault();
      }
    };
    const preventContext = (e: MouseEvent) => e.preventDefault();

    document.addEventListener('copy', preventClipboard);
    document.addEventListener('cut', preventClipboard);
    document.addEventListener('paste', preventClipboard);
    document.addEventListener('keydown', preventKeyCombos);
    document.addEventListener('contextmenu', preventContext);

    return () => {
      document.removeEventListener('copy', preventClipboard);
      document.removeEventListener('cut', preventClipboard);
      document.removeEventListener('paste', preventClipboard);
      document.removeEventListener('keydown', preventKeyCombos);
      document.removeEventListener('contextmenu', preventContext);
    };
  }, [examStarted]);

  // === Tab солих, цонх идэвхгүй болох
  useEffect(() => {
    if (!examStarted) return;

    const handleHidden = () => {
      if (document.hidden && !isEndedRef.current) {
        toast.error('⚠️ Та өөр tab руу шилжлээ. Шалгалт дууслаа.');
        endExam();
      }
    };

    const handleBlur = () => {
      if (!isEndedRef.current) {
        toast.error('⚠️ Цонх идэвхгүй боллоо. Шалгалт дууслаа.');
        endExam();
      }
    };

    document.addEventListener('visibilitychange', handleHidden);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleHidden);
      window.removeEventListener('blur', handleBlur);
    };
  }, [examStarted]); // `endExam` хамаарлаас хасав.

  // === Интернет тасрах
  useEffect(() => {
    const handleOffline = () => {
      toast.error('⚠️ Интернет тасарлаа. Шалгалт автоматаар дуусаж байна.');
      endExam();
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []); // `endExam` хамаарлаас хасав.

  const startExam = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch {}

    setExamStarted(true);
    isEndedRef.current = false;
    toast.success('Шалгалт эхэллээ!');
    setStartTime(new Date().toISOString());

    setSolutions({});
    setScores({});
    setResults({});
    setActiveTab(null);

    // server дээр "эхэлсэн" гэж үлдээе
    try {
      await fetch('/api/sant/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: current!.name,
          className: current!.class,
          code: current!.code,
        }),
      });
    } catch {
      toast.error('Шалгалт бүртгэхэд алдаа гарлаа.');
    }

    // бодлого
    try {
      const res = await fetch('/api/sant/problems', { cache: 'no-store' });
      const data = (await res.json()) as Problem[];
      setProblems(data);
      if (data.length > 0) setActiveTab(data[0].id);
    } catch {
      toast.error('Бодлого ачаалж чадсангүй.');
    }

    // pyodide
    try {
      setPyLoading(true);
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${PYODIDE_URL}"]`);
        if (existing) return resolve();
        const script = document.createElement('script');
        script.src = PYODIDE_URL;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });
      const py = await window.loadPyodide();
      setPyodide(py);
      toast.success('Python interpreter бэлэн боллоо 🐍');
    } catch {
      toast.error('Pyodide ачаалж чадсангүй.');
    } finally {
      setPyLoading(false);
    }

    // 40 минутын таймер
    setTimeLeft(2400);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          toast.error('⏰ Хугацаа дууслаа!');
          endExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // beforeunload
    const handler = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!isEndedRef.current) {
        endExam();
      }
    };
    if (beforeUnloadHandlerRef.current) {
      window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
    }
    beforeUnloadHandlerRef.current = handler as unknown as (e: BeforeUnloadEvent) => void;
    window.addEventListener('beforeunload', beforeUnloadHandlerRef.current);
  };

  const endExam = async () => {
    if (isEndedRef.current) return;
    isEndedRef.current = true;
    if (!showSummary) setShowSummary(true);

    // таймер зогсооно
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (beforeUnloadHandlerRef.current) {
      window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
      beforeUnloadHandlerRef.current = null;
    }

    // 👇 *** ЭНД ЗАСВАР НЭМЭГДСЭН ***
    // Шалгалт дууссан тул сессийг цэвэрлэснээр
    // хуудсыг refresh хийхэд дахин нэвтрэх боломжийг хаана.
    sessionStorage.removeItem('sant_student');
    // 👆 *** /ЗАСВАР ДУУСАВ ***

    const endTime = new Date().toISOString();
    const duration =
      startTime ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000) : null;

    // сервер рүү явуулах payload-ийг нэг л удаа хийж авна
    const finalPayload = {
      name: current?.name,
      className: current?.class,
      code: current?.code,
      totalScore: Object.values(scores).reduce((a, b) => a + (b ?? 0), 0),
      problems: problems.map((p) => ({
        id: p.id,
        title: p.title,
        score: scores[p.id] ?? 0,
        maxScore: p.maxScore,
      })),
      startTime,
      endTime,
      duration,
    };

    const json = JSON.stringify(finalPayload);

    // 1) sendBeacon-р оролдоно
    let sent = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' });
      sent = navigator.sendBeacon('/api/sant/exam', blob);
    }

    // 2) хэрвээ beacon болоогүй бол fetch keepalive
    if (!sent) {
      try {
        await fetch('/api/sant/exam', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          keepalive: true,
        });
      } catch {
        toast.error('Дүн илгээхэд алдаа гарлаа.');
      }
    }

    // fullscreen-с гаргана
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    } finally {
      setShowSummary(true);
    }
  };

  const totalScore = useMemo(
    () => Object.values(scores).reduce((a, b) => a + (b ?? 0), 0),
    [scores]
  );
  const totalMaxScore = useMemo(() => problems.reduce((sum, p) => sum + p.maxScore, 0), [problems]);

  const runLocalJudge = async (problemId: string) => {
    const p = problems.find((x) => x.id === problemId);
    if (!p) return;
    const userCode = (solutions[problemId] ?? '').trim();
    if (!userCode) return toast.error('Код хоосон байна.');
    if (!pyodide) return toast.error('Python интерпретер бэлэн биш байна.');

    setRunning((r) => ({ ...r, [problemId]: true }));
    toast.info('Код шалгаж байна...');

    let passed = 0;
    const passedList: number[] = [];
    const details: Array<{ index: number; input: string; expected: string; actual: string }> = [];

    for (const [i, t] of p.tests.entries()) {
      try {
        const pySrc = `
import sys, io, contextlib
_in = ${JSON.stringify(t.input)}
_out = io.StringIO()
sys.stdin = io.StringIO(_in)
with contextlib.redirect_stdout(_out):
${indentBlock(userCode, 4)}
result = _out.getvalue().strip()
result
`.trim();
        const ret = await pyodide.runPythonAsync(pySrc);
        const out = String(ret).trim();
        if (out === t.expectedOutput.trim()) {
          passed++;
          passedList.push(i + 1);
          details.push({ index: i + 1, input: t.input, expected: t.expectedOutput, actual: out });
        } else {
          // алга, шалгалт дээр унагасан тестийг detail-д хиймээр байвал энд хийж болно
        }
      } catch {
        // алдаатай тестийг зүгээр алгасна
      }
    }

    const total = p.tests.length;
    const score = Math.round((passed / total) * p.maxScore);
    setScores((prev) => ({ ...prev, [problemId]: score }));
    setResults((prev) => ({
      ...prev,
      [problemId]: { passed, total, passedList, details },
    }));
    setRunning((r) => ({ ...r, [problemId]: false }));
    toast.success(`✅ ${passed}/${total} тест амжилттай! Оноо: ${score}`);

    // оноо түр хадгалах
    try {
      const nextScores = { ...scores, [problemId]: score };
      const payloadProblems = problems.map((pb) => ({
        id: pb.id,
        title: pb.title,
        score: nextScores[pb.id] ?? 0,
        maxScore: pb.maxScore,
      }));

      await fetch('/api/sant/exam', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: current!.code,
          problems: payloadProblems,
        }),
      });
    } catch {
      toast.error('Түр хадгалах үед алдаа гарлаа.');
    }
  };

  const scoreClass = (problemId: string) => {
    const p = problems.find((x) => x.id === problemId);
    if (!p) return '';
    const sc = scores[problemId] ?? 0;
    const ratio = sc / p.maxScore;
    if (ratio === 1) return 'text-green-600';
    if (ratio >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // === Онооны цонх ===
  if (showSummary)
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>✅ Шалгалт дууслаа</CardTitle>
            <CardDescription>
              {current?.name} — {current?.class}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Нэр:</span> {current?.name ?? '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Анги:</span> {current?.class ?? '-'}
                </div>
                <div>
                  <span className="text-muted-foreground">Код:</span> {current?.code ?? '-'}
                </div>
              </div>
            </div>

            <p className="text-lg font-semibold text-center">
              Нийт оноо: {totalScore} / {totalMaxScore}
            </p>
            <ul className="divide-y">
              {problems.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>{p.title}</span>
                  <span className={scoreClass(p.id)}>
                    {scores[p.id] ?? 0} / {p.maxScore}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={() => {
                setShowSummary(false);
                setExamStarted(false);
                setCurrent(null);
                // Энд sessionStorage.removeItem хийх нь зөв,
                // гэхдээ endExam дотор хийснээр refresh хийх үеийг давхар хамгаалж байгаа.
                sessionStorage.removeItem('sant_student');
              }}
            >
              Хаах
            </Button>
          </CardContent>
        </Card>
      </main>
    );

  // === 1. Шалгалт эхлээгүй боловч нэвтэрсэн ===
  if (current && !examStarted)
    return (
      <main className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>🎓 Sant шалгалтын анхааруулга</CardTitle>
            <CardDescription>
              {current.name} — {current.class}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc ml-6 space-y-2 text-sm">
              <li>Шалгалтын явцад хуулбарлах, screenshot авах хориотой.</li>
              <li>Fullscreen горимд шалгалт явагдана.</li>
              <li>Fullscreen-ээс гарвал шалгалт автоматаар дуусна.</li>
              <li>Бусдаас тусламж авах, өөр tab руу шилжих хориотой.</li>
              <li>Шалгалтын үеэр интернет тасарвал автоматаар хадгалагдана.</li>
            </ul>

            <Button onClick={startExam} className="w-full">
              Шалгалт эхлүүлэх
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                sessionStorage.removeItem('sant_student');
                setCurrent(null);
              }}
            >
              Гарах
            </Button>
          </CardContent>
        </Card>
      </main>
    );

  // === 2. Шалгалт эхэлсэн ===
  if (current && examStarted)
    return (
      <Exam
        current={current}
        timeLeft={timeLeft}
        totalScore={totalScore}
        totalMaxScore={totalMaxScore}
        problems={problems}
        activeTab={activeTab}
        setActiveTab={(v) => setActiveTab(v)}
        results={results}
        solutions={solutions}
        setSolutions={setSolutions}
        runLocalJudge={runLocalJudge}
        pyodide={pyodide}
        running={running}
        scores={scores}
        scoreClass={scoreClass}
        endExam={endExam}
      />
    );

  // === 3. Нэвтрээгүй ===
  if (loading) return <div className="p-6">Ачаалж байна...</div>;

  return (
    <main className="container mx-auto p-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Sant түр нэвтрэх</CardTitle>
          <CardDescription>Анги, нэр, кодоо оруулж нэвтрэнэ үү.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Анги</label>
            <Select value={grade} onValueChange={(v) => setGrade(v.toString())}>
              <SelectTrigger>
                <SelectValue placeholder="Анги сонгох" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Сурагчийн нэр</label>
            <Select value={fullName} onValueChange={(v) => setFullName(v.toString())} disabled={!grade}>
              <SelectTrigger>
                <SelectValue placeholder="Нэр сонгох" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {filteredNames.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Код</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код оруулах" />
          </div>
          <Button className="w-full" onClick={handleLogin}>
            Нэвтрэх
          </Button>
        </CardContent>
      </Card>
      <div className="mt-6">
        <Practice />
      </div>
    </main>
  );
}
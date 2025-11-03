'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ==== Pyodide types ====
type Pyodide = { runPythonAsync: (code: string) => Promise<unknown> };
declare global { interface Window { loadPyodide: () => Promise<Pyodide>; } }

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

  // ⏱️ Таймерийг дахин давхардахгүй барих ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // beforeunload listener-ийг цэвэрлэхэд хэрэгтэй ref
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

    // Unmount: таймер/листенер цэвэрлэх хамгаалалт
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
    return students.filter((s) => s.class === grade).map((s) => s.name).sort();
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
        sessionStorage.removeItem('sant_student');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted]);
  // === Copy/Paste/Contextmenu-г бүхэл хуудсанд хориглох ===
useEffect(() => {
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
}, []);
// === Tab солих, цонх идэвхгүй болохыг мэдрэх
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
}, [examStarted]);

  // === Интернет тасрахад шалгалт дуусгах
  useEffect(() => {
    const handleOffline = () => {
      toast.error('⚠️ Интернет тасарлаа. Шалгалт автоматаар дуусаж байна.');
      endExam();
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  const startExam = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch {
      // fullscreen амжаагүй байсан ч шалгалтыг үргэлжлүүлнэ
    }

    setExamStarted(true);
    isEndedRef.current = false;
    toast.success('Шалгалт эхэллээ!');
    setStartTime(new Date().toISOString());

    setSolutions({});          // өмнөх бичсэн кодыг арилгана
    setScores({});             // өмнөх оноог тэглэнэ
    setResults({});            // өмнөх тестийн дэлгэрэнгүйг цэвэрлэнэ
    setActiveTab(null);        // идэвхтэй табыг цэвэрлэнэ

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

    try {
      const res = await fetch('/api/sant/problems', { cache: 'no-store' });
      const data = (await res.json()) as Problem[];
      setProblems(data);
      if (data.length > 0) setActiveTab(data[0].id);
    } catch {
      toast.error('Бодлого ачаалж чадсангүй.');
    }

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

    // ✅ 40 минут — давхар гүйхээс хамгаалж хуучин таймерийг цэвэрлэнэ
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

    // beforeunload listener-ийг зөвхөн нэг удаа тавих
    const handler = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!isEndedRef.current) { // ✅ НЭМЭЛТ
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
    if (isEndedRef.current) return;   // ✅ НЭМЭЛТ: аль хэдийн дууссан бол гарах
    isEndedRef.current = true; 
    if (showSummary) return;
    setShowSummary(true);

    // таймер заавал зогсооно
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (beforeUnloadHandlerRef.current) {
      window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
      beforeUnloadHandlerRef.current = null;
    }

    const endTime = new Date().toISOString();
    const duration =
      startTime ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000) : null;
      const payload = {
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
    
      console.log("📤 Илгээж буй дүн:", payload); // 👈 Энд харуулна

    try {
      await fetch('/api/sant/exam', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });
    } catch {
      toast.error('Дүн илгээхэд алдаа гарлаа.');
    }

    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } finally {
      setShowSummary(true);
    }
  };

  const totalScore = useMemo(
    () => Object.values(scores).reduce((a, b) => a + (b ?? 0), 0),
    [scores]
  );
  const totalMaxScore = useMemo(
    () => problems.reduce((sum, p) => sum + p.maxScore, 0),
    [problems]
  );

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
        }
      } catch {
        // алдаатай тестийг зүгээр алгасна — оноонд нөлөөлөхгүй
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
    // 🟢 Оноо хадгалах PATCH дуудлага — santexam дээр оноог хадгална
try {
  // setScores дараа нь асинхрон тул шинэ оноог алдахгүйн тулд nextScores-г гаргаж авна
  const nextScores = { ...scores, [problemId]: score };

  // бүх бодлогын оноог бэлдэнэ
  const payloadProblems = problems.map((pb) => ({
    id: pb.id,
    title: pb.title,
    score: nextScores[pb.id] ?? 0,
    maxScore: pb.maxScore,
  }));

  // сервер рүү илгээнэ
  await fetch('/api/sant/exam', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: current!.code, // энэ нь сурагчийн код
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
            <CardDescription>{current?.name} — {current?.class}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-3">
                <div><span className="text-muted-foreground">Нэр:</span> {current?.name ?? '-'}</div>
                <div><span className="text-muted-foreground">Анги:</span> {current?.class ?? '-'}</div>
                <div><span className="text-muted-foreground">Код:</span> {current?.code ?? '-'}</div>
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
            <CardDescription>{current.name} — {current.class}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc ml-6 space-y-2 text-sm">
              <li>Шалгалтын явцад хуулбарлах, screenshot авах хориотой.</li>
              <li>Fullscreen горимд шалгалт явагдана.</li>
              <li>Fullscreen-ээс гарвал шалгалт автоматаар дуусна.</li>
              <li>Бусдаас тусламж авах, өөр tab руу шилжих хориотой.</li>
              <li>Шалгалтын үеэр интернет тасарвал автоматаар хадгалагдана.</li>
            </ul>

            <Button onClick={startExam} className="w-full">Шалгалт эхлүүлэх</Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { sessionStorage.removeItem('sant_student'); setCurrent(null); }}
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
      <main className="container mx-auto p-4 max-w-5xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>🧮 Шалгалт</CardTitle>
                <CardDescription>{current.name} — {current.class}</CardDescription>
              </div>
              <Button variant="destructive" onClick={endExam}>
                Дуусгах
              </Button>
            </div>
            {/* ✅ Дээр нь нийт оноо тогтмол харуулна */}
            <div className="mt-2 text-center">
              <span className="text-base font-semibold">
                Нийт оноо: {totalScore} / {totalMaxScore}
              </span>
            </div>
            <div className="text-center text-sm text-gray-600 mt-2">
              ⏳ Үлдсэн хугацаа:{' '}
              <span className={timeLeft < 300 ? 'text-red-600 font-semibold' : 'text-green-700'}>
                {Math.floor(timeLeft / 60)} мин {timeLeft % 60} сек
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {problems.length === 0 ? (
              <p>Бодлогууд ачаалж байна...</p>
            ) : (
              <Tabs value={activeTab ?? undefined} onValueChange={setActiveTab}>
                <TabsList>
                  {problems.map((p) => (
                    <TabsTrigger key={p.id} value={p.id}>{p.title}</TabsTrigger>
                  ))}
                </TabsList>
                {problems.map((p) => {
                  const res = results[p.id];
                  return (
                    <TabsContent key={p.id} value={p.id} className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{p.title}</CardTitle>
                          <CardDescription>{p.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <Textarea
  className="min-h-[220px] font-mono"
  placeholder="Энд Python кодоо бичнэ үү..."
  value={solutions[p.id] || ''}
  onChange={(e) => setSolutions((prev) => ({ ...prev, [p.id]: e.target.value }))}
  onKeyDown={(e) => {
    // Tab → 4 space
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const insert = '    ';
      const next = value.slice(0, start) + insert + value.slice(end);
      setSolutions((prev) => ({ ...prev, [p.id]: next }));
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + insert.length;
      });
    }

    // Enter → өмнөх мөрийн индент хадгалах
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const before = target.value.slice(0, start);
      const after = target.value.slice(end);
      const currentLine = before.split('\n').pop() ?? '';
      const indent = currentLine.match(/^\s+/)?.[0] ?? '';
      const next = before + '\n' + indent + after;
      setSolutions((prev) => ({ ...prev, [p.id]: next }));
      requestAnimationFrame(() => {
        const pos = start + 1 + indent.length;
        target.selectionStart = target.selectionEnd = pos;
      });
    }
  }}
  onCopy={(e) => e.preventDefault()}
  onPaste={(e) => e.preventDefault()}
  onCut={(e) => e.preventDefault()}
/>

                          {/* ✅ Давсан тестүүдийн чипс + дэлгэрэнгүй */}
                          {res && res.passedList.length > 0 && (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {res.passedList.map((idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                                  >
                                    ✓ Test {idx}
                                  </span>
                                ))}
                              </div>

                              <div className="mt-3 rounded-lg border bg-muted/30">
                                <div className="px-3 py-2 text-xs font-semibold text-green-700">
                                  Давсан тестүүдийн дэлгэрэнгүй
                                </div>
                                <ul className="divide-y text-sm">
                                  {(res.details ?? []).map((d) => (
                                    <li key={d.index} className="px-3 py-2">
                                      <div className="mb-1 font-medium text-green-700">Test {d.index}</div>
                                      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                                        <div>
                                          <div className="text-xs text-muted-foreground">Input</div>
                                          <pre className="rounded bg-background p-2 overflow-auto">{d.input}</pre>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground">Expected</div>
                                          <pre className="rounded bg-background p-2 overflow-auto">{d.expected}</pre>
                                        </div>
                                        <div>
                                          <div className="text-xs text-muted-foreground">Output</div>
                                          <pre className="rounded bg-background p-2 overflow-auto">{d.actual}</pre>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </>
                          )}

                          <div className="flex items-center justify-between">
                            <Button onClick={() => runLocalJudge(p.id)} disabled={!pyodide || running[p.id]}>
                              {running[p.id] ? 'Шалгаж байна…' : 'Код шалгах'}
                            </Button>
                            <span className={`text-sm ${scoreClass(p.id)}`}>
                              Оноо: {scores[p.id] ?? 0} / {p.maxScore}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
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
              <SelectTrigger><SelectValue placeholder="Анги сонгох" /></SelectTrigger>
              <SelectContent>
                {grades.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Сурагчийн нэр</label>
            <Select value={fullName} onValueChange={(v) => setFullName(v.toString())} disabled={!grade}>
              <SelectTrigger><SelectValue placeholder="Нэр сонгох" /></SelectTrigger>
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
          <Button className="w-full" onClick={handleLogin}>Нэвтрэх</Button>
        </CardContent>
      </Card>
    </main>
  );
}
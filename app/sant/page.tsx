'use client';

import { useEffect, useMemo, useState } from 'react';
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
      if (!isFullscreen && examStarted) {
        toast.error('Fullscreen-ээс гарсан тул шалгалт дууслаа.');
        setExamStarted(false);
        endExam();
        sessionStorage.removeItem('sant_student');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
    if (el.requestFullscreen) await el.requestFullscreen();
    setExamStarted(true);
    toast.success('Шалгалт эхэллээ!');
    setStartTime(new Date().toISOString());

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

    // ✅ 40 минут
    setTimeLeft(2400);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('⏰ Хугацаа дууслаа!');
          endExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    window.addEventListener('beforeunload', () => {
      clearInterval(timer);
      endExam();
    });
  };

  const endExam = async () => {
    if (showSummary) return;
    setShowSummary(true);
    const endTime = new Date().toISOString();
    const duration =
      startTime ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000) : null;

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
      } catch {}
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
              Нийт оноо: {totalScore} / {problems.reduce((a, b) => a + b.maxScore, 0)}
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
                          />

                          {/* ✅ Давсан тестүүдийн чипс + дэлгэрэнгүйг буцааж харуулах хэсэг */}
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
              <SelectContent>
                {filteredNames.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
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
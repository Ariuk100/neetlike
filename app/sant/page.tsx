'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Practice from '@/components/sant/Practice';
import Exam from '@/components/sant/Exam';

// ==== Pyodide types ====
type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>;
  runPython: (code: string) => unknown;
};

// Removed conflicting global declaration. Using casting instead.


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

export default function SantPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grade, setGrade] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState<Student | null>(null);
  // isLoading removed
  const [examStarted, setExamStarted] = useState(false);
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [results, setResults] = useState<Record<string, RunResult | undefined>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [startTime, setStartTime] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const beforeUnloadHandlerRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);
  const isEndedRef = useRef(false);

  // === ШИНЭ: Зөрчлийн удирдлагын state ===
  const [violationCount, setViolationCount] = useState(0);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [warningTimeLeft, setWarningTimeLeft] = useState(0);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const violationInProgressRef = useRef(false); // Нэгэн зэрэг олон зөрчил дуудагдахаас сэргийлнэ

  // === ШИНЭ: Анхааруулгын таймер цэвэрлэх функц ===
  const clearWarningTimer = useCallback(() => {
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  // === `endExam` функцийг `useEffect`-үүдээс өмнө тодорхойлж, `useCallback`-аар ороов. ===
  const endExam = useCallback(async () => {
    if (isEndedRef.current) return;
    isEndedRef.current = true;
    if (!showSummary) setShowSummary(true);

    // Бүх таймеруудыг зогсооно
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (beforeUnloadHandlerRef.current) {
      window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
      beforeUnloadHandlerRef.current = null;
    }
    clearWarningTimer(); // Зөрчлийн таймерыг мөн цэвэрлэнэ

    // Дахин нэвтрэх алдааг засах
    sessionStorage.removeItem('sant_student');

    const endTime = new Date().toISOString();
    const duration =
      startTime ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000) : null;

    // Оноо алдагдах алдааны засвар (problems, totalScore-г хассан)
    const finalPayload = {
      name: current?.name,
      className: current?.class,
      code: current?.code,
      startTime,
      endTime,
      duration,
    };

    const json = JSON.stringify(finalPayload);

    // sendBeacon / fetch
    let sent = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' });
      sent = navigator.sendBeacon('/api/sant/exam', blob);
    }
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
  }, [
    startTime,
    current,
    showSummary,
    setShowSummary,
    clearWarningTimer,
    // endExam-г тогтвортой байлгахын тулд scores, problems-г хамаарлаас хассан.
    // Эцсийн дүнг сервер тооцох тул эдгээр нь энд шаардлагагүй.
  ]);

  // === ШИНЭ: Дүрэм зөрчлийн нэгдсэн удирдлага ===
  const handleViolation = useCallback(() => {
    if (!examStarted || isEndedRef.current || violationInProgressRef.current) {
      return;
    }
    violationInProgressRef.current = true;

    const newViolationCount = violationCount + 1;
    setViolationCount(newViolationCount);

    let graceTime = 0;
    if (newViolationCount === 1) graceTime = 10;
    if (newViolationCount === 2) graceTime = 5;

    if (graceTime > 0) {
      // 1, 2-р зөрчил: Анхааруулга, тоолуур
      toast.warning(`⚠️ Шалгалтын дүрмийг зөрчлөө! (${newViolationCount}-р удаа)`);
      setWarningTimeLeft(graceTime);
      setIsWarningActive(true);

      clearWarningTimer();
      warningTimerRef.current = setInterval(() => {
        setWarningTimeLeft((prev) => {
          if (prev <= 1) {
            clearWarningTimer();
            toast.error(`Хугацаа дууссан тул шалгалт дууслаа.`);
            setIsWarningActive(false);
            violationInProgressRef.current = false;
            endExam(); // Хугацаа дуусахад шалгалтыг дуусгана
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // 3-р зөрчил: Шууд дуусгана
      toast.error(`Дүрэм 3 удаа зөрчсөн тул шалгалт дууслаа.`);
      violationInProgressRef.current = false;
      endExam();
    }
  }, [examStarted, violationCount, endExam, clearWarningTimer]);

  // === ШИНЭ: Шалгалт руу буцах товчны үйлдэл ===
  const handleReturnToExam = useCallback(async () => {
    clearWarningTimer();
    setIsWarningActive(false);
    violationInProgressRef.current = false;
    toast.success('Шалгалт үргэлжиллээ.');

    // Fullscreen-д буцааж оруулахыг оролдоно
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        await el.requestFullscreen();
      }
      // Фокусыг буцааж авчрах (blur-с сэргийлэх)
      window.focus();
    } catch { }
  }, [clearWarningTimer]);

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
        // setLoading(false);
      }
    })();

    // `useEffect` цэвэрлэгч функц
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (beforeUnloadHandlerRef.current) {
        window.removeEventListener('beforeunload', beforeUnloadHandlerRef.current);
      }
      clearWarningTimer(); // ШИНЭ: Анхааруулгын таймерыг цэвэрлэнэ
    };
  }, [clearWarningTimer]); // `clearWarningTimer` нь `useCallback` тул тогтвортой

  // Pyodide loading - Moved from startExam to top-level useEffect
  useEffect(() => {
    if (!examStarted) return;

    let active = true;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).loadPyodide) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = await (window as any).loadPyodide();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (active) setPyodide(p as any as Pyodide);
          return;
        }
        // script tag already added?
        const existing = document.querySelector(`script[src="${PYODIDE_URL}"]`);
        if (!existing) {
          const script = document.createElement('script');
          script.src = PYODIDE_URL;
          script.onload = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).loadPyodide) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = await (window as any).loadPyodide();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (active) setPyodide(p as any as Pyodide);
            }
          };
          document.body.appendChild(script);
        } else {
          // wait for existing to load
          const check = setInterval(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).loadPyodide) {
              clearInterval(check);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = await (window as any).loadPyodide();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (active) setPyodide(p as any as Pyodide);
            }
          }, 500);
        }
      } catch (e) {
        console.error("Pyodide load error", e);
      }
    })();
    return () => { active = false; };
  }, [examStarted]);

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
      } catch { }
    }
  }, []);

  // === Fullscreen guard (ШИНЭЧЛЭГДСЭН) ===
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Fullscreen-с гарсан, шалгалт эхэлсэн, дуусаагүй үед
      if (!document.fullscreenElement && examStarted && !isEndedRef.current) {
        handleViolation();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted, handleViolation]);

  // === Copy/Paste/Contextmenu (ХЭВЭЭРЭЭ) ===
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

  // === Tab солих, цонх идэвхгүй болох (ШИНЭЧЛЭГДСЭН) ===
  useEffect(() => {
    if (!examStarted) return;

    const handleHidden = () => {
      if (document.hidden && !isEndedRef.current) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      // Анхааруулга идэвхтэй үед blur-г тооцохгүй
      // (жишээ нь, хэрэглэгч буцах товч дарахын тулд хөдлөхөд)
      if (!isEndedRef.current && !violationInProgressRef.current) {
        handleViolation();
      }
    };

    document.addEventListener('visibilitychange', handleHidden);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleHidden);
      window.removeEventListener('blur', handleBlur);
    };
  }, [examStarted, handleViolation]);

  // === Интернет тасрах (ШИНЭЧЛЭГДСЭН) ===
  useEffect(() => {
    const handleOffline = () => {
      toast.error('⚠️ Интернет тасарлаа. Шалгалт автоматаар дуусаж байна.');
      // Энэ нь зөрчил биш, шууд дуусгах үйлдэл тул `handleViolation`-г дуудахгүй
      endExam();
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [endExam]);

  // === startExam (ХЭВЭЭРЭЭ) ===
  const startExam = async () => {
    // Шалгалт эхлэхэд зөрчлийн тоог 0-лөнө
    setViolationCount(0);
    setIsWarningActive(false);
    clearWarningTimer();
    violationInProgressRef.current = false;
    isEndedRef.current = false;

    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch { }

    setExamStarted(true);
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



    // 40 минутын таймер
    setTimeLeft(2400); // 40 минут
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

  // === totalScore (ХЭВЭЭРЭЭ) ===
  const totalScore = useMemo(
    () => Object.values(scores).reduce((a, b) => a + (b ?? 0), 0),
    [scores]
  );
  const totalMaxScore = useMemo(() => problems.reduce((sum, p) => sum + p.maxScore, 0), [problems]);

  // === runLocalJudge (useCallback-аар ороосон) ===
  const runLocalJudge = useCallback(async (problemId: string) => {
    const p = problems.find((x) => x.id === problemId);
    if (!p) return;
    const userCode = (solutions[problemId] ?? '').trim();
    if (!userCode) return toast.error('Код хоосон байна.');
    if (!pyodide) return toast.error('Python интерпретер бэлэн биш байна. Түр хүлээнэ үү.');

    setRunning((r) => ({ ...r, [problemId]: true }));
    toast.info('Код шалгаж байна...');

    let passed = 0;
    const passedList: number[] = [];
    const details: Array<{ index: number; input: string; expected: string; actual: string }> = [];

    // Capture stdout
    const runCodeWithInput = async (code: string, input: string) => {
      // Reset stdout
      pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
`);
      // Prepare input
      // Simple overwrite:
      const setupInput = `
import sys
import io

input_str = """${input}"""
input_iter = iter(input_str.split('\\n'))

def input(prompt=None):
    try:
        return next(input_iter)
    except StopIteration:
        return ""

sys.stdout = io.StringIO()
`;

      await pyodide.runPythonAsync(setupInput + "\n" + code);
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      return stdout;
    };


    for (const [i, t] of p.tests.entries()) {
      try {
        const out = await runCodeWithInput(userCode, t.input);
        const actual = String(out).trim();
        const expected = t.expectedOutput.trim();

        if (actual === expected) {
          passed++;
          passedList.push(i + 1);
          details.push({ index: i + 1, input: t.input, expected, actual });
        } else {
          details.push({ index: i + 1, input: t.input, expected, actual });
        }
      } catch (err) {
        // Run error
        console.error(err);
        details.push({ index: i + 1, input: t.input, expected: t.expectedOutput, actual: "Error: " + String(err) });
      }
    }

    const total = p.tests.length;
    const score = total > 0 ? Math.round((passed / total) * p.maxScore) : 0;

    const nextScores = { ...scores, [problemId]: score };
    setScores(nextScores);

    setResults((prev) => ({
      ...prev,
      [problemId]: { passed, total, passedList, details },
    }));
    setRunning((r) => ({ ...r, [problemId]: false }));

    if (passed === total) {
      toast.success(`✅ ${passed}/${total} тест амжилттай! Оноо: ${score}`);
    } else {
      toast.warning(`⚠️ ${passed}/${total} тест давлаа.`);
    }

  }, [problems, solutions, pyodide, scores]);

  // === scoreClass (useCallback-аар ороосон) ===
  /*
  const scoreClass = useCallback((problemId: string) => {
    const p = problems.find((x) => x.id === problemId);
    if (!p) return '';
    const sc = scores[problemId] ?? 0;
    const ratio = sc / p.maxScore;
    if (ratio === 1) return 'text-green-600';
    if (ratio >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  }, [problems, scores]);
  */

  // === ШИНЭ: Анхааруулгын UI ===
  if (isWarningActive) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-900 text-white fixed inset-0 z-[9999]">
        <Card className="max-w-lg w-full bg-white text-black">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-red-600">⚠️ АНХААРУУЛГА!</CardTitle>
            <CardDescription className="text-lg text-gray-700">
              Та шалгалтын дэлгэцээс гарлаа! ({violationCount}-р зөрчил)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-7xl font-bold text-red-600">
              {warningTimeLeft}
            </p>
            <p className="text-center text-gray-600">
              Дээрх хугацаа дуусахаас өмнө шалгалт руу буцаж орно уу. Эс бөгөөс таны шалгалт автоматаар дуусах болно.
            </p>
            <Button
              className="w-full text-lg py-6"
              onClick={handleReturnToExam}
            >
              Шалгалт руу буцах
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // === Онооны цонх (ХЭВЭЭРЭЭ) ===
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
                  <span className={'text-gray-500'}>
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

  // === 1. Шалгалт эхлээгүй боловч нэвтэрсэн (ХЭВЭЭРЭЭ) ===
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

  // === 2. Шалгалт эхэлсэн (ХЭВЭЭРЭЭ) ===
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
        // pyodide={pyodide} removed
        running={running}
        scores={scores}
        // scoreClass={scoreClass} removed
        endExam={endExam}
      />
    );

  // === 3. Нэвтрээгүй (ХЭВЭЭРЭЭ) ===
  // if (loading) return ... removed

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
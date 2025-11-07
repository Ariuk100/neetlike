'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ProblemRunner from '@/components/sant/ProblemRunner';

// ==== Pyodide types ====
type Pyodide = { runPythonAsync: (code: string) => Promise<unknown> };
declare global {
  interface Window {
    loadPyodide: () => Promise<Pyodide>;
  }
}

// ==== Types ====
type TestCase = { input: string; expectedOutput: string };
type Problem = {
  id: string;
  title: string;
  description: string;
  category: string;
  tests: TestCase[];
  maxScore: number;
};
type RunResult = {
  passed: number;
  total: number;
  passedList: number[];
  details: Array<{ index: number; input: string; expected: string; actual: string }>;
};

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';

const indentBlock = (src: string, spaces = 4) =>
  src
    .split('\n')
    .map((l) => ' '.repeat(spaces) + l)
    .join('\n');

export default function Practice() {
  const [practiceProblems, setPracticeProblems] = useState<Problem[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState('');
  const [practiceSolutions, setPracticeSolutions] = useState<Record<string, string>>({});
  const [practiceResults, setPracticeResults] = useState<Record<string, RunResult | undefined>>({});
  const [practiceRunning, setPracticeRunning] = useState<Record<string, boolean>>({});
  const [practiceErrors, setPracticeErrors] = useState<Record<string, string | null>>({});
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const [pyLoading, setPyLoading] = useState(false);

  const loadPy = async () => {
    if (pyodide || pyLoading) return;
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
      toast.success('Python бэлэн боллоо 🐍');
    } catch {
      // console.error-г авсан
      toast.error('Pyodide ачаалж чадсангүй.');
    } finally {
      setPyLoading(false);
    }
  };

  const loadAllProblems = async () => {
    try {
      const res = await fetch('/api/sant/problems?all=1', { cache: 'no-store' });
      const data = (await res.json()) as Problem[];
      setPracticeProblems(data);
      if (data.length > 0) setSelectedPracticeId(data[0].id);
      await loadPy();
    } catch {
      toast.error('Дадлагын бодлого ачаалж чадсангүй.');
    }
  };

  const runPracticeJudge = async (problemId: string) => {
    const p = practiceProblems.find((x) => x.id === problemId);
    if (!p) return;
    const userCode = (practiceSolutions[problemId] ?? '').trim();
    if (!userCode) return toast.error('Код хоосон байна.');
    if (!pyodide) return toast.error('Python интерпретер бэлэн биш байна.');

    setPracticeRunning((r) => ({ ...r, [problemId]: true }));
    // өмнөх алдааг цэвэрлэнэ
    setPracticeErrors((prev) => ({ ...prev, [problemId]: null }));
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
      } catch (err) {
        // console.error-г АВСАН
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Тодорхойгүй алдаа гарлаа.';
        setPracticeErrors((prev) => ({ ...prev, [problemId]: msg }));
        break;
      }
    }

    const total = p.tests.length;
    setPracticeResults((prev) => ({
      ...prev,
      [problemId]: { passed, total, passedList, details },
    }));
    setPracticeRunning((r) => ({ ...r, [problemId]: false }));
    toast.success(`✅ ${passed}/${total} тест амжилттай!`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Дадлага хийх</CardTitle>
        <CardDescription>Бүх бодлогоос сонгож, Pyodide дээр шалга.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={loadAllProblems} disabled={pyLoading}>
          {practiceProblems.length === 0 ? 'Бүх бодлого ачаалах' : 'Бодлого дахин ачаалах'}
        </Button>

        {practiceProblems.length > 0 && (
          <>
            <Select value={selectedPracticeId} onValueChange={setSelectedPracticeId}>
              <SelectTrigger>
                <SelectValue placeholder="Бодлого сонгох" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {practiceProblems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} ({p.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPracticeId && (() => {
              const p = practiceProblems.find((x) => x.id === selectedPracticeId);
              if (!p) return null;
              const res = practiceResults[p.id];
              const err = practiceErrors[p.id] ?? null;
              return (
                <ProblemRunner
                  problem={p}
                  value={practiceSolutions[p.id] || ''}
                  onChange={(val) =>
                    setPracticeSolutions((prev) => ({ ...prev, [p.id]: val }))
                  }
                  onRun={() => runPracticeJudge(p.id)}
                  running={practiceRunning[p.id]}
                  result={res}
                  disableClipboard={false}
                  errorMessage={err}
                  showFailed={true}
                />
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const [pyLoading, setPyLoading] = useState(false);

  const loadPy = async () => {
    if (pyodide || pyLoading) return;
    try {
      setPyLoading(true);
      // script байвал шууд
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
        // алдаатайг алгасна
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
              return (
                <div className="space-y-3">
                  <div className="rounded bg-muted/40 p-3 text-sm">
                    <div className="font-semibold">{p.title}</div>
                    <p className="text-muted-foreground">{p.description}</p>
                    <p className="text-xs mt-2">Макс оноо: {p.maxScore}</p>
                  </div>
                  <Textarea
                    className="min-h-[180px] font-mono"
                    placeholder="Энд Python кодоо бичээд 'Код шалгах'-ыг дар."
                    value={practiceSolutions[p.id] || ''}
                    onChange={(e) =>
                      setPracticeSolutions((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                  />
                  {res && (
                    <div className="text-sm">
                      ✅ {res.passed}/{res.total} тест давав.
                      {res.passedList.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {res.passedList.map((idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
                            >
                              ✓ Test {idx}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={() => runPracticeJudge(p.id)}
                    disabled={!pyodide || practiceRunning[p.id]}
                  >
                    {practiceRunning[p.id] ? 'Шалгаж байна…' : 'Код шалгах'}
                  </Button>
                </div>
              );
            })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ProblemRunner from '@/components/sant/ProblemRunner';

type TestCase = { input: string; expectedOutput: string };
type Problem = { id: string; title: string; description: string; maxScore: number; tests: TestCase[] };
type RunResult = {
  passed: number;
  total: number;
  passedList: number[];
  details: Array<{ index: number; input: string; expected: string; actual: string }>;
};
type Student = { class: string; code: string; name: string };
type Pyodide = { runPythonAsync: (code: string) => Promise<unknown> };

interface ExamProps {
  current: Student;
  timeLeft: number;
  totalScore: number;
  totalMaxScore: number;
  problems: Problem[];
  activeTab: string | null;
  setActiveTab: (v: string) => void;
  results: Record<string, RunResult | undefined>;
  solutions: Record<string, string>;
  setSolutions: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  runLocalJudge: (id: string) => void;
  pyodide: Pyodide | null;
  running: Record<string, boolean>;
  scores: Record<string, number>;
  scoreClass: (id: string) => string;
  endExam: () => void;
}

export default function Exam({
  current,
  timeLeft,
  totalScore,
  totalMaxScore,
  problems,
  activeTab,
  setActiveTab,
  results,
  solutions,
  setSolutions,
  runLocalJudge,
  pyodide,
  running,
  scores,
  scoreClass,
  endExam,
}: ExamProps) {
  return (
    <main className="container mx-auto p-4 max-w-5xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>🧮 Шалгалт</CardTitle>
              <CardDescription>
                {current.name} — {current.class}
              </CardDescription>
            </div>
            <Button variant="destructive" onClick={endExam}>
              Дуусгах
            </Button>
          </div>
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
                  <TabsTrigger key={p.id} value={p.id}>
                    {p.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              {problems.map((p) => {
                const res = results[p.id];
                return (
                  <TabsContent key={p.id} value={p.id} className="mt-4">
                    <ProblemRunner
                      problem={p}
                      value={solutions[p.id] || ''}
                      onChange={(val) =>
                        setSolutions((prev) => ({
                          ...prev,
                          [p.id]: val,
                        }))
                      }
                      onRun={() => runLocalJudge(p.id)}
                      running={running[p.id]}
                      result={res}
                      score={scores[p.id] ?? 0}
                      maxScore={p.maxScore}
                      // шалгалт дээр хуулбар хаалттай
                      disableClipboard={true}
                    />
                    {/* хүсвэл энд оноог давхар гаргаад өгч болно */}
                    {/* <div className={`mt-2 text-right text-sm ${scoreClass(p.id)}`}>
                      Оноо: {scores[p.id] ?? 0} / {p.maxScore}
                    </div> */}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
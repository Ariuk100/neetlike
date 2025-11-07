'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type TestCase = { input: string; expectedOutput: string };
type Problem = {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  tests: TestCase[];
};

type RunDetail = {
  index: number;
  input: string;
  expected: string;
  actual: string;
};

type RunResult = {
  passed: number;
  total: number;
  passedList: number[];
  details: RunDetail[];
};

interface ProblemRunnerProps {
  problem: Problem;
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  running?: boolean;
  result?: RunResult;
  score?: number;
  maxScore?: number;
  disableClipboard?: boolean;
  errorMessage?: string | null;
}

export default function ProblemRunner({
  problem,
  value,
  onChange,
  onRun,
  running = false,
  result,
  score,
  maxScore,
  disableClipboard = false,
  errorMessage,
}: ProblemRunnerProps) {
  const lineCount = value.split('\n').length || 1;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const passedIdx = new Set(result?.passedList ?? []);
  const failedTests =
    result && result.total
      ? Array.from({ length: result.total }, (_, i) => i + 1).filter((i) => !passedIdx.has(i))
      : [];

  return (
    <Card className="md:max-w-3xl">
      <CardHeader>
        <CardTitle>{problem.title}</CardTitle>
        <CardDescription>{problem.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* код бичих хэсэг + мөрийн дугаар */}
        <div className="flex gap-2 md:gap-3 md:max-w-3xl">
          {/* line numbers */}
          <div
            className="select-none text-right text-xs text-muted-foreground pt-2"
            style={{ minWidth: '2.5rem' }}
          >
            {lineNumbers.map((n) => (
              <div key={n} className="leading-5">
                {n}
              </div>
            ))}
          </div>

          <Textarea
            className="min-h-[200px] font-mono flex-1"
            placeholder="Энд Python кодоо бичнэ үү..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const insert = '    ';
                const next = value.slice(0, start) + insert + value.slice(end);
                onChange(next);
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + insert.length;
                });
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const before = value.slice(0, start);
                const after = value.slice(end);
                const currentLine = before.split('\n').pop() ?? '';
                const baseIndent = currentLine.match(/^\s+/)?.[0] ?? '';
                const needsExtra = currentLine.trimEnd().endsWith(':');
                const insertText = '\n' + baseIndent + (needsExtra ? '    ' : '');
                const next = before + insertText + after;
                onChange(next);
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + insertText.length;
                });
              }
            }}
            {...(disableClipboard
              ? {
                  onCopy: (e) => e.preventDefault(),
                  onPaste: (e) => e.preventDefault(),
                  onCut: (e) => e.preventDefault(),
                }
              : {})}
          />
        </div>

        {/* pyodide алдаа */}
        {errorMessage ? (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap">
            {errorMessage}
          </div>
        ) : null}

        {result && (
          <>
            <div className="text-sm">
              ✅ {result.passed}/{result.total} тест давав.
            </div>

            {/* tag-ууд */}
            <div className="flex flex-wrap gap-2">
              {result.passedList.map((idx) => (
                <span
                  key={`pass-${idx}`}
                  className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                >
                  ✓ Test {idx}
                </span>
              ))}
              {failedTests.map((idx) => (
                <span
                  key={`fail-${idx}`}
                  className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                >
                  ✗ Test {idx}
                </span>
              ))}
            </div>

            {/* passed details */}
            {result.details?.length ? (
              <div className="mt-3 rounded-lg border bg-muted/30">
                <div className="px-3 py-2 text-xs font-semibold text-green-700">
                  Давсан тестүүдийн дэлгэрэнгүй
                </div>
                <ul className="divide-y text-sm">
                  {result.details.map((d) => (
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
            ) : null}

            {/* failed details */}
            {failedTests.length > 0 && (
              <div className="mt-3 rounded-lg border bg-muted/30">
                <div className="px-3 py-2 text-xs font-semibold text-red-700">
                  Даваагүй тестүүдийн дэлгэрэнгүй
                </div>
                <ul className="divide-y text-sm">
                  {failedTests.map((i) => {
                    const testDef = problem.tests[i - 1];
                    const detail = result.details?.find((d) => d.index === i);
                    return (
                      <li key={i} className="px-3 py-2">
                        <div className="mb-1 font-medium text-red-700">Test {i}</div>
                        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Input</div>
                            <pre className="rounded bg-background p-2 overflow-auto">
                              {testDef?.input ?? ''}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Expected</div>
                            <pre className="rounded bg-background p-2 overflow-auto">
                              {testDef?.expectedOutput ?? ''}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Actual</div>
                            <pre className="rounded bg-background p-2 overflow-auto text-red-700">
                              {detail?.actual ?? '(гаралт үүсээгүй)'}
                            </pre>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-4">
          <Button onClick={onRun} disabled={running}>
            {running ? 'Шалгаж байна…' : 'Код шалгах'}
          </Button>
          {typeof score === 'number' && typeof maxScore === 'number' && (
            <span className="text-sm">
              Оноо: {score} / {maxScore}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
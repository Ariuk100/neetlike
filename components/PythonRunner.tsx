'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

// Pyodide-г browser-д татах URL
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';

type TestCase = { input: string; expectedOutput: string };

// ✅ Pyodide interface тодорхойлж өгнө
interface Pyodide {
  runPythonAsync: (code: string) => Promise<unknown>;
}

export function PythonRunner({
  problemTitle,
  description,
  tests,
}: {
  problemTitle: string;
  description: string;
  tests: TestCase[];
}) {
  const [code, setCode] = useState('');
  const [pyodide, setPyodide] = useState<Pyodide | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<string>('');
  const [score, setScore] = useState(0);

  // Pyodide ачаалах
  useEffect(() => {
    (async () => {
      const script = document.createElement('script');
      script.src = PYODIDE_URL;
      script.onload = async () => {
        const py: Pyodide = await window.loadPyodide();
        setPyodide(py);
        setLoading(false);
        toast.success('Python interpreter бэлэн боллоо 🐍');
      };
      document.body.appendChild(script);
    })();
  }, []);

  const runTests = async () => {
    if (!pyodide) {
      toast.error('Pyodide ачаалагдаагүй байна.');
      return;
    }

    setResult('');
    let passed = 0;
    for (const [i, t] of tests.entries()) {
      try {
        const output = await pyodide.runPythonAsync(`
input_data = """${t.input}""".strip().split()
a,b = map(int, input_data)
${code}
`);
        const out = (output ?? '').toString().trim();
        if (out === t.expectedOutput) passed++;
      } catch (err) {
        const e = err as Error;
        setResult((prev) => prev + `❌ Test ${i + 1}: ${e.message}\n`);
      }
    }

    const sc = Math.round((passed / tests.length) * 10);
    setScore(sc);
    toast.success(`✅ ${passed}/${tests.length} тест амжилттай (${sc} оноо)`);
  };

  if (loading) return <div>Python орчин ачаалж байна...</div>;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{problemTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <Textarea
          className="font-mono min-h-[200px]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Python кодоо энд бичнэ үү..."
        />
        <div className="flex justify-between items-center mt-3">
          <Button onClick={runTests}>Тест ажиллуулах</Button>
          <span className="text-sm">Оноо: {score}/10</span>
        </div>
        <pre className="text-xs bg-muted p-2 mt-3 rounded">{result}</pre>
      </CardContent>
    </Card>
  );
}
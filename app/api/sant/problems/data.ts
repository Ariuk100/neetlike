// app/api/sant/problems/data.ts
export type TestCase = { input: string; expectedOutput: string };
export type Problem = {
  id: string;
  title: string;
  description: string;
  tests: TestCase[];
  maxScore: number;
};

export const problems: Problem[] = [
  {
    id: 'sum',
    title: '1. Хоёр тооны нийлбэр',
    description: '2 бүхэл тоо өгөгдөнө. Тэд тус бүр ОРИНДОО (хоёр мөр) орж ирнэ. Нийлбэрийг хэвлэ.',
    maxScore: 10,
    tests: [
      { input: '1\n2\n', expectedOutput: '3' },
      { input: '10\n20\n', expectedOutput: '30' },
      { input: '5\n5\n', expectedOutput: '10' },
      { input: '-1\n1\n', expectedOutput: '0' },
      { input: '100\n200\n', expectedOutput: '300' },
      { input: '0\n0\n', expectedOutput: '0' },
      { input: '9\n11\n', expectedOutput: '20' },
      { input: '50\n60\n', expectedOutput: '110' },
      { input: '7\n8\n', expectedOutput: '15' },
      { input: '-10\n10\n', expectedOutput: '0' },
    ],
  },
  {
    id: 'max',
    title: '2. Хоёр тооноос ихийг нь олох',
    description: '2 бүхэл тоо хоёр мөрөөр орж ирнэ. Тэдний дундаас ихийг нь хэвлэ.',
    maxScore: 10,
    tests: [
      { input: '1\n2\n', expectedOutput: '2' },
      { input: '5\n5\n', expectedOutput: '5' },
      { input: '10\n9\n', expectedOutput: '10' },
      { input: '-5\n-2\n', expectedOutput: '-2' },
      { input: '0\n-10\n', expectedOutput: '0' },
      { input: '100\n99\n', expectedOutput: '100' },
      { input: '-1\n-1\n', expectedOutput: '-1' },
      { input: '7\n9\n', expectedOutput: '9' },
      { input: '-8\n2\n', expectedOutput: '2' },
      { input: '999\n1000\n', expectedOutput: '1000' },
    ],
  },
];
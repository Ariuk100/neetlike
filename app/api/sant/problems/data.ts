// app/api/sant/problems/data.ts

// --- 🧩 ТӨРЛҮҮД (TYPES) ---

export type TestCase = { input: string; expectedOutput: string };

/**
 * Боломжит бодлогын сэдвүүд (Зургаас 'While Loops'-ийг хассан)
 */
export type ProblemCategory =
  | 'Variables'
  | 'Data Types'
  | 'Numbers'
  | 'Casting'
  | 'Strings'
  | 'Booleans'
  | 'Operators'
  | 'Lists'
  | 'Tuples'
  | 'Sets'
  | 'Dictionaries'
  | 'If...Else'
  | 'Match'
  | 'For Loops';

export type Problem = {
  id: string;
  title: string;
  description: string;
  /** Бодлогын хамаарах сэдэв */
  category: ProblemCategory;
  tests: TestCase[];
  maxScore: number;
};

// --- 📚 ҮНДСЭН ӨГӨГДЛИЙН МАССИВ (Одоохондоо хоосон) ---

/**
 * Бүх бодлогын сан.
 * Доорх хэсгүүдээс сэдэв сэдвээр нь энэ массив руу нэмнэ.
 */
export const problems: Problem[] = [
  // --- Data Types Бодлого 1 ---
  {
    id: 'data-types-check-content',
    title: '4.1. Агуулгын төрлийг таних',
    description:
      "Нэг мөрөнд оролт орж ирнэ. Хэрэв оролт 'True' эсвэл 'False' бол 'bool', цэвэр бүхэл тоо бол 'int', '.' агуулсан тоо бол 'float', бусад тохиолдолд 'str' гэж хэвлэ.",
    category: 'Data Types',
    maxScore: 10,
    tests: [
      { input: '123\n', expectedOutput: 'int' },
      { input: '3.14\n', expectedOutput: 'float' },
      { input: 'Hello\n', expectedOutput: 'str' },
      { input: 'True\n', expectedOutput: 'bool' },
      { input: 'False\n', expectedOutput: 'bool' },
      { input: '-50\n', expectedOutput: 'int' },
      { input: '0.0\n', expectedOutput: 'float' },
      { input: 'Python3\n', expectedOutput: 'str' },
      { input: '100.\n', expectedOutput: 'float' }, // Python-д '100.'.isfloat() ажиллахгүй ч, '.' агуулсан тул
      { input: 'true\n', expectedOutput: 'str' }, // Case sensitive
    ],
  },
  // --- Data Types Бодлого 2 ---
  {
    id: 'data-types-string-sum',
    title: '4.2. Текстийг тоо болгон нэмэх',
    description:
      "Хоёр мөрөнд тоог илэрхийлэх *текст* орж ирнэ (жишээ нь '10', '20'). Тэдгээрийг тоо руу хөрвүүлж, нийлбэрийг нь хэвлэ.",
    category: 'Data Types',
    maxScore: 10,
    tests: [
      { input: '1\n2\n', expectedOutput: '3' },
      { input: '10\n20\n', expectedOutput: '30' },
      { input: '0\n0\n', expectedOutput: '0' },
      { input: '-5\n5\n', expectedOutput: '0' },
      { input: '100\n-50\n', expectedOutput: '50' },
      { input: '99\n1\n', expectedOutput: '100' },
      { input: '-10\n-20\n', expectedOutput: '-30' },
      { input: '123\n456\n', expectedOutput: '579' },
      { input: '5\n-10\n', expectedOutput: '-5' },
      { input: '8\n8\n', expectedOutput: '16' },
    ],
  },
  // --- Data Types Бодлого 3 ---
  {
    id: 'data-types-float-to-int',
    title: '4.3. Бутархайг бүхэл болгох',
    description:
      'Нэг мөрөнд *бутархай* тоог илэрхийлэх текст орж ирнэ. Уг текстийг `float` руу хөрвүүлээд, дараа нь `int` руу хөрвүүлж (бутархай хэсгийг нь хаяж) хэвлэ.',
    category: 'Data Types',
    maxScore: 10,
    tests: [
      { input: '3.14\n', expectedOutput: '3' },
      { input: '5.99\n', expectedOutput: '5' },
      { input: '0.5\n', expectedOutput: '0' },
      { input: '-2.7\n', expectedOutput: '-2' },
      { input: '10.0\n', expectedOutput: '10' },
      { input: '9.999\n', expectedOutput: '9' },
      { input: '-0.1\n', expectedOutput: '0' },
      { input: '100.1\n', expectedOutput: '100' },
      { input: '7.0\n', expectedOutput: '7' },
      { input: '-8.5\n', expectedOutput: '-8' },
    ],
  },
  // --- Data Types Бодлого 4 ---
  {
    id: 'data-types-sum-vs-concat',
    title: '4.4. Нэмэх vs Залгах',
    description:
      "Хоёр мөрөнд A, B гэсэн хоёр *бүхэл тоог илэрхийлэх текст* орж ирнэ. Эхний мөрөнд тэдгээрийг *текстээр* нь нийлүүлж (concat) хэвлэ. Хоёр дахь мөрөнд тэдгээрийг *тоо* руу хөрвүүлж нийлбэрийг нь хэвлэ.",
    category: 'Data Types',
    maxScore: 10,
    tests: [
      { input: '5\n10\n', expectedOutput: '510\n15' },
      { input: '1\n2\n', expectedOutput: '12\n3' },
      { input: '100\n200\n', expectedOutput: '100200\n300' },
      { input: '0\n0\n', expectedOutput: '00\n0' },
      { input: '-5\n-2\n', expectedOutput: '-5-2\n-7' },
      { input: '99\n1\n', expectedOutput: '991\n100' },
      { input: '3\n-3\n', expectedOutput: '3-3\n0' },
      { input: '7\n8\n', expectedOutput: '78\n15' },
      { input: '50\n50\n', expectedOutput: '5050\n100' },
      { input: '12\n34\n', expectedOutput: '1234\n46' },
    ],
  },
  // --- Data Types Бодлого 5 ---
  {
    id: 'data-types-bool-literal',
    title: '4.5. Boolean утга шалгах',
    description:
      "Нэг мөрөнд текст орж ирнэ. Хэрэв уг текст нь *яг* 'True' бол 'Yes', хэрэв *яг* 'False' бол 'No' гэж хэвлэ. Бусад бүх тохиолдолд 'Unknown' гэж хэвлэ.",
    category: 'Data Types',
    maxScore: 10,
    tests: [
      { input: 'True\n', expectedOutput: 'Yes' },
      { input: 'False\n', expectedOutput: 'No' },
      { input: 'true\n', expectedOutput: 'Unknown' },
      { input: 'false\n', expectedOutput: 'Unknown' },
      { input: 'Hello\n', expectedOutput: 'Unknown' },
      { input: '1\n', expectedOutput: 'Unknown' },
      { input: '0\n', expectedOutput: 'Unknown' },
      { input: 'TRUE\n', expectedOutput: 'Unknown' },
      { input: 'T\n', expectedOutput: 'Unknown' },
      { input: ' F \n', expectedOutput: 'Unknown' },
    ],
  },
  // --- Numbers Бодлого 1 ---
  {
    id: 'numbers-all-arithmetic',
    title: '5.1. Үндсэн 4 үйлдэл',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. Дөрвөн тусдаа мөрөнд A+B, A-B, A*B, A/B (бутархай хуваалт) үйлдэл хийж, үр дүнг хэвлэ.',
    category: 'Numbers',
    maxScore: 10,
    tests: [
      { input: '10\n2\n', expectedOutput: '12\n8\n20\n5.0' },
      { input: '5\n2\n', expectedOutput: '7\n3\n10\n2.5' },
      { input: '9\n3\n', expectedOutput: '12\n6\n27\n3.0' },
      { input: '1\n1\n', expectedOutput: '2\n0\n1\n1.0' },
      { input: '100\n5\n', expectedOutput: '105\n95\n500\n20.0' },
      { input: '0\n10\n', expectedOutput: '10\n-10\n0\n0.0' },
      { input: '7\n1\n', expectedOutput: '8\n6\n7\n7.0' },
      { input: '-10\n2\n', expectedOutput: '-8\n-12\n-20\n-5.0' },
      { input: '10\n-2\n', expectedOutput: '8\n12\n-20\n-5.0' },
      { input: '-8\n-4\n', expectedOutput: '-12\n-4\n32\n2.0' },
    ],
  },
  // --- Numbers Бодлого 2 ---
  {
    id: 'numbers-division-types',
    title: '5.2. Хуваалтын төрлүүд',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. Эхний мөрөнд A // B (Бүхлээр хуваах), хоёр дахь мөрөнд A % B (Үлдэгдэл), гурав дахь мөрөнд A / B (Бутархай хуваах) үйлдлийн үр дүнг хэвлэ.',
    category: 'Numbers',
    maxScore: 10,
    tests: [
      { input: '10\n3\n', expectedOutput: '3\n1\n3.3333333333333335' },
      { input: '7\n2\n', expectedOutput: '3\n1\n3.5' },
      { input: '5\n5\n', expectedOutput: '1\n0\n1.0' },
      { input: '1\n2\n', expectedOutput: '0\n1\n0.5' },
      { input: '100\n10\n', expectedOutput: '10\n0\n10.0' },
      { input: '8\n5\n', expectedOutput: '1\n3\n1.6' },
      { input: '0\n5\n', expectedOutput: '0\n0\n0.0' },
      { input: '13\n4\n', expectedOutput: '3\n1\n3.25' },
      { input: '9\n2\n', expectedOutput: '4\n1\n4.5' },
      { input: '-10\n3\n', expectedOutput: '-4\n2\n-3.3333333333333335' }, // Python-ы // үйлдэл шал руу тоймлодог
    ],
  },
  // --- Numbers Бодлого 3 ---
  {
    id: 'numbers-exponentiation',
    title: '5.3. Зэрэгт дэвшүүлэх',
    description:
      'Хоёр мөрөнд A (суурь), B (зэрэг) бүхэл тоо орж ирнэ. A-ийн B зэргийг (A ** B) олж хэвлэ.',
    category: 'Numbers',
    maxScore: 10,
    tests: [
      { input: '2\n3\n', expectedOutput: '8' },
      { input: '3\n2\n', expectedOutput: '9' },
      { input: '5\n0\n', expectedOutput: '1' },
      { input: '10\n1\n', expectedOutput: '10' },
      { input: '1\n100\n', expectedOutput: '1' },
      { input: '4\n3\n', expectedOutput: '64' },
      { input: '2\n10\n', expectedOutput: '1024' },
      { input: '10\n0\n', expectedOutput: '1' },
      { input: '7\n2\n', expectedOutput: '49' },
      { input: '-3\n3\n', expectedOutput: '-27' },
    ],
  },
  // --- Numbers Бодлого 4 ---
  {
    id: 'numbers-order-of-operations',
    title: '5.4. Үйлдлийн дараалал',
    description:
      'Гурван мөрөнд A, B, C бүхэл тоо орж ирнэ. (A + B) * C үйлдлийн үр дүнг хэвлэ.',
    category: 'Numbers',
    maxScore: 10,
    tests: [
      { input: '1\n2\n3\n', expectedOutput: '9' },
      { input: '5\n5\n2\n', expectedOutput: '20' },
      { input: '10\n0\n5\n', expectedOutput: '50' },
      { input: '0\n0\n10\n', expectedOutput: '0' },
      { input: '-2\n-3\n4\n', expectedOutput: '-20' },
      { input: '10\n-5\n3\n', expectedOutput: '15' },
      { input: '8\n2\n0\n', expectedOutput: '0' },
      { input: '1\n1\n1\n', expectedOutput: '2' },
      { input: '4\n-4\n100\n', expectedOutput: '0' },
      { input: '7\n8\n1\n', expectedOutput: '15' },
    ],
  },
  // --- Numbers Бодлого 5 ---
  {
    id: 'numbers-round-float',
    title: '5.5. Бутархай тоог тоймлох',
    description:
      'Нэг мөрөнд бутархай тоо орж ирнэ. Уг тоог хамгийн ойр бүхэл тоо руу тоймлоод (round() функц) хэвлэ.',
    category: 'Numbers',
    maxScore: 10,
    tests: [
      { input: '3.14\n', expectedOutput: '3' },
      { input: '5.5\n', expectedOutput: '6' }, // Python-д round(x.5) нь тэгш тоо руу тоймлодог
      { input: '4.5\n', expectedOutput: '4' }, // Жишээ: round(4.5) -> 4
      { input: '5.51\n', expectedOutput: '6' },
      { input: '2.0\n', expectedOutput: '2' },
      { input: '0.1\n', expectedOutput: '0' },
      { input: '-1.9\n', expectedOutput: '-2' },
      { input: '-3.5\n', expectedOutput: '-4' }, // -3.5 -> -4
      { input: '-2.5\n', expectedOutput: '-2' }, // -2.5 -> -2
      { input: '9.8\n', expectedOutput: '10' },
    ],
  },
  // --- Casting Бодлого 1 ---
  {
    id: 'casting-string-to-float',
    title: '6.1. Текстийг бутархай руу',
    description:
      "Нэг мөрөнд бутархай тоог илэрхийлэх *текст* орж ирнэ. Уг текстийг `float` руу хөрвүүлж, 2.0-оор үржүүлээд хэвлэ.",
    category: 'Casting',
    maxScore: 10,
    tests: [
      { input: '3.14\n', expectedOutput: '6.28' },
      { input: '10.0\n', expectedOutput: '20.0' },
      { input: '0.5\n', expectedOutput: '1.0' },
      { input: '-2.5\n', expectedOutput: '-5.0' },
      { input: '0\n', expectedOutput: '0.0' }, // '0' -> 0.0 * 2.0 = 0.0
      { input: '1\n', expectedOutput: '2.0' }, // '1' -> 1.0 * 2.0 = 2.0
      { input: '100.1\n', expectedOutput: '200.2' },
      { input: '-0.1\n', expectedOutput: '-0.2' },
      { input: '5.5\n', expectedOutput: '11.0' },
      { input: '1.25\n', expectedOutput: '2.5' },
    ],
  },
  // --- Casting Бодлого 2 ---
  {
    id: 'casting-int-to-string',
    title: '6.2. Тоог текст болгох',
    description:
      'Нэг мөрөнд бүхэл тоо орж ирнэ. Уг тоог `str` (текст) рүү хөрвүүлж, "Number: " гэсэн үгийн ард залгаж хэвлэ. (Жишээ: 10 -> "Number: 10")',
    category: 'Casting',
    maxScore: 10,
    tests: [
      { input: '10\n', expectedOutput: 'Number: 10' },
      { input: '1\n', expectedOutput: 'Number: 1' },
      { input: '0\n', expectedOutput: 'Number: 0' },
      { input: '-5\n', expectedOutput: 'Number: -5' },
      { input: '999\n', expectedOutput: 'Number: 999' },
      { input: '123\n', expectedOutput: 'Number: 123' },
      { input: '77\n', expectedOutput: 'Number: 77' },
      { input: '2025\n', expectedOutput: 'Number: 2025' },
      { input: '-1\n', expectedOutput: 'Number: -1' },
      { input: '8\n', expectedOutput: 'Number: 8' },
    ],
  },
  // --- Casting Бодлого 3 ---
  {
    id: 'casting-ord',
    title: '6.3. Үсгийн ASCII код',
    description:
      "Нэг мөрөнд нэг ширхэг тэмдэгт (үсэг, тэмдэг) орж ирнэ. Уг тэмдэгтийн ASCII (эсвэл Unicode) кодыг `ord()` функц ашиглан олж, хэвлэ.",
    category: 'Casting',
    maxScore: 10,
    tests: [
      { input: 'A\n', expectedOutput: '65' },
      { input: 'a\n', expectedOutput: '97' },
      { input: 'B\n', expectedOutput: '66' },
      { input: 'b\n', expectedOutput: '98' },
      { input: '0\n', expectedOutput: '48' },
      { input: '1\n', expectedOutput: '49' },
      { input: 'Z\n', expectedOutput: '90' },
      { input: 'z\n', expectedOutput: '122' },
      { input: ' \n', expectedOutput: '32' }, // (зай)
      { input: '!\n', expectedOutput: '33' },
    ],
  },
  // --- Casting Бодлого 4 ---
  {
    id: 'casting-chr',
    title: '6.4. Кодоос үсэг рүү',
    description:
      "Нэг мөрөнд ASCII кодыг илэрхийлэх бүхэл тоо (0-127) орж ирнэ. Уг кодыг `chr()` функц ашиглан тэмдэгт рүү хөрвүүлж хэвлэ.",
    category: 'Casting',
    maxScore: 10,
    tests: [
      { input: '65\n', expectedOutput: 'A' },
      { input: '97\n', expectedOutput: 'a' },
      { input: '66\n', expectedOutput: 'B' },
      { input: '98\n', expectedOutput: 'b' },
      { input: '48\n', expectedOutput: '0' },
      { input: '49\n', expectedOutput: '1' },
      { input: '90\n', expectedOutput: 'Z' },
      { input: '122\n', expectedOutput: 'z' },
      { input: '32\n', expectedOutput: ' ' }, // (зай)
      { input: '33\n', expectedOutput: '!' },
    ],
  },
  // --- Casting Бодлого 5 ---
  {
    id: 'casting-input-to-bool',
    title: '6.5. Оролтыг Boolean болгох',
    description:
      "Нэг мөрөнд текст орж ирнэ. Уг текстийг `bool()` функц руу хөрвүүлж, үр дүнг хэвлэ. (Анхаар: Python-д *ямар* текст 'False' болдог вэ?)",
    category: 'Casting',
    maxScore: 10,
    tests: [
      { input: 'True\n', expectedOutput: 'True' },
      { input: 'False\n', expectedOutput: 'True' }, // 'False' гэсэн текст нь хоосон биш тул True
      { input: 'Hello\n', expectedOutput: 'True' },
      { input: '1\n', expectedOutput: 'True' },
      { input: '0\n', expectedOutput: 'True' },
      { input: ' \n', expectedOutput: 'True' },
      { input: '\n', expectedOutput: 'False' }, // Зөвхөн хоосон string "" нь False
      { input: 'abc\n', expectedOutput: 'True' },
      { input: 'None\n', expectedOutput: 'True' },
      { input: 'test\n', expectedOutput: 'True' },
    ],
  },
  // --- Strings Бодлого 1 ---
  {
    id: 'strings-first-three-chars',
    title: '7.1. Эхний 3 тэмдэгт',
    description:
      'Нэг мөрөнд S текст орж ирнэ. Уг текстийн эхний 3 тэмдэгтийг (slicing) хэвлэ.',
    category: 'Strings',
    maxScore: 10,
    tests: [
      { input: 'Hello\n', expectedOutput: 'Hel' },
      { input: 'Python\n', expectedOutput: 'Pyt' },
      { input: 'abcde\n', expectedOutput: 'abc' },
      { input: '12345\n', expectedOutput: '123' },
      { input: 'Hi\n', expectedOutput: 'Hi' }, // 3-аас бага урттай
      { input: 'a\n', expectedOutput: 'a' },
      { input: '\n', expectedOutput: '' }, // Хоосон
      { input: 'Test\n', expectedOutput: 'Tes' },
      { input: 'Mongolia\n', expectedOutput: 'Mon' },
      { input: 'abcdef\n', expectedOutput: 'abc' },
    ],
  },
  // --- Strings Бодлого 2 ---
  {
    id: 'strings-first-and-last-char',
    title: '7.2. Эхний ба сүүлчийн тэмдэгт',
    description:
      'Нэг мөрөнд S текст (дор хаяж 1 урттай) орж ирнэ. Уг текстийн эхний тэмдэгт болон сүүлчийн тэмдэгтийг нийлүүлж хэвлэ.',
    category: 'Strings',
    maxScore: 10,
    tests: [
      { input: 'Hello\n', expectedOutput: 'Ho' },
      { input: 'Python\n', expectedOutput: 'Pn' },
      { input: 'a\n', expectedOutput: 'aa' },
      { input: 'ab\n', expectedOutput: 'ab' },
      { input: 'abc\n', expectedOutput: 'ac' },
      { input: '12345\n', expectedOutput: '15' },
      { input: 'Mongolia\n', expectedOutput: 'Ma' },
      { input: 'Test\n', expectedOutput: 'Tt' },
      { input: 'x y z\n', expectedOutput: 'xz' },
      { input: 'wow\n', expectedOutput: 'ww' },
    ],
  },
  // --- Strings Бодлого 3 ---
  {
    id: 'strings-upper-lower',
    title: '7.3. Том, жижиг үсэг',
    description:
      'Нэг мөрөнд S текст орж ирнэ. Эхний мөрөнд уг текстийг бүхэлд нь том үсгээр (`.upper()`), хоёр дахь мөрөнд бүхэлд нь жижиг үсгээр (`.lower()`) хэвлэ.',
    category: 'Strings',
    maxScore: 10,
    tests: [
      { input: 'Hello\n', expectedOutput: 'HELLO\nhello' },
      { input: 'Python\n', expectedOutput: 'PYTHON\npython' },
      { input: 'abc\n', expectedOutput: 'ABC\nabc' },
      { input: 'DEF\n', expectedOutput: 'DEF\ndef' },
      { input: 'MiXeD\n', expectedOutput: 'MIXED\nmixed' },
      { input: '123\n', expectedOutput: '123\n123' },
      { input: 'Hi!\n', expectedOutput: 'HI!\nhi!' },
      { input: 'a\n', expectedOutput: 'A\na' },
      { input: 'B\n', expectedOutput: 'B\nb' },
      { input: 'Test Case\n', expectedOutput: 'TEST CASE\ntest case' },
    ],
  },
  // --- Strings Бодлого 4 ---
  {
    id: 'strings-length',
    title: '7.4. Текстийн урт',
    description:
      'Нэг мөрөнд S текст орж ирнэ. Уг текстийн уртыг (`len()`) хэвлэ.',
    category: 'Strings',
    maxScore: 10,
    tests: [
      { input: 'Hello\n', expectedOutput: '5' },
      { input: 'Python\n', expectedOutput: '6' },
      { input: 'a\n', expectedOutput: '1' },
      { input: '\n', expectedOutput: '0' },
      { input: ' \n', expectedOutput: '1' },
      { input: '12345\n', expectedOutput: '5' },
      { input: 'Hello World\n', expectedOutput: '11' },
      { input: 'Test\n', expectedOutput: '4' },
      { input: 'abcde\n', expectedOutput: '5' },
      { input: '  \n', expectedOutput: '2' },
    ],
  },
  // --- Strings Бодлого 5 ---
  {
    id: 'strings-count-char',
    title: "7.5. Тэмдэгт тоолох",
    description:
      "Эхний мөрөнд S текст, хоёр дахь мөрөнд C тэмдэгт орж ирнэ. S текст дотор C тэмдэгт хэдэн удаа орж байгааг (`.count()`) тоолж хэвлэ.",
    category: 'Strings',
    maxScore: 10,
    tests: [
      { input: 'banana\na\n', expectedOutput: '3' },
      { input: 'hello\nl\n', expectedOutput: '2' },
      { input: 'abcabcabc\nc\n', expectedOutput: '3' },
      { input: 'test\nz\n', expectedOutput: '0' },
      { input: 'Mississippi\ns\n', expectedOutput: '4' },
      { input: 'AAAAA\na\n', expectedOutput: '0' }, // Case sensitive
      { input: 'aaaaa\na\n', expectedOutput: '5' },
      { input: '1010101\n1\n', expectedOutput: '4' },
      { input: 'Hello World\n \n', expectedOutput: '1' },
      { input: '\n\na\n', expectedOutput: '0' },
    ],
  },// --- Booleans Бодлого 1 ---
  {
    id: 'booleans-greater-than',
    title: '8.1. Их эсэх',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. A > B эсэхийг шалгаж, "True" эсвэл "False" гэж хэвлэ.',
    category: 'Booleans',
    maxScore: 10,
    tests: [
      { input: '5\n2\n', expectedOutput: 'True' },
      { input: '2\n5\n', expectedOutput: 'False' },
      { input: '5\n5\n', expectedOutput: 'False' },
      { input: '-1\n-5\n', expectedOutput: 'True' },
      { input: '-5\n-1\n', expectedOutput: 'False' },
      { input: '10\n0\n', expectedOutput: 'True' },
      { input: '0\n10\n', expectedOutput: 'False' },
      { input: '0\n-1\n', expectedOutput: 'True' },
      { input: '99\n100\n', expectedOutput: 'False' },
      { input: '100\n99\n', expectedOutput: 'True' },
    ],
  },
  // --- Booleans Бодлого 2 ---
  {
    id: 'booleans-equality',
    title: '8.2. Тэнцүү эсэх',
    description:
      'Хоёр мөрөнд A, B хоёр оролт (текст) орж ирнэ. A == B эсэхийг шалгаж, "True" эсвэл "False" гэж хэвлэ.',
    category: 'Booleans',
    maxScore: 10,
    tests: [
      { input: 'Hello\nHello\n', expectedOutput: 'True' },
      { input: 'Hello\nhello\n', expectedOutput: 'False' }, // Case sensitive
      { input: '10\n10\n', expectedOutput: 'True' },
      { input: '10\n10.0\n', expectedOutput: 'False' }, // '10' vs '10.0' (strings)
      { input: 'abc\ndef\n', expectedOutput: 'False' },
      { input: '\n\n\n', expectedOutput: 'True' }, // Хоёр хоосон мөр
      { input: 'a\na\n', expectedOutput: 'True' },
      { input: 'Python\nPython\n', expectedOutput: 'True' },
      { input: '5\n2\n', expectedOutput: 'False' },
      { input: ' \n \n', expectedOutput: 'True' }, // Хоёр зай
    ],
  },
  // --- Booleans Бодлого 3 ---
  {
    id: 'booleans-logical-and',
    title: '8.3. Логик AND',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. A нь 0-ээс их *БА* B нь 0-ээс их эсэхийг шалгаж, "True" эсвэл "False" гэж хэвлэ.',
    category: 'Booleans',
    maxScore: 10,
    tests: [
      { input: '5\n10\n', expectedOutput: 'True' },
      { input: '5\n-10\n', expectedOutput: 'False' },
      { input: '-5\n10\n', expectedOutput: 'False' },
      { input: '-5\n-10\n', expectedOutput: 'False' },
      { input: '0\n5\n', expectedOutput: 'False' }, // 0 > 0 = False
      { input: '5\n0\n', expectedOutput: 'False' },
      { input: '0\n0\n', expectedOutput: 'False' },
      { input: '1\n1\n', expectedOutput: 'True' },
      { input: '99\n100\n', expectedOutput: 'True' },
      { input: '-1\n1\n', expectedOutput: 'False' },
    ],
  },
  // --- Booleans Бодлого 4 ---
  {
    id: 'booleans-logical-or',
    title: '8.4. Логик OR',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. A нь 10-тай тэнцүү *ЭСВЭЛ* B нь 10-тай тэнцүү эсэхийг шалгаж, "True" эсвэл "False" гэж хэвлэ.',
    category: 'Booleans',
    maxScore: 10,
    tests: [
      { input: '10\n5\n', expectedOutput: 'True' },
      { input: '5\n10\n', expectedOutput: 'True' },
      { input: '10\n10\n', expectedOutput: 'True' },
      { input: '5\n5\n', expectedOutput: 'False' },
      { input: '0\n0\n', expectedOutput: 'False' },
      { input: '10\n0\n', expectedOutput: 'True' },
      { input: '0\n10\n', expectedOutput: 'True' },
      { input: '-10\n10\n', expectedOutput: 'True' },
      { input: '9\n11\n', expectedOutput: 'False' },
      { input: '10.0\n5\n', expectedOutput: 'False' }, // 10.0 != 10 (int)
    ],
  },
  // --- Booleans Бодлого 5 ---
  {
    id: 'booleans-logical-not',
    title: '8.5. Логик NOT',
    description:
      'Нэг мөрөнд A бүхэл тоо орж ирнэ. A нь 0-тэй *тэнцүү биш* (not A == 0) эсэхийг шалгаж, "True" эсвэл "False" гэж хэвлэ.',
    category: 'Booleans',
    maxScore: 10,
    tests: [
      { input: '5\n', expectedOutput: 'True' },
      { input: '0\n', expectedOutput: 'False' },
      { input: '1\n', expectedOutput: 'True' },
      { input: '-1\n', expectedOutput: 'True' },
      { input: '100\n', expectedOutput: 'True' },
      { input: '-99\n', expectedOutput: 'True' },
      { input: '2\n', expectedOutput: 'True' },
      { input: '0\n', expectedOutput: 'False' }, // Давтагдсан тест
      { input: '123\n', expectedOutput: 'True' },
      { input: '4\n', expectedOutput: 'True' },
    ],
  },
  // --- Operators Бодлого 1 ---
  {
    id: 'operators-modulus',
    title: '9.1. Үлдэгдэл олох (%)',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. A-г B-д хуваахад гарах үлдэгдлийг (A % B) хэвлэ.',
    category: 'Operators',
    maxScore: 10,
    tests: [
      { input: '10\n3\n', expectedOutput: '1' },
      { input: '10\n2\n', expectedOutput: '0' },
      { input: '7\n5\n', expectedOutput: '2' },
      { input: '5\n7\n', expectedOutput: '5' },
      { input: '100\n10\n', expectedOutput: '0' },
      { input: '100\n9\n', expectedOutput: '1' },
      { input: '1\n2\n', expectedOutput: '1' },
      { input: '0\n5\n', expectedOutput: '0' },
      { input: '13\n2\n', expectedOutput: '1' },
      { input: '14\n2\n', expectedOutput: '0' },
    ],
  },
  // --- Operators Бодлого 2 ---
  {
    id: 'operators-integer-division',
    title: '9.2. Бүхлээр хуваах (//)',
    description:
      'Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. A-г B-д бүхлээр хуваасан (A // B) хариуг хэвлэ.',
    category: 'Operators',
    maxScore: 10,
    tests: [
      { input: '10\n3\n', expectedOutput: '3' },
      { input: '10\n2\n', expectedOutput: '5' },
      { input: '7\n5\n', expectedOutput: '1' },
      { input: '5\n7\n', expectedOutput: '0' },
      { input: '100\n10\n', expectedOutput: '10' },
      { input: '100\n9\n', expectedOutput: '11' },
      { input: '1\n2\n', expectedOutput: '0' },
      { input: '0\n5\n', expectedOutput: '0' },
      { input: '13\n2\n', expectedOutput: '6' },
      { input: '-10\n3\n', expectedOutput: '-4' }, // Python-д шал руу тоймлодог
    ],
  },
  // --- Operators Бодлого 3 ---
  {
    id: 'operators-exponentiation-2',
    title: '9.3. Зэрэгт дэвшүүлэх (**)',
    description:
      'Хоёр мөрөнд A (суурь), B (зэрэг) бүхэл тоо орж ирнэ. A-ийн B зэргийг (A ** B) олж хэвлэ.',
    category: 'Operators',
    maxScore: 10,
    tests: [
      { input: '2\n3\n', expectedOutput: '8' },
      { input: '3\n4\n', expectedOutput: '81' },
      { input: '10\n2\n', expectedOutput: '100' },
      { input: '5\n1\n', expectedOutput: '5' },
      { input: '8\n0\n', expectedOutput: '1' },
      { input: '-2\n2\n', expectedOutput: '4' },
      { input: '-2\n3\n', expectedOutput: '-8' },
      { input: '1\n50\n', expectedOutput: '1' },
      { input: '4\n0.5\n', expectedOutput: '2.0' }, // Зэрэг нь float байж болно
      { input: '9\n0.5\n', expectedOutput: '3.0' }, // Квадрат язгуур
    ],
  },
  // --- Operators Бодлого 4 ---
  {
    id: 'operators-compound-assignment',
    title: '9.4. Хураангуй оператор (+=)',
    description:
      'Нэг мөрөнд A бүхэл тоо орж ирнэ. A дээр 10-г нэмж (A += 10), дараа нь 2-оор үржүүлж (A *= 2) эцсийн үр дүнг хэвлэ.',
    category: 'Operators',
    maxScore: 10,
    tests: [
      { input: '5\n', expectedOutput: '30' }, // (5 + 10) * 2 = 30
      { input: '0\n', expectedOutput: '20' }, // (0 + 10) * 2 = 20
      { input: '10\n', expectedOutput: '40' }, // (10 + 10) * 2 = 40
      { input: '-5\n', expectedOutput: '10' }, // (-5 + 10) * 2 = 10
      { input: '-10\n', expectedOutput: '0' }, // (-10 + 10) * 2 = 0
      { input: '1\n', expectedOutput: '22' },
      { input: '2\n', expectedOutput: '24' },
      { input: '-20\n', expectedOutput: '-20' }, // (-20 + 10) * 2 = -20
      { input: '100\n', expectedOutput: '220' },
      { input: '50\n', expectedOutput: '120' },
    ],
  },
  // --- Operators Бодлого 5 ---
  {
    id: 'operators-string-multiplication',
    title: '9.5. Текст үржүүлэх (*)',
    description:
      'Эхний мөрөнд S текст, хоёр дахь мөрөнд N бүхэл тоо орж ирнэ. S текстийг N удаа давтаж (S * N) хэвлэ.',
    category: 'Operators',
    maxScore: 10,
    tests: [
      { input: 'a\n5\n', expectedOutput: 'aaaaa' },
      { input: 'Hi\n3\n', expectedOutput: 'HiHiHi' },
      { input: 'Test\n1\n', expectedOutput: 'Test' },
      { input: 'Python\n0\n', expectedOutput: '' },
      { input: 'OK\n4\n', expectedOutput: 'OKOKOKOK' },
      { input: '123\n2\n', expectedOutput: '123123' },
      { input: ' \n5\n', expectedOutput: '     ' },
      { input: 'Woo\n2\n', expectedOutput: 'WooWoo' },
      { input: 'x\n10\n', expectedOutput: 'xxxxxxxxxx' },
      { input: 'abc\n3\n', expectedOutput: 'abcabcabc' },
    ],
  },
  // --- Lists Бодлого 1 ---
  {
    id: 'lists-create-and-print',
    title: '10.1. Жагсаалт үүсгэх',
    description:
      'Гурван мөрөнд гурван үг (A, B, C) орж ирнэ. Эдгээрээс [A, B, C] гэсэн жагсаалт үүсгэж, жагсаалтыг тэр чигт нь хэвлэ. (Python-ы print() ашиглахад [\'a\', \'b\', \'c\'] гэж хэвлэгдэнэ)',
    category: 'Lists',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\n', expectedOutput: "['a', 'b', 'c']" },
      { input: '1\n2\n3\n', expectedOutput: "['1', '2', '3']" },
      { input: 'apple\nbanana\ncherry\n', expectedOutput: "['apple', 'banana', 'cherry']" },
      { input: 'x\ny\nz\n', expectedOutput: "['x', 'y', 'z']" },
      { input: 'Hello\nWorld\n!\n', expectedOutput: "['Hello', 'World', '!']" },
      { input: 'red\ngreen\nblue\n', expectedOutput: "['red', 'green', 'blue']" },
      { input: 'py\nth\non\n', expectedOutput: "['py', 'th', 'on']" },
      { input: ' \n \n \n', expectedOutput: "[' ', ' ', ' ']" },
      { input: 'one\none\ntwo\n', expectedOutput: "['one', 'one', 'two']" },
      { input: 'A\nB\nC\n', expectedOutput: "['A', 'B', 'C']" },
    ],
  },
  // --- Lists Бодлого 2 ---
  {
    id: 'lists-append',
    title: '10.2. Жагсаалтад элемент нэмэх',
    description:
      'Хоёр мөрөнд A, B үг орж ирнэ. [A] гэсэн жагсаалт үүсгэж, түүндээ B-г нэм (append). Дараа нь жагсаалтаа хэвлэ.',
    category: 'Lists',
    maxScore: 10,
    tests: [
      { input: 'a\nb\n', expectedOutput: "['a', 'b']" },
      { input: 'first\nsecond\n', expectedOutput: "['first', 'second']" },
      { input: '10\n20\n', expectedOutput: "['10', '20']" },
      { input: 'apple\nbanana\n', expectedOutput: "['apple', 'banana']" },
      { input: 'x\ny\n', expectedOutput: "['x', 'y']" },
      { input: 'start\nend\n', expectedOutput: "['start', 'end']" },
      { input: 'item1\nitem2\n', expectedOutput: "['item1', 'item2']" },
      { input: 'a\na\n', expectedOutput: "['a', 'a']" },
      { input: ' \n.\n', expectedOutput: "[' ', '.']" },
      { input: 'py\nthon\n', expectedOutput: "['py', 'thon']" },
    ],
  },
  // --- Lists Бодлого 3 ---
  {
    id: 'lists-get-by-index',
    title: '10.3. Индексээр хандах',
    description:
      'Гурван мөрөнд A, B, C үг орж ирнэ. Эдгээрээс [A, B, C] жагсаалт үүсгэ. Жагсаалтын 1-р индекстэй (0-оос эхэлж тоолно) элементийг хэвлэ.',
    category: 'Lists',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\n', expectedOutput: 'b' },
      { input: 'x\ny\nz\n', expectedOutput: 'y' },
      { input: '10\n20\n30\n', expectedOutput: '20' },
      { input: 'red\ngreen\nblue\n', expectedOutput: 'green' },
      { input: 'first\nmiddle\nlast\n', expectedOutput: 'middle' },
      { input: 'apple\nbanana\ncherry\n', expectedOutput: 'banana' },
      { input: '1\n2\n3\n', expectedOutput: '2' },
      { input: 'Hello\nWorld\n!\n', expectedOutput: 'World' },
      { input: 'one\ntwo\nthree\n', expectedOutput: 'two' },
      { input: 'A\nB\nC\n', expectedOutput: 'B' },
    ],
  },
  // --- Lists Бодлого 4 ---
  {
    id: 'lists-get-last-element',
    title: '10.4. Сүүлчийн элемент',
    description:
      'Гурван мөрөнд A, B, C үг орж ирнэ. Эдгээрээс [A, B, C] жагсаалт үүсгэ. Жагсаалтын сүүлчийн элементийг (сөрөг индекс ашиглан) хэвлэ.',
    category: 'Lists',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\n', expectedOutput: 'c' },
      { input: 'x\ny\nz\n', expectedOutput: 'z' },
      { input: '10\n20\n30\n', expectedOutput: '30' },
      { input: 'red\ngreen\nblue\n', expectedOutput: 'blue' },
      { input: 'first\nmiddle\nlast\n', expectedOutput: 'last' },
      { input: 'apple\nbanana\ncherry\n', expectedOutput: 'cherry' },
      { input: '1\n2\n3\n', expectedOutput: '3' },
      { input: 'Hello\nWorld\n!\n', expectedOutput: '!' },
      { input: 'one\ntwo\nthree\n', expectedOutput: 'three' },
      { input: 'A\nB\nC\n', expectedOutput: 'C' },
    ],
  },
  // --- Lists Бодлого 5 ---
  {
    id: 'lists-change-element',
    title: '10.5. Элемент өөрчлөх',
    description:
      'Хоёр мөрөнд A, B үг орж ирнэ. ["X", A] гэсэн жагсаалт үүсгэ. Жагсаалтын 0-р индексийн утгыг B-ээр соль. Жагсаалтаа хэвлэ.',
    category: 'Lists',
    maxScore: 10,
    tests: [
      { input: 'a\nb\n', expectedOutput: "['b', 'a']" },
      { input: '10\n20\n', expectedOutput: "['20', '10']" },
      { input: 'apple\nbanana\n', expectedOutput: "['banana', 'apple']" },
      { input: 'old\nnew\n', expectedOutput: "['new', 'old']" },
      { input: 'one\ntwo\n', expectedOutput: "['two', 'one']" },
      { input: 'a\nz\n', expectedOutput: "['z', 'a']" },
      { input: 'first\nsecond\n', expectedOutput: "['second', 'first']" },
      { input: ' \nSpace\n', expectedOutput: "['Space', ' ']" },
      { input: 'no\nyes\n', expectedOutput: "['yes', 'no']" },
      { input: 'A\nB\n', expectedOutput: "['B', 'A']" },
    ],
  },
  // --- Tuples Бодлого 1 ---
  {
    id: 'tuples-create-and-print',
    title: '11.1. Tuple үүсгэх',
    description:
      'Хоёр мөрөнд A, B хоёр үг орж ирнэ. (A, B) гэсэн tuple үүсгэж, тэр чигт нь хэвлэ. (Python-ы print() ашиглахад (\'a\', \'b\') гэж хэвлэгдэнэ)',
    category: 'Tuples',
    maxScore: 10,
    tests: [
      { input: 'a\nb\n', expectedOutput: "('a', 'b')" },
      { input: '1\n2\n', expectedOutput: "('1', '2')" },
      { input: 'Hello\nWorld\n', expectedOutput: "('Hello', 'World')" },
      { input: 'x\ny\n', expectedOutput: "('x', 'y')" },
      { input: 'red\nblue\n', expectedOutput: "('red', 'blue')" },
      { input: '100\n200\n', expectedOutput: "('100', '200')" },
      { input: ' \n \n', expectedOutput: "(' ', ' ')" },
      { input: 'key\nvalue\n', expectedOutput: "('key', 'value')" },
      { input: 'a\na\n', expectedOutput: "('a', 'a')" },
      { input: 'Test\nCase\n', expectedOutput: "('Test', 'Case')" },
    ],
  },
  // --- Tuples Бодлого 2 ---
  {
    id: 'tuples-get-by-index',
    title: '11.2. Tuple-аас индексээр хандах',
    description:
      'Хоёр мөрөнд A, B хоёр үг орж ирнэ. (A, B) гэсэн tuple үүсгэ. Tuple-ийн 0-р индекстэй элементийг хэвлэ.',
    category: 'Tuples',
    maxScore: 10,
    tests: [
      { input: 'a\nb\n', expectedOutput: 'a' },
      { input: '1\n2\n', expectedOutput: '1' },
      { input: 'Hello\nWorld\n', expectedOutput: 'Hello' },
      { input: 'x\ny\n', expectedOutput: 'x' },
      { input: 'red\nblue\n', expectedOutput: 'red' },
      { input: '100\n200\n', expectedOutput: '100' },
      { input: ' \n.\n', expectedOutput: ' ' },
      { input: 'key\nvalue\n', expectedOutput: 'key' },
      { input: 'first\nsecond\n', expectedOutput: 'first' },
      { input: 'Test\nCase\n', expectedOutput: 'Test' },
    ],
  },
  // --- Tuples Бодлого 3 ---
  {
    id: 'tuples-length',
    title: '11.3. Tuple-ийн урт',
    description:
      'Гурван мөрөнд A, B, C үг орж ирнэ. (A, B, C) гэсэн tuple үүсгэ. Уг tuple-ийн уртыг (len()) хэвлэ.',
    category: 'Tuples',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\n', expectedOutput: '3' },
      { input: '1\n2\n3\n', expectedOutput: '3' },
      { input: 'x\ny\nz\n', expectedOutput: '3' },
      { input: 'apple\nbanana\ncherry\n', expectedOutput: '3' },
      { input: ' \n \n \n', expectedOutput: '3' },
      { input: 'a\na\na\n', expectedOutput: '3' },
      { input: '1\n1\n1\n', expectedOutput: '3' },
      { input: 'red\ngreen\nblue\n', expectedOutput: '3' },
      { input: 'one\ntwo\nthree\n', expectedOutput: '3' },
      { input: 'A\nB\nC\n', expectedOutput: '3' },
    ],
  },
  // --- Tuples Бодлого 4 ---
  {
    id: 'tuples-single-element',
    title: '11.4. Ганц элементтэй Tuple',
    description:
      "Нэг мөрөнд A үг орж ирнэ. (A,) хэлбэртэй (ардаа таслалтай) ганц элементтэй tuple үүсгэж, тэр чигт нь хэвлэ.",
    category: 'Tuples',
    maxScore: 10,
    tests: [
      { input: 'a\n', expectedOutput: "('a',)" },
      { input: '1\n', expectedOutput: "('1',)" },
      { input: 'Hello\n', expectedOutput: "('Hello',)" },
      { input: 'x\n', expectedOutput: "('x',)" },
      { input: 'red\n', expectedOutput: "('red',)" },
      { input: '100\n', expectedOutput: "('100',)" },
      { input: ' \n', expectedOutput: "(' ',)" },
      { input: 'key\n', expectedOutput: "('key',)" },
      { input: 'first\n', expectedOutput: "('first',)" },
      { input: 'Test\n', expectedOutput: "('Test',)" },
    ],
  },
  // --- Tuples Бодлого 5 ---
  {
    id: 'tuples-cannot-change',
    title: '11.5. Tuple өөрчлөгддөггүй',
    description:
      'Хоёр мөрөнд A, B үг орж ирнэ. (A, B) tuple үүсгэ. 0-р индексийн утгыг "ERROR" болгохыг оролд. (Энэ нь TypeError алдаа гаргах ёстой). Алдааны мсж-ийг биш, зүгээр "Error" гэж хэвлэ.',
    category: 'Tuples',
    maxScore: 10,
    // Энэ бодлого нь яг алдааг шалгах зорилготой тул тестүүд нь ижил байна
    tests: [
      { input: 'a\nb\n', expectedOutput: 'Error' },
      { input: '1\n2\n', expectedOutput: 'Error' },
      { input: 'x\ny\n', expectedOutput: 'Error' },
      { input: 'apple\nbanana\n', expectedOutput: 'Error' },
      { input: ' \n \n', expectedOutput: 'Error' },
      { input: 'a\na\n', expectedOutput: 'Error' },
      { input: '1\n1\n', expectedOutput: 'Error' },
      { input: 'red\ngreen\n', expectedOutput: 'Error' },
      { input: 'one\ntwo\n', expectedOutput: 'Error' },
      { input: 'A\nB\n', expectedOutput: 'Error' },
    ],
  },
  // --- Sets Бодлого 1 ---
  {
    id: 'sets-count-unique',
    title: '12.1. Давтагдашгүй элемент тоолох',
    description:
      'Гурван мөрөнд A, B, C үг орж ирнэ. Эдгээрээс set үүсгэж, set-ийн хэмжээг (len()) хэвлэ.',
    category: 'Sets',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\n', expectedOutput: '3' },
      { input: 'a\na\na\n', expectedOutput: '1' },
      { input: 'a\nb\na\n', expectedOutput: '2' },
      { input: '1\n2\n3\n', expectedOutput: '3' },
      { input: '1\n1\n2\n', expectedOutput: '2' },
      { input: 'apple\nbanana\napple\n', expectedOutput: '2' },
      { input: 'red\ngreen\nblue\n', expectedOutput: '3' },
      { input: 'x\nx\nx\n', expectedOutput: '1' },
      { input: ' \n \n.\n', expectedOutput: '2' },
      { input: 'Hello\nWorld\nHello\n', expectedOutput: '2' },
    ],
  },
  // --- Sets Бодлого 2 ---
  {
    id: 'sets-add-element',
    title: '12.2. Set-д элемент нэмэх',
    description:
      'Хоёр мөрөнд A, B үг орж ирнэ. {A} гэсэн set үүсгэж, түүндээ B-г нэм (add). Эцсийн set-ийн хэмжээг хэвлэ.',
    category: 'Sets',
    maxScore: 10,
    tests: [
      { input: 'a\nb\n', expectedOutput: '2' },
      { input: 'a\na\n', expectedOutput: '1' },
      { input: '1\n2\n', expectedOutput: '2' },
      { input: '1\n1\n', expectedOutput: '1' },
      { input: 'apple\nbanana\n', expectedOutput: '2' },
      { input: 'apple\napple\n', expectedOutput: '1' },
      { input: 'x\ny\n', expectedOutput: '2' },
      { input: 'red\nred\n', expectedOutput: '1' },
      { input: ' \n.\n', expectedOutput: '2' },
      { input: 'Hello\nWorld\n', expectedOutput: '2' },
    ],
  },
  // --- Sets Бодлого 3 ---
  {
    id: 'sets-union',
    title: '12.3. Set-үүдийн нэгдэл',
    description:
      "Хоёр мөрөнд A, B үг орж ирнэ. {A} болон {B} гэсэн хоёр set-ийн нэгдлийг (union, |) үүсгэ. Нэгдсэн set-ийн хэмжээг хэвлэ.",
    category: 'Sets',
    maxScore: 10,
    tests: [
      { input: 'a\nb\n', expectedOutput: '2' },
      { input: 'a\na\n', expectedOutput: '1' },
      { input: '1\n2\n', expectedOutput: '2' },
      { input: '1\n1\n', expectedOutput: '1' },
      { input: 'apple\nbanana\n', expectedOutput: '2' },
      { input: 'apple\napple\n', expectedOutput: '1' },
      { input: 'x\ny\n', expectedOutput: '2' },
      { input: 'red\nred\n', expectedOutput: '1' },
      { input: ' \n.\n', expectedOutput: '2' },
      { input: 'Hello\nWorld\n', expectedOutput: '2' },
    ],
  },
  // --- Sets Бодлого 4 ---
  {
    id: 'sets-intersection',
    title: '12.4. Set-үүдийн огтлолцол',
    description:
      "Дөрвөн мөрөнд A, B, C, D үг орж ирнэ. {A, B} болон {C, D} гэсэн хоёр set үүсгэ. Тэдний огтлолцлыг (intersection, &) олж, огтлолцсон set-ийн хэмжээг хэвлэ.",
    category: 'Sets',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\nd\n', expectedOutput: '0' },
      { input: 'a\nb\na\nc\n', expectedOutput: '1' },
      { input: 'a\nb\na\nb\n', expectedOutput: '2' },
      { input: '1\n2\n3\n4\n', expectedOutput: '0' },
      { input: '1\n2\n1\n3\n', expectedOutput: '1' },
      { input: '1\n2\n1\n2\n', expectedOutput: '2' },
      { input: 'apple\nbanana\napple\ncherry\n', expectedOutput: '1' },
      { input: 'x\ny\nz\nw\n', expectedOutput: '0' },
      { input: 'a\na\na\na\n', expectedOutput: '1' }, // {a} & {a} -> 1
      { input: '1\n2\n3\n1\n', expectedOutput: '1' },
    ],
  },
  // --- Sets Бодлого 5 ---
  {
    id: 'sets-difference',
    title: '12.5. Set-үүдийн ялгавар',
    description:
      "Дөрвөн мөрөнд A, B, C, D үг орж ирнэ. {A, B} (S1) болон {C, D} (S2) гэсэн хоёр set үүсгэ. S1-ээс S2-г хассан (difference, -) set-ийн хэмжээг хэвлэ.",
    category: 'Sets',
    maxScore: 10,
    tests: [
      { input: 'a\nb\nc\nd\n', expectedOutput: '2' }, // {a, b} - {c, d} -> {a, b}
      { input: 'a\nb\na\nc\n', expectedOutput: '1' }, // {a, b} - {a, c} -> {b}
      { input: 'a\nb\na\nb\n', expectedOutput: '0' }, // {a, b} - {a, b} -> {}
      { input: '1\n2\n3\n4\n', expectedOutput: '2' },
      { input: '1\n2\n1\n3\n', expectedOutput: '1' }, // {1, 2} - {1, 3} -> {2}
      { input: '1\n2\n1\n2\n', expectedOutput: '0' },
      { input: 'apple\nbanana\napple\ncherry\n', expectedOutput: '1' }, // {banana}
      { input: 'x\ny\nz\nw\n', expectedOutput: '2' },
      { input: 'a\na\na\na\n', expectedOutput: '0' },
      { input: '1\n2\n3\n1\n', expectedOutput: '1' }, // {1, 2} - {3, 1} -> {2}
    ],
  },
  // --- Dictionaries Бодлого 1 ---
  {
    id: 'dict-access-value',
    title: '13.1. Толь бичгээс хайх',
    description:
      'Эхний мөрөнд key1, хоёр дахь мөрөнд value1 орж ирнэ. Гурав дахь мөрөнд хайх key (key_find) орж ирнэ. {key1: value1} гэсэн толь бичиг үүсгэ. Хэрэв key_find нь key1-тэй тэнцүү бол value1-г хэвлэ.',
    category: 'Dictionaries',
    maxScore: 10,
    tests: [
      { input: 'name\nSant\nname\n', expectedOutput: 'Sant' },
      { input: 'age\n10\nage\n', expectedOutput: '10' },
      { input: 'a\n1\na\n', expectedOutput: '1' },
      { input: 'b\n2\nb\n', expectedOutput: '2' },
      { input: 'color\nred\ncolor\n', expectedOutput: 'red' },
      { input: 'fruit\napple\nfruit\n', expectedOutput: 'apple' },
      { input: 'id\n123\nid\n', expectedOutput: '123' },
      { input: 'x\ny\nx\n', expectedOutput: 'y' },
      { input: 'key\nvalue\nkey\n', expectedOutput: 'value' },
      { input: 'py\nthon\npy\n', expectedOutput: 'thon' },
    ],
  },
  // --- Dictionaries Бодлого 2 ---
  {
    id: 'dict-add-key',
    title: '13.2. Шинэ утга нэмэх',
    description:
      'Эхний мөрөнд k1, хоёр дахь мөрөнд v1 орж ирнэ. Гурав дахь мөрөнд k2, дөрөв дэх мөрөнд v2 орж ирнэ. {k1: v1} гэсэн толь бичиг үүсгэж, түүндээ k2: v2 хосыг нэм. Толь бичгийн хэмжээг (len()) хэвлэ.',
    category: 'Dictionaries',
    maxScore: 10,
    tests: [
      { input: 'a\n1\nb\n2\n', expectedOutput: '2' },
      { input: 'a\n1\na\n2\n', expectedOutput: '1' }, // a-г дарж бичнэ
      { input: 'name\nSant\nage\n10\n', expectedOutput: '2' },
      { input: 'name\nSant\nname\nBat\n', expectedOutput: '1' },
      { input: 'x\n1\ny\n2\n', expectedOutput: '2' },
      { input: 'x\n1\nx\n1\n', expectedOutput: '1' },
      { input: '1\na\n2\nb\n', expectedOutput: '2' },
      { input: 'red\n1\nblue\n2\n', expectedOutput: '2' },
      { input: 'fruit\napple\nfruit\nbanana\n', expectedOutput: '1' },
      { input: 'a\n10\nb\n20\n', expectedOutput: '2' },
    ],
  },
  // --- Dictionaries Бодлого 3 ---
  {
    id: 'dict-change-value',
    title: '13.3. Утга өөрчлөх',
    description:
      'Эхний мөрөнд k1, хоёр дахь мөрөнд v1 орж ирнэ. Гурав дахь мөрөнд v2 орж ирнэ. {k1: v1} гэсэн толь бичиг үүсгэ. k1-ийн утгыг v2 болгож өөрчил. k1-д харгалзах шинэ утгыг хэвлэ.',
    category: 'Dictionaries',
    maxScore: 10,
    tests: [
      { input: 'name\nSant\nBat\n', expectedOutput: 'Bat' },
      { input: 'age\n10\n20\n', expectedOutput: '20' },
      { input: 'a\n1\n2\n', expectedOutput: '2' },
      { input: 'x\nHello\nWorld\n', expectedOutput: 'World' },
      { input: 'status\nold\nnew\n', expectedOutput: 'new' },
      { input: 'color\nred\nblue\n', expectedOutput: 'blue' },
      { input: 'v\n1\n100\n', expectedOutput: '100' },
      { input: 'id\n1\n99\n', expectedOutput: '99' },
      { input: 'A\nB\nC\n', expectedOutput: 'C' },
      { input: 'py\n1\n2\n', expectedOutput: '2' },
    ],
  },
  // --- Dictionaries Бодлого 4 ---
  {
    id: 'dict-get-with-default',
    title: '13.4. .get() ашиглах',
    description:
      'Эхний мөрөнд k1, хоёр дахь мөрөнд v1 орж ирнэ. Гурав дахь мөрөнд хайх key (key_find) орж ирнэ. {k1: v1} толь бичгээс `key_find`-г `.get()` ашиглан хай. Олдохгүй бол "Not Found" гэж хэвлэ.',
    category: 'Dictionaries',
    maxScore: 10,
    tests: [
      { input: 'name\nSant\nname\n', expectedOutput: 'Sant' },
      { input: 'name\nSant\nage\n', expectedOutput: 'Not Found' },
      { input: 'a\n1\na\n', expectedOutput: '1' },
      { input: 'a\n1\nb\n', expectedOutput: 'Not Found' },
      { input: 'color\nred\ncolor\n', expectedOutput: 'red' },
      { input: 'color\nred\nsize\n', expectedOutput: 'Not Found' },
      { input: 'id\n99\nid\n', expectedOutput: '99' },
      { input: 'id\n99\nname\n', expectedOutput: 'Not Found' },
      { input: 'x\ny\nx\n', expectedOutput: 'y' },
      { input: 'x\ny\nz\n', expectedOutput: 'Not Found' },
    ],
  },
  // --- Dictionaries Бодлого 5 ---
  {
    id: 'dict-check-key-in',
    title: '13.5. Түлхүүр шалгах (in)',
    description:
      'Эхний мөрөнд k1, хоёр дахь мөрөнд v1 орж ирнэ. Гурав дахь мөрөнд шалгах key (key_check) орж ирнэ. `key_check` нь {k1: v1} толь бичигт *түлхүүр* болж орсон эсэхийг (in) шалгаж "True" эсвэл "False" хэвлэ.',
    category: 'Dictionaries',
    maxScore: 10,
    tests: [
      { input: 'name\nSant\nname\n', expectedOutput: 'True' },
      { input: 'name\nSant\nage\n', expectedOutput: 'False' },
      { input: 'name\nSant\nSant\n', expectedOutput: 'False' }, // 'Sant' бол value
      { input: 'a\n1\na\n', expectedOutput: 'True' },
      { input: 'a\n1\nb\n', expectedOutput: 'False' },
      { input: 'a\n1\n1\n', expectedOutput: 'False' }, // '1' бол value
      { input: 'color\nred\ncolor\n', expectedOutput: 'True' },
      { input: 'color\nred\nred\n', expectedOutput: 'False' },
      { input: 'id\n123\nid\n', expectedOutput: 'True' },
      { input: 'id\n123\n123\n', expectedOutput: 'False' },
    ],
  },
  // --- If...Else Бодлого 1 ---
  {
    id: 'if-else-positive-negative',
    title: '14.1. Эерэг, Сөрөг эсвэл Тэг',
    description:
      "Нэг бүхэл тоо орж ирнэ. Хэрэв тоо 0-ээс их бол 'Positive', 0-ээс бага бол 'Negative', 0-тэй тэнцүү бол 'Zero' гэж хэвлэ.",
    category: 'If...Else',
    maxScore: 10,
    tests: [
      { input: '5\n', expectedOutput: 'Positive' },
      { input: '-3\n', expectedOutput: 'Negative' },
      { input: '0\n', expectedOutput: 'Zero' },
      { input: '999\n', expectedOutput: 'Positive' },
      { input: '-1\n', expectedOutput: 'Negative' },
      { input: '1\n', expectedOutput: 'Positive' },
      { input: '-1000\n', expectedOutput: 'Negative' },
      { input: '10\n', expectedOutput: 'Positive' },
      { input: '-10\n', expectedOutput: 'Negative' },
      { input: '2\n', expectedOutput: 'Positive' },
    ],
  },
  // --- If...Else Бодлого 2 ---
  {
    id: 'if-else-even-odd',
    title: '14.2. Тэгш эсвэл Сондгой',
    description:
      "Нэг бүхэл тоо орж ирнэ. Хэрэв тоо 2-т хуваагдахад үлдэгдэл нь 0 бол 'Even', эс бөгөөс 'Odd' гэж хэвлэ.",
    category: 'If...Else',
    maxScore: 10,
    tests: [
      { input: '2\n', expectedOutput: 'Even' },
      { input: '3\n', expectedOutput: 'Odd' },
      { input: '0\n', expectedOutput: 'Even' },
      { input: '100\n', expectedOutput: 'Even' },
      { input: '101\n', expectedOutput: 'Odd' },
      { input: '1\n', expectedOutput: 'Odd' },
      { input: '-1\n', expectedOutput: 'Odd' },
      { input: '-2\n', expectedOutput: 'Even' },
      { input: '7\n', expectedOutput: 'Odd' },
      { input: '14\n', expectedOutput: 'Even' },
    ],
  },
  // --- If...Else Бодлого 3 ---
  {
    id: 'if-else-compare-two',
    title: '14.3. Хоёр тоог харьцуулах',
    description:
      "Хоёр мөрөнд A, B бүхэл тоо орж ирнэ. Хэрэв A > B бол 'A is greater', хэрэв A < B бол 'B is greater', хэрэв тэнцүү бол 'A and B are equal' гэж хэвлэ.",
    category: 'If...Else',
    maxScore: 10,
    tests: [
      { input: '10\n5\n', expectedOutput: 'A is greater' },
      { input: '5\n10\n', expectedOutput: 'B is greater' },
      { input: '5\n5\n', expectedOutput: 'A and B are equal' },
      { input: '-1\n-5\n', expectedOutput: 'A is greater' },
      { input: '-5\n-1\n', expectedOutput: 'B is greater' },
      { input: '0\n0\n', expectedOutput: 'A and B are equal' },
      { input: '0\n-1\n', expectedOutput: 'A is greater' },
      { input: '-1\n0\n', expectedOutput: 'B is greater' },
      { input: '99\n99\n', expectedOutput: 'A and B are equal' },
      { input: '100\n99\n', expectedOutput: 'A is greater' },
    ],
  },
  // --- If...Else Бодлого 4 ---
  {
    id: 'if-else-string-check',
    title: '14.4. Текст шалгах',
    description:
      "Нэг мөрөнд текст орж ирнэ. Хэрэв текст *яг* 'python' бол 'Correct', хэрэв *яг* 'java' бол 'Also Correct', бусад тохиолдолд 'Incorrect' гэж хэвлэ.",
    category: 'If...Else',
    maxScore: 10,
    tests: [
      { input: 'python\n', expectedOutput: 'Correct' },
      { input: 'java\n', expectedOutput: 'Also Correct' },
      { input: 'c++\n', expectedOutput: 'Incorrect' },
      { input: 'Python\n', expectedOutput: 'Incorrect' }, // Case sensitive
      { input: 'Java\n', expectedOutput: 'Incorrect' },
      { input: 'javascript\n', expectedOutput: 'Incorrect' },
      { input: 'hello\n', expectedOutput: 'Incorrect' },
      { input: 'py\n', expectedOutput: 'Incorrect' },
      { input: ' python\n', expectedOutput: 'Incorrect' }, // has space
      { input: 'python\n\n', expectedOutput: 'Incorrect' },
    ],
  },
  // --- If...Else Бодлого 5 ---
  {
    id: 'if-else-grading',
    title: '14.5. Дүнгийн шалгалт',
    description:
      "Нэг мөрөнд 0-100 хооронд дүн (бүхэл тоо) орж ирнэ. 90-100 бол 'A', 80-89 бол 'B', 70-79 бол 'C', 60-69 бол 'D', 60-аас доош бол 'F' гэж хэвлэ.",
    category: 'If...Else',
    maxScore: 10,
    tests: [
      { input: '95\n', expectedOutput: 'A' },
      { input: '90\n', expectedOutput: 'A' },
      { input: '89\n', expectedOutput: 'B' },
      { input: '80\n', expectedOutput: 'B' },
      { input: '75\n', expectedOutput: 'C' },
      { input: '70\n', expectedOutput: 'C' },
      { input: '61\n', expectedOutput: 'D' },
      { input: '59\n', expectedOutput: 'F' },
      { input: '0\n', expectedOutput: 'F' },
      { input: '100\n', expectedOutput: 'A' },
    ],
  },
  // --- Match Бодлого 1 ---
  {
    id: 'match-case-day',
    title: '15.1. Долоо хоногийн өдөр (Match)',
    description:
      "1-3 хооронд тоо орж ирнэ. 1 бол 'Monday', 2 бол 'Tuesday', 3 бол 'Wednesday' гэж хэвлэ. Бусад тохиолдолд (wildcard _) 'Other' гэж хэвлэ. (Python 3.10+ Match...Case ашиглах)",
    category: 'Match',
    maxScore: 10,
    tests: [
      { input: '1\n', expectedOutput: 'Monday' },
      { input: '2\n', expectedOutput: 'Tuesday' },
      { input: '3\n', expectedOutput: 'Wednesday' },
      { input: '4\n', expectedOutput: 'Other' },
      { input: '0\n', expectedOutput: 'Other' },
      { input: '7\n', expectedOutput: 'Other' },
      { input: '-1\n', expectedOutput: 'Other' },
      { input: '100\n', expectedOutput: 'Other' },
      { input: '1\n', expectedOutput: 'Monday' }, // re-test
      { input: '3\n', expectedOutput: 'Wednesday' }, // re-test
    ],
  },
  // --- Match Бодлого 2 ---
  {
    id: 'match-case-string-command',
    title: '15.2. Команд таних (Match)',
    description:
      "Нэг мөрөнд команд (текст) орж ирнэ. 'start' бол 'Starting...', 'stop' бол 'Stopping...', 'pause' бол 'Pausing...' гэж хэвлэ. Бусад тохиолдолд 'Unknown command' гэж хэвлэ.",
    category: 'Match',
    maxScore: 10,
    tests: [
      { input: 'start\n', expectedOutput: 'Starting...' },
      { input: 'stop\n', expectedOutput: 'Stopping...' },
      { input: 'pause\n', expectedOutput: 'Pausing...' },
      { input: 'resume\n', expectedOutput: 'Unknown command' },
      { input: 'START\n', expectedOutput: 'Unknown command' }, // Case sensitive
      { input: 'Stop\n', expectedOutput: 'Unknown command' },
      { input: 'hello\n', expectedOutput: 'Unknown command' },
      { input: ' \n', expectedOutput: 'Unknown command' },
      { input: 'start \n', expectedOutput: 'Unknown command' },
      { input: 'stop\n', expectedOutput: 'Stopping...' }, // re-test
    ],
  },
  // --- Match Бодлого 3 ---
  {
    id: 'match-case-http-status',
    title: '15.3. HTTP Статус код (Match)',
    description:
      "Нэг мөрөнд HTTP статус код (бүхэл тоо) орж ирнэ. 200 бол 'OK', 404 бол 'Not Found', 500 бол 'Server Error' гэж хэвлэ. Бусад тохиолдолд 'Other code' гэж хэвлэ.",
    category: 'Match',
    maxScore: 10,
    tests: [
      { input: '200\n', expectedOutput: 'OK' },
      { input: '404\n', expectedOutput: 'Not Found' },
      { input: '500\n', expectedOutput: 'Server Error' },
      { input: '201\n', expectedOutput: 'Other code' },
      { input: '302\n', expectedOutput: 'Other code' },
      { input: '403\n', expectedOutput: 'Other code' },
      { input: '0\n', expectedOutput: 'Other code' },
      { input: '100\n', expectedOutput: 'Other code' },
      { input: '404\n', expectedOutput: 'Not Found' }, // re-test
      { input: '503\n', expectedOutput: 'Other code' },
    ],
  },
  // --- Match Бодлого 4 ---
  {
    id: 'match-case-or-pattern',
    title: '15.4. Нэгтгэсэн | хэв (Match)',
    description:
      "Нэг мөрөнд A, B, C, D, F үсгүүдийн аль нэг нь орж ирнэ. 'A' эсвэл 'B' эсвэл 'C' ( | ашиглан) бол 'Pass' гэж, 'D' эсвэл 'F' бол 'Fail' гэж хэвлэ. Бусад тохиолдолд 'Invalid' гэж хэвлэ.",
    category: 'Match',
    maxScore: 10,
    tests: [
      { input: 'A\n', expectedOutput: 'Pass' },
      { input: 'B\n', expectedOutput: 'Pass' },
      { input: 'C\n', expectedOutput: 'Pass' },
      { input: 'D\n', expectedOutput: 'Fail' },
      { input: 'F\n', expectedOutput: 'Fail' },
      { input: 'E\n', expectedOutput: 'Invalid' },
      { input: 'a\n', expectedOutput: 'Invalid' },
      { input: 'Pass\n', expectedOutput: 'Invalid' },
      { input: 'f\n', expectedOutput: 'Invalid' },
      { input: 'B\n', expectedOutput: 'Pass' }, // re-test
    ],
  },
  // --- Match Бодлого 5 ---
  {
    id: 'match-case-vowel-consonant',
    title: '15.5. Эгшиг / Гийгүүлэгч (Match)',
    description:
      "Нэг мөрөнд жижиг англи үсэг (a-z) орж ирнэ. Хэрэв 'a', 'e', 'i', 'o', 'u' үсгүүдийн аль нэг нь ( | ашиглан) бол 'Vowel', бусад (wildcard _) тохиолдолд 'Consonant' гэж хэвлэ.",
    category: 'Match',
    maxScore: 10,
    tests: [
      { input: 'a\n', expectedOutput: 'Vowel' },
      { input: 'b\n', expectedOutput: 'Consonant' },
      { input: 'e\n', expectedOutput: 'Vowel' },
      { input: 'z\n', expectedOutput: 'Consonant' },
      { input: 'i\n', expectedOutput: 'Vowel' },
      { input: 'o\n', expectedOutput: 'Vowel' },
      { input: 'u\n', expectedOutput: 'Vowel' },
      { input: 'x\n', expectedOutput: 'Consonant' },
      { input: 'k\n', expectedOutput: 'Consonant' },
      { input: 'c\n', expectedOutput: 'Consonant' },
    ],
  },
  // --- For Loops Бодлого 1 ---
  {
    id: 'for-loop-n-times',
    title: '16.1. N удаа хэвлэх',
    description:
      'Эхний мөрөнд N тоо, хоёр дахь мөрөнд S текст орж ирнэ. S текстийг N удаа, мөр тус бүрт хэвлэ.',
    category: 'For Loops',
    maxScore: 10,
    tests: [
      { input: '3\na\n', expectedOutput: 'a\na\na\n' },
      { input: '2\nHello\n', expectedOutput: 'Hello\nHello\n' },
      { input: '1\nTest\n', expectedOutput: 'Test\n' },
      { input: '0\nWow\n', expectedOutput: '' },
      { input: '5\nx\n', expectedOutput: 'x\nx\nx\nx\nx\n' },
      { input: '2\n123\n', expectedOutput: '123\n123\n' },
      { input: '4\n \n', expectedOutput: ' \n \n \n \n' },
      { input: '1\nPython\n', expectedOutput: 'Python\n' },
      { input: '3\nOK\n', expectedOutput: 'OK\nOK\nOK\n' },
      { input: '0\nTest\n', expectedOutput: '' },
    ],
  },
  // --- For Loops Бодлого 2 ---
  {
    id: 'for-loop-count-to-n',
    title: '16.2. N хүртэл тоолох',
    description:
      "Нэг мөрөнд N тоо (N >= 1) орж ирнэ. `range(1, N+1)` ашиглан 1-ээс N хүртэлх тоог тус тусад нь мөрөнд хэвлэ.",
    category: 'For Loops',
    maxScore: 10,
    tests: [
      { input: '3\n', expectedOutput: '1\n2\n3\n' },
      { input: '1\n', expectedOutput: '1\n' },
      { input: '5\n', expectedOutput: '1\n2\n3\n4\n5\n' },
      { input: '2\n', expectedOutput: '1\n2\n' },
      { input: '7\n', expectedOutput: '1\n2\n3\n4\n5\n6\n7\n' },
      { input: '4\n', expectedOutput: '1\n2\n3\n4\n' },
      { input: '10\n', expectedOutput: '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n' },
      { input: '6\n', expectedOutput: '1\n2\n3\n4\n5\n6\n' },
      { input: '1\n', expectedOutput: '1\n' }, // re-test
      { input: '3\n', expectedOutput: '1\n2\n3\n' }, // re-test
    ],
  },
  // --- For Loops Бодлого 3 ---
  {
    id: 'for-loop-sum-to-n',
    title: '16.3. N хүртэлх тооны нийлбэр',
    description:
      'Нэг мөрөнд N тоо (N >= 0) орж ирнэ. 0-оос N хүртэлх (N-ийг оролцуулаад) бүх тооны нийлбэрийг олж хэвлэ.',
    category: 'For Loops',
    maxScore: 10,
    tests: [
      { input: '3\n', expectedOutput: '6' }, // 0 + 1 + 2 + 3 = 6
      { input: '1\n', expectedOutput: '1' }, // 0 + 1 = 1
      { input: '0\n', expectedOutput: '0' },
      { input: '5\n', expectedOutput: '15' }, // 0 + 1 + 2 + 3 + 4 + 5 = 15
      { input: '10\n', expectedOutput: '55' },
      { input: '2\n', expectedOutput: '3' }, // 0 + 1 + 2 = 3
      { input: '100\n', expectedOutput: '5050' },
      { input: '4\n', expectedOutput: '10' }, // 0 + 1 + 2 + 3 + 4 = 10
      { input: '6\n', expectedOutput: '21' },
      { input: '7\n', expectedOutput: '28' },
    ],
  },
  // --- For Loops Бодлого 4 ---
  {
    id: 'for-loop-string-chars',
    title: '16.4. Текстийн тэмдэгтүүд',
    description:
      'Нэг мөрөнд S текст орж ирнэ. Давталт ашиглан S текстийн тэмдэгт бүрийг тус тусад нь шинэ мөрөнд хэвлэ.',
    category: 'For Loops',
    maxScore: 10,
    tests: [
      { input: 'abc\n', expectedOutput: 'a\nb\nc\n' },
      { input: 'Hi\n', expectedOutput: 'H\ni\n' },
      { input: '123\n', expectedOutput: '1\n2\n3\n' },
      { input: 'a\n', expectedOutput: 'a\n' },
      { input: '\n', expectedOutput: '' }, // Хоосон
      { input: 'x y\n', expectedOutput: 'x\n \ny\n' },
      { input: 'Test\n', expectedOutput: 'T\ne\ns\nt\n' },
      { input: 'py\n', expectedOutput: 'p\ny\n' },
      { input: 'OK\n', expectedOutput: 'O\nK\n' },
      { input: ' z \n', expectedOutput: ' \nz\n \n' },
    ],
  },
  // --- For Loops Бодлого 5 ---
  {
    id: 'for-loop-even-numbers',
    title: '16.5. Тэгш тоонууд',
    description:
      'Нэг мөрөнд N тоо (N >= 0) орж ирнэ. `range()`-ийн 3 дахь аргументийг (алхам) ашиглан 0-ээс N хүртэлх (N-ийг оролцуулаад) бүх *тэгш* тоог шинэ мөрөнд хэвлэ.',
    category: 'For Loops',
    maxScore: 10,
    tests: [
      { input: '5\n', expectedOutput: '0\n2\n4\n' },
      { input: '6\n', expectedOutput: '0\n2\n4\n6\n' },
      { input: '1\n', expectedOutput: '0\n' },
      { input: '0\n', expectedOutput: '0\n' },
      { input: '10\n', expectedOutput: '0\n2\n4\n6\n8\n10\n' },
      { input: '7\n', expectedOutput: '0\n2\n4\n6\n' },
      { input: '2\n', expectedOutput: '0\n2\n' },
      { input: '3\n', expectedOutput: '0\n2\n' },
      { input: '9\n', expectedOutput: '0\n2\n4\n6\n8\n' },
      { input: '11\n', expectedOutput: '0\n2\n4\n6\n8\n10\n' },
    ],
  }
];


// --- 🎲 РАНДОМ ТУСЛАХ ФУНКЦҮҮД ---

/** Жижиг RNG — нэгэн ижил seed-д үр дүн тогтвортой байхын тулд */
function mulberry32(seed: number) {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Тэмдэгт мөрийг тоон seed болгож хувиргах */
function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Санамсаргүй K бодлого сонгох (seed өгвөл тогтвортой).
 * Нэг сэдвээс хэзээ ч хоёр бодлого сонгохгүй.
 */
export function pickRandomProblems(k = 5, seed?: string): Problem[] {
  const rnd: () => number = seed
    ? mulberry32(seedFromString(seed))
    : Math.random;

  // 1️⃣ Бодлогуудыг сэдвээр нь бүлэглэх
  const problemsByCategory = new Map<ProblemCategory, Problem[]>();
  for (const problem of problems) {
    if (!problemsByCategory.has(problem.category)) {
      problemsByCategory.set(problem.category, []);
    }
    problemsByCategory.get(problem.category)!.push(problem);
  }

  // 2️⃣ Сонгох боломжтой бүх сэдвүүдийн жагсаалтыг гаргах
  const availableCategories = Array.from(problemsByCategory.keys());

  // 3️⃣ Сэдвүүдийг санамсаргүйгээр холих (Fisher–Yates shuffle)
  for (let i = availableCategories.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [availableCategories[i], availableCategories[j]] = [
      availableCategories[j],
      availableCategories[i],
    ];
  }

  // 4️⃣ K ширхэг сэдвийг сонгох
  const n = Math.min(k, availableCategories.length);
  const selectedCategories = availableCategories.slice(0, n);

  // 5️⃣ Сонгогдсон сэдэв тус бүрээс нэг санамсаргүй бодлого сонгох
  const result: Problem[] = [];
  for (const category of selectedCategories) {
    const problemsInThisCategory = problemsByCategory.get(category);
    if (!problemsInThisCategory || problemsInThisCategory.length === 0) continue;
    const randomIndex = Math.floor(rnd() * problemsInThisCategory.length);
    result.push(problemsInThisCategory[randomIndex]);
  }

  return result;
}
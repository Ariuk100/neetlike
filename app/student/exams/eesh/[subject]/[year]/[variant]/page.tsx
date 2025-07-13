'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image' // Image компонентыг импортлосон
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import LatexRenderer from '@/components/LatexRenderer' // LatexRenderer импортыг зассан
import { Progress } from "@/components/ui/progress"
import ScrollToTopButton from '@/components/ScrollToTopButton'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'



interface Option {
  label: string
  text: string | null
  image: string | null
}


const SUBJECT_MAP: Record<string, string> = {
  physics: 'Физик',
  chemistry: 'Хими',
  biology: 'Биологи',
  mathematics: 'Математик',
  geography: 'Газарзүй',
  history: 'Түүх',
  english: 'Англи хэл',
  mongolian: 'Монгол хэл',
  social: 'Нийгэм',
  russian: 'Орос хэл',
}


interface Question {
  question: string
  questionImage?: string
  options?: Option[]
  answer: string | number
  type: 'choice' | 'input'
  section: number
  score: number
}

const BUCKET_URL = 'https://pub-b844ecbdf2cc404f89f663f350f90fc0.r2.dev/'

export default function EeshTestPage() {
  const { subject, year, variant } = useParams()
  const router = useRouter()

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string | number>>({})
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [finished, setFinished] = useState(false)
  const [wrong, setWrong] = useState<number[]>([])  

  useEffect(() => {
    const fetchQuestionsAndImages = async () => {
      if (!subject || !year || !variant) return

      try {
        const filename = `${subject}-${year}-${variant}.json`
        const res = await fetch(`${BUCKET_URL}${filename}`)
        if (!res.ok) throw new Error('Файл олдсонгүй')
        const data: Question[] = await res.json()
        setQuestions(data)

        const imageNames = new Set<string>()
        data.forEach((q) => {
          if (q.questionImage) imageNames.add(q.questionImage)
          q.options?.forEach((opt) => {
            if (opt.image && opt.image.length > 0) {
              imageNames.add(opt.image)
            }
          })
        })

        const resolved: Record<string, string> = {}
        await Promise.all(
          Array.from(imageNames).map(async (name) => {
            const extList = ['.png', '.jpg']
            for (const ext of extList) {
              const url = `${BUCKET_URL}${name}${ext}`
              try {
                const res = await fetch(url, { method: 'HEAD' })
                if (res.ok) {
                  resolved[name] = url
                  return
                }
              } catch (error: unknown) { // 'any' алдааг зассан
                console.error('Error checking image URL:', error); // 'error' хувьсагчийг ашигласан
                // Алдааг санаатайгаар үл тоомсорлосон
              }
            }
          })
        )

        setImageUrls(resolved)
      } catch (error: unknown) { // 'any' алдааг зассан
        console.error('Error fetching questions or images:', error); // 'error' хувьсагчийг ашигласан
        router.push('/404')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestionsAndImages()
  }, [subject, year, variant, router]) // 'router'-г dependency array-д нэмсэн
  

  const handleFinish = () => {
    setFinished(true)
    const wrongList = questions
      .map((q, i) => {
        const a = answers[i]
        // 'i' хувьсагчийг ашиглаж байгаа тул unused алдаа байхгүй.
        return a === undefined || a.toString().trim() !== q.answer.toString().trim() ? i : null
      })
      .filter((x): x is number => x !== null)
    setWrong(wrongList)
  }

  const correct = questions.reduce((sum, q, i) => {
    const a = answers[i]
    if (a !== undefined && a.toString().trim() === q.answer.toString().trim()) {
      return sum + q.score
    }
    return sum
  }, 0)

  return (
    <div className="flex flex-row max-w-7xl mx-auto py-10 px-4 gap-6">
    <div className="flex-1 space-y-6">
      <h1 className="text-2xl font-bold text-center text-blue-600">
        {year} оны ЭЕШ - {SUBJECT_MAP[subject?.toString() || ''] || subject?.toString().toUpperCase()} - {variant} хувилбар
      </h1>
      {!finished && !loading && (
        <Progress
          value={((current + 1) / questions.length) * 100}
          className="h-2 mb-2"
        />
      )}

      {loading ? (
        <Skeleton className="h-10 w-full" />
      ) : finished ? (
        <>
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => router.push('/student/exams/eesh')}>
              ← Буцах
            </Button>
          </div>

          <Card className="text-center mt-4">
  <CardHeader>
    <CardTitle>Тест дууслаа</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-lg font-semibold">
      Нийт оноо: {correct} / {questions.reduce((s, q) => s + q.score, 0)}
    </p>

    {/* Хэсэг тус бүрийн оноо + Pie Chart */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {[1, 2].map((section) => {
        const sectionQuestions = questions.filter((q) => q.section === section)
        const sectionScore = sectionQuestions.reduce((s, q) => s + q.score, 0)
        const sectionCorrect = sectionQuestions.reduce((sum, q) => {
          const idx = questions.findIndex((qq) => qq === q)
          const userAnswer = answers[idx]
          return userAnswer?.toString().trim() === q.answer.toString().trim()
            ? sum + q.score
            : sum
        }, 0)

        const sectionCorrectCount = sectionQuestions.filter((q) => {
          const idx = questions.findIndex((qq) => qq === q)
          return answers[idx]?.toString().trim() === q.answer.toString().trim()
        }).length
        const sectionTotalCount = sectionQuestions.length

        return (
          <Card key={`section-${section}`} className="border shadow">
            <CardHeader>
              <CardTitle className="text-base">Хэсэг {section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold">
                {sectionCorrect} / {sectionScore}
              </p>
              <div className="flex justify-center">
                <PieChart width={180} height={180}>
                  <Pie
                    data={[
                      { name: 'Зөв даалгавар', value: sectionCorrectCount },
                      { name: 'Алдсан / хариулаагүй', value: sectionTotalCount - sectionCorrectCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label
                    labelLine={false}
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#dc2626" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>

    {/* Алдсан асуултын тоо */}
    {wrong.length > 0 && (
      <p className="mt-6 text-sm text-red-500">
        Алдсан болон хариулаагүй {wrong.length} асуултыг доороос харна уу.
      </p>
    )}
  </CardContent>
</Card>

          {wrong.map((i) => { // 'i' хувьсагч ашиглагдаж байгаа тул eslint-disable-next-line-г хассан
            const selected = questions[i].options?.find(opt => opt.label === answers[i])
            const correctOpt = questions[i].options?.find(opt => opt.label === questions[i].answer)
            return (
              <Card key={`wrong-${i}`} className={`border shadow ${answers[i] === questions[i].answer ? 'border-green-500' : 'border-red-500'}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-start gap-2">
                    <span>{i + 1}.</span>
                    <LatexRenderer text={questions[i].question} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {questions[i].questionImage && imageUrls[questions[i].questionImage] && (
                    <div className="relative mx-auto rounded border max-w-full" style={{ height: '300px' }}>
                      <Image
                        src={imageUrls[questions[i].questionImage]}
                        alt={`Асуултын зураг ${i + 1}`}
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-red-500 font-semibold">Таны хариулт:</p>
                      {selected ? (
                        <div className="pl-2">
                          <p className="text-sm">
                            <strong>{selected.label}.</strong>{' '}
                            {selected.text && <LatexRenderer text={selected.text} />}
                          </p>
                          {selected.image && imageUrls[selected.image] && (
                            <div className="relative mx-auto rounded border w-20 h-20">
                              <Image
                                src={imageUrls[selected.image]}
                                alt={`Сонгосон зураг ${selected.label}`}
                                fill
                                style={{ objectFit: 'contain' }}
                                className="rounded"
                              />
                            </div>
                          )}
                        </div>
                      ) : <p className="text-sm italic text-gray-500">Хариулаагүй</p>}
                    </div>
                    <div>
                      <p className="text-green-600 font-semibold">Зөв хариулт:</p>
                      {correctOpt && (
                        <div className="pl-2">
                          <p className="text-sm">
                            <strong>{correctOpt.label}.</strong>{' '}
                            {correctOpt.text && <LatexRenderer text={correctOpt.text} />}
                          </p>
                          {correctOpt.image && imageUrls[correctOpt.image] && (
                            <div className="relative mx-auto rounded border w-20 h-20">
                              <Image
                                src={imageUrls[correctOpt.image]}
                                alt={`Зөв хариултын зураг ${correctOpt.label}`}
                                fill
                                style={{ objectFit: 'contain' }}
                                className="rounded"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </>
      ) : questions[current] && (
        <Card className="border shadow">
          <CardHeader>
            <div className="flex justify-between items-center gap-2 pb-4">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((prev) => prev - 1)}>
                Өмнөх
              </Button>
              <Button variant="destructive" onClick={handleFinish}>
                Дуусгах
              </Button>
              <Button variant="outline" disabled={current === questions.length - 1} onClick={() => setCurrent((prev) => prev + 1)}>
                Дараах
              </Button>
            </div>
            <p className="text-sm font-normal pl-2">
              <span className="font-semibold mr-1">{current + 1}.</span>
              <LatexRenderer text={questions[current].question} />
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions[current].questionImage && imageUrls[questions[current].questionImage] && (
              <div className="relative mx-auto rounded border max-w-full" style={{ height: '300px' }}>
                <Image
                  src={imageUrls[questions[current].questionImage]}
                  alt={`Асуултын зураг ${current + 1}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded"
                />
              </div>
            )}
            {questions[current].options?.map((opt) => (
              <div key={opt.label} className="pl-2">
                <p className="text-sm">
                  <strong>{opt.label}.</strong>{' '}
                  {opt.text && <LatexRenderer text={opt.text} />}
                </p>
                {opt.image && imageUrls[opt.image] && (
                  <div className="relative mt-1 rounded border w-20 h-20">
                    <Image
                      src={imageUrls[opt.image]}
                      alt={`Сонголтын зураг ${opt.label}`}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded"
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="grid grid-cols-5 gap-2 pt-4">
              {questions[current].options?.map((opt) => (
                <div
                  key={`btn-${opt.label}`}
                  onClick={() => {
                    setAnswers((prev) => ({ ...prev, [current]: opt.label }))
                    if (questions[current].type === 'choice' && current < questions.length - 1) {
                      setTimeout(() => setCurrent((prev) => prev + 1), 300)
                    }
                  }}
                  className={`border px-4 py-2 text-center rounded cursor-pointer font-bold text-lg ${
                    answers[current] === opt.label
                      ? 'bg-blue-100 border-blue-500'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </div>
              ))}
            </div>
            {questions[current].type === 'input' && (
              <Input
                value={answers[current]?.toString() || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [current]: e.target.value,
                  }))
                }
                placeholder="Хариултаа бичнэ үү"
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
    <div className="w-36 sticky top-24 h-fit">
    
    {!loading && !finished && (
        <div className="grid grid-cols-3 gap-2 w-32">
          {questions.map((_, idx) => (
            <Button
              key={`nav-${idx}`}
              variant={idx === current ? 'default' : answers[idx] !== undefined ? 'secondary' : 'outline'}
              onClick={() => setCurrent(idx)}
              className="px-0"
            >
              {idx + 1}
            </Button>
          ))}
        </div>
      )}
    </div>
    <ScrollToTopButton />
    </div>
      
  )
}

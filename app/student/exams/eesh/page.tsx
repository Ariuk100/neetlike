'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

const subjects = [
  { name: 'Физик', slug: 'physics' },
  { name: 'Математик', slug: 'math' },
  { name: 'Хими', slug: 'chemistry' },
  { name: 'Биологи', slug: 'biology' },
  { name: 'Англи хэл', slug: 'english' },
  { name: 'Монгол хэл', slug: 'mongolian' },
  { name: 'Нийгэм', slug: 'social' },
  { name: 'Түүх', slug: 'history' },
  { name: 'Газарзүй', slug: 'geography' },
  { name: 'Орос хэл', slug: 'russian' },
]

const years = Array.from({ length: 2025 - 2006 + 1 }, (_, i) => 2025 - i)
const variants = ['A', 'B', 'C', 'D']

export default function EeshSelectorPage() {
  const [subject, setSubject] = useState('')
  const [year, setYear] = useState('')
  const [variant, setVariant] = useState('')
  const router = useRouter()

  const handleStart = () => {
    if (!subject || !year || !variant) return
    router.push(`/student/exams/eesh/${subject}/${year}/${variant}`)
  }

  return (
    <div className="max-w-2xl mx-auto mt-20 space-y-8 px-4">
      <h1 className="text-2xl font-bold text-center">ЭЕШ шалгалт сонгох</h1>

      {/* Сонголтууд нэг мөрөнд */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Хичээл */}
        <div className="flex-1">
          <label className="block mb-1 font-medium">Хичээл</label>
          <Select onValueChange={setSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Хичээл сонгох" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.slug} value={s.slug}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Он */}
        <div className="flex-1">
          <label className="block mb-1 font-medium">Он</label>
          <Select onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue placeholder="Он сонгох" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Хувилбар */}
        <div className="flex-1">
          <label className="block mb-1 font-medium">Хувилбар</label>
          <Select onValueChange={setVariant}>
            <SelectTrigger>
              <SelectValue placeholder="Хувилбар сонгох" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v} value={v}>
                  {v} хувилбар
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        disabled={!subject || !year || !variant}
        onClick={handleStart}
        className="w-full"
      >
        Шалгалт эхлэх
      </Button>
    </div>
  )
}
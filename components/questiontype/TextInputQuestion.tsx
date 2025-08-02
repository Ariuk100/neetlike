'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import LatexRenderer from '../LatexRenderer';
import Image from 'next/image';

interface TextInputQuestionProps {
  questionId: string;
  question: string;
  // Шинэчлэгдсэн: Аудио, видео, зургийн пропсууд нэмэгдсэн
  questionImage?: string;
  questionAudio?: string;
  questionVideo?: string;
  onAnswer: (answer: string) => void;
}

export default function TextInputQuestion({ 
  questionId, 
  question,
  questionImage, // Шинэ
  questionAudio, // Шинэ
  questionVideo, // Шинэ
  onAnswer 
}: TextInputQuestionProps) {
  const [answer, setAnswer] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnswer(e.target.value);
    onAnswer(e.target.value);
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-lg space-y-2">
        {/* Асуултын зураг */}
        {questionImage && (
          <div className="mb-4">
            <Image 
              src={questionImage} 
              alt="Question Image" 
              width={500} 
              height={300} 
              className="rounded-md"
            />
          </div>
        )}
        {/* Асуултын аудио */}
        {questionAudio && (
          <div className="mb-4">
            <audio controls src={questionAudio} className="w-full" />
          </div>
        )}
        {/* Асуултын видео */}
        {questionVideo && (
          <div className="mb-4">
            <video controls src={questionVideo} width="500" height="300" className="rounded-md" />
          </div>
        )}
        <LatexRenderer text={question} />
      </h3>
      <div>
        <Label htmlFor={questionId}>Таны хариулт:</Label>
        <Input 
          id={questionId}
          type="text"
          value={answer}
          onChange={handleInputChange}
          placeholder="Хариултаа энд бичнэ үү"
        />
      </div>
    </div>
  );
}
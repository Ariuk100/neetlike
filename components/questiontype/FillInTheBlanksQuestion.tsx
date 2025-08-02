'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import LatexRenderer from '../LatexRenderer';
import Image from 'next/image';

interface FillInTheBlanksQuestionProps {
  questionId: string;
  question: string;
  questionImage?: string;
  questionAudio?: string;
  questionVideo?: string;
  onAnswer: (answers: string[]) => void;
}

export default function FillInTheBlanksQuestion({ 
  question, 
  questionImage, 
  questionAudio, 
  questionVideo,
  onAnswer 
}: FillInTheBlanksQuestionProps) {
  const [answers, setAnswers] = useState<string[]>([]);
  
  // [BLANK] тэмдэглэгээг олж, хоосон зайн тоог тооцоолох
  const blankCount = question.split('[BLANK]').length - 1;
  
  // Хоосон зайн тоогоор answers array-ийг эхлүүлэх
  React.useEffect(() => {
    if (answers.length !== blankCount) {
      setAnswers(new Array(blankCount).fill(''));
    }
  }, [blankCount, answers.length]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  // Асуултын текстийг [BLANK] тэмдэглэгээгээр хуваах
  const questionParts = question.split('[BLANK]');

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
        
        {/* Асуултын текст */}
        <div className="flex flex-wrap items-center gap-2">
          {questionParts.map((part, index) => (
            <React.Fragment key={index}>
              <LatexRenderer text={part} />
              {index < questionParts.length - 1 && (
                <Input
                  type="text"
                  placeholder={`${index + 1}-р хоосон зай`}
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className="w-32 inline-block"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </h3>
    </div>
  );
}
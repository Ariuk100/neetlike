'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import LatexRenderer from '../LatexRenderer';
import Image from 'next/image';

interface QuestionOption {
  text: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface MultipleChoiceQuestionProps {
  questionId: string;
  question: string;
  questionImage?: string;
  questionAudio?: string;
  questionVideo?: string;
  options: QuestionOption[];
  onAnswer: (answer: string) => void;
}

export default function MultipleChoiceQuestion({ 
  questionId, 
  question, 
  questionImage, 
  questionAudio, 
  questionVideo,
  options, 
  onAnswer 
}: MultipleChoiceQuestionProps) {
  // Шинэчилсэн: selectedOptionIndex-ийг string-ээр хадгална.
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<string | undefined>();

  const handleValueChange = (value: string) => {
    // Сонгосон индексийг state-д хадгалах
    setSelectedOptionIndex(value);
    
    // Энэ index-ээр хариултын текстийг олж, onAnswer функц руу дамжуулах
    const selectedText = options[Number(value)].text ?? '';
    onAnswer(selectedText);
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
      <RadioGroup 
        name={questionId} 
        value={selectedOptionIndex} // Шинэчилсэн
        onValueChange={handleValueChange}
      >
        {options.map((option, index) => {
          const uniqueId = `${questionId}-option-${index}`;
          const isSelected = selectedOptionIndex === index.toString(); // Шинэчилсэн

          return (
            <Label
              key={index}
              htmlFor={uniqueId}
              className={`
                flex items-center space-x-2 p-4 border rounded-md
                ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}
                transition-colors duration-200 ease-in-out cursor-pointer
              `}
            >
              <RadioGroupItem value={index.toString()} id={uniqueId} />
              <div className="flex items-center space-x-2">
                {/* Хариултын зургийн хувилбар */}
                {option.image && (
                  <div className="flex-shrink-0">
                    <Image 
                      src={option.image} 
                      alt="Option Image" 
                      width={100} 
                      height={100} 
                      className="rounded-md"
                    />
                  </div>
                )}
                {/* Хариултын аудио хувилбар */}
                {option.audio && (
                  <div className="flex-shrink-0">
                    <audio controls src={option.audio} className="w-full" />
                  </div>
                )}
                {/* Хариултын видео хувилбар */}
                {option.video && (
                  <div className="flex-shrink-0">
                    <video controls src={option.video} width="100" height="100" className="rounded-md" />
                  </div>
                )}
                <LatexRenderer text={option.text} />
              </div>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
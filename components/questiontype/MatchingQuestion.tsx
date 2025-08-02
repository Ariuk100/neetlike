'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LatexRenderer from '../LatexRenderer';
import Image from 'next/image';

// Ижилсүүлэх элементийн өгөгдөл
interface MatchingItem {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

// Ижилсүүлэх асуултын пропс
interface MatchingQuestionProps {
  questionId: string;
  question: string;
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
  onAnswer: (answers: Record<string, string>) => void;
}

// Элементийг харуулах туслах компонент
function ItemRenderer({ item }: { item: MatchingItem }) {
  const hasContent = item.image || item.audio || item.video || item.text;

  if (!hasContent) {
    return <span className="text-muted-foreground">Хоосон</span>;
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      {item.image && (
        <Image src={item.image} alt={item.text || 'Зураг'} width={50} height={50} className="rounded object-cover" />
      )}
      {item.audio && (
        <audio controls src={item.audio} className="w-full" />
      )}
      {item.video && (
        <video controls src={item.video} width={100} height={75} className="rounded" />
      )}
      {item.text && <LatexRenderer text={item.text} />}
    </div>
  );
}

export default function MatchingQuestion({ 
  question, 
  leftItems, 
  rightItems, 
  onAnswer 
}: MatchingQuestionProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerChange = (leftItemId: string, rightItemId: string) => {
    const newAnswers = { ...answers, [leftItemId]: rightItemId };
    setAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-lg"><LatexRenderer text={question} /></h3>
      <div className="grid grid-cols-2 gap-4">
        {leftItems.map((leftItem) => (
          <div key={leftItem.id} className="flex items-center space-x-4">
            <div className="w-1/2 flex justify-end">
              <ItemRenderer item={leftItem} />
            </div>
            <Select onValueChange={(value) => handleAnswerChange(leftItem.id, value)} value={answers[leftItem.id] || ''}>
              <SelectTrigger className="w-1/2">
                <SelectValue placeholder="Сонгох" />
              </SelectTrigger>
              <SelectContent>
                {rightItems.map((rightItem) => (
                  <SelectItem key={rightItem.id} value={rightItem.id}>
                    <ItemRenderer item={rightItem} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
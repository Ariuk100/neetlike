'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LatexRenderer from '@/components/LatexRenderer';

interface FillInTheBlankViewProps {
  question: {
    id: string;
    questionText: string;
    questionMediaUrl: string | null;
    questionNumber: number;
  };
  onAnswerSubmit: (questionId: string, answer: string[]) => void;
  isSubmitting: boolean;
}

export const FillInTheBlankView: React.FC<FillInTheBlankViewProps> = ({ question, onAnswerSubmit, isSubmitting }) => {
  const [userAnswers, setUserAnswers] = useState<string[]>([]);

  // Асуултын текст дэх хоосон зайны тоог тооцоолно
  const blankCount = useMemo(() => {
    const matches = question.questionText.match(/___/g);
    return matches ? matches.length : 0;
  }, [question.questionText]);

  // Хариултын төлөвийг хоосон зайны тоогоор үүсгэнэ
  useMemo(() => {
    setUserAnswers(new Array(blankCount).fill(''));
  }, [blankCount]);

  const handleSubmit = () => {
    if (userAnswers.some(answer => !answer.trim())) {
      toast.error('Бүх хоосон зайг нөхнө үү.');
      return;
    }
    onAnswerSubmit(question.id, userAnswers);
    setUserAnswers(new Array(blankCount).fill(''));
  };

  const handleAnswerChange = (index: number, value: string) => {
    setUserAnswers(prevAnswers => {
      const newAnswers = [...prevAnswers];
      newAnswers[index] = value;
      return newAnswers;
    });
  };

  const renderQuestionTextWithInput = (text: string) => {
    const parts = text.split('___');
    return (
      <div className="flex flex-wrap items-center gap-1">
        {parts.map((part, index) => (
          <span key={index} className="flex items-center">
            <LatexRenderer text={part} />
            {index < parts.length - 1 && (
              <Input
                type="text"
                className="inline-block w-40 mx-2"
                value={userAnswers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                disabled={isSubmitting}
              />
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader><CardTitle>Асуулт №{question.questionNumber}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {renderQuestionTextWithInput(question.questionText)}
        
        {question.questionMediaUrl && (
          <div className="mt-2">
            {question.questionMediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) && (
              <img src={question.questionMediaUrl} alt="Асуултын зураг" className="max-h-40 object-contain rounded-md" />
            )}
            {question.questionMediaUrl.match(/\.(mp3|wav)$/i) && (
              <audio controls src={question.questionMediaUrl} className="w-full" />
            )}
            {question.questionMediaUrl.match(/\.(mp4|webm)$/i) && (
              <video controls src={question.questionMediaUrl} className="w-full" />
            )}
          </div>
        )}
        
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Илгээж байна...' : 'Хариулт илгээх'}
        </Button>
      </CardContent>
    </Card>
  );
};
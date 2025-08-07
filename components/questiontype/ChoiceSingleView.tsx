'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LatexRenderer from '@/components/LatexRenderer'; // LatexRenderer-ийг импорт хийсэн

// Пропсын төрлийг тодорхойлно
interface ChoiceSingleViewProps {
  question: {
    id: string;
    questionText: string;
    questionMediaUrl: string | null;
    options: {
      text: string;
      mediaUrl: string | null;
    }[];
    questionNumber: number;
  };
  onAnswerSubmit: (questionId: string, answer: string) => void;
  isSubmitting: boolean;
}

/**
 * Нэг сонголттой асуултыг хэрэглэгчдэд харуулах компонент.
 * Хариултыг сонгож, илгээх үйлдэл хийнэ.
 */
export const ChoiceSingleView: React.FC<ChoiceSingleViewProps> = ({ question, onAnswerSubmit, isSubmitting }) => {
  // Хэрэглэгчийн сонгосон хариултыг хадгалах төлөв
  const [selectedAnswer, setSelectedAnswer] = useState('');

  /**
   * Хариултыг илгээх функц.
   * Хариулт сонгогдсон эсэхийг шалгана.
   */
  const handleSubmit = () => {
    if (!selectedAnswer) {
      toast.error('Хариултаа сонгоно уу.');
      return;
    }
    onAnswerSubmit(question.id, selectedAnswer);
    setSelectedAnswer(''); // Хариултыг илгээсний дараа цэвэрлэх
  };

  return (
    <Card>
      <CardHeader><CardTitle>Асуулт №{question.questionNumber}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Асуултын текстийг LatexRenderer ашиглан харуулна */}
        <LatexRenderer text={question.questionText} />
        
        {/* Асуултын медиа файл байвал харуулна */}
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
        
        {/* Сонголтуудыг RadioGroup ашиглан харуулна */}
        <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
          {question.options.map((opt, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            return (
              <div key={index} className="flex flex-col gap-2 p-2 border rounded-md">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={optionLetter} id={`option-${question.id}-${index}`} />
                  {/* Сонголтын текстийг LatexRenderer ашиглан харуулна */}
                  <Label htmlFor={`option-${question.id}-${index}`}>
                    {`${optionLetter}. `}
                    <LatexRenderer text={opt.text} />
                  </Label>
                </div>
                {/* Сонголтын медиа файл байвал харуулна */}
                {opt.mediaUrl && (
                  <div className="mt-2">
                    {opt.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) && (
                      <img src={opt.mediaUrl} alt={`Сонголт ${optionLetter}`} className="max-h-40 object-contain rounded-md" />
                    )}
                    {opt.mediaUrl.match(/\.(mp3|wav)$/i) && (
                      <audio controls src={opt.mediaUrl} className="w-full" />
                    )}
                    {opt.mediaUrl.match(/\.(mp4|webm)$/i) && (
                      <video controls src={opt.mediaUrl} className="w-full" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </RadioGroup>
        
        {/* Хариулт илгээх товч */}
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Илгээж байна...' : 'Хариулт илгээх'}
        </Button>
      </CardContent>
    </Card>
  );
};

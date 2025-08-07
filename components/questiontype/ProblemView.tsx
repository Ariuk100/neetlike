'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LatexRenderer from '@/components/LatexRenderer'; // LatexRenderer-ийг импорт хийсэн

// Пропсын төрлийг тодорхойлно
interface ProblemViewProps {
  question: {
    id: string;
    questionText: string;
    questionMediaUrl: string | null;
    questionNumber: number;
  };
  onAnswerSubmit: (questionId: string, answer: string) => void;
  isSubmitting: boolean;
}

/**
 * Бодлого хэлбэрийн асуултыг хэрэглэгчдэд харуулах компонент.
 * Хариултыг оруулах үйлдэл хийнэ.
 */
export const ProblemView: React.FC<ProblemViewProps> = ({ question, onAnswerSubmit, isSubmitting }) => {
  // Хэрэглэгчийн оруулсан хариултыг хадгалах төлөв
  const [userAnswer, setUserAnswer] = useState('');

  /**
   * Хариултыг илгээх функц.
   * Хариулт оруулсан эсэхийг шалгана.
   */
  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      toast.error('Хариултаа оруулна уу.');
      return;
    }
    onAnswerSubmit(question.id, userAnswer);
    setUserAnswer(''); // Хариултыг илгээсний дараа цэвэрлэх
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

        <div>
          <Label htmlFor="userAnswer">Таны хариулт</Label>
          <Input 
            id="userAnswer" 
            type="text" 
            value={userAnswer} 
            onChange={(e) => setUserAnswer(e.target.value)} 
            placeholder="Хариултаа оруулна уу"
          />
        </div>
        
        {/* Хариулт илгээх товч */}
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Илгээж байна...' : 'Хариулт илгээх'}
        </Button>
      </CardContent>
    </Card>
  );
};

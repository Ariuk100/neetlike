'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LatexRenderer from '@/components/LatexRenderer';

interface TrueOrFalseViewProps {
  question: {
    id: string;
    questionText: string;
    questionMediaUrl: string | null;
    questionNumber: number;
  };
  onAnswerSubmit: (questionId: string, answer: 'true' | 'false') => void;
  isSubmitting: boolean;
}

export const TrueOrFalseView: React.FC<TrueOrFalseViewProps> = ({ question, onAnswerSubmit, isSubmitting }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<'true' | 'false' | null>(null);

  const handleSubmit = () => {
    if (!selectedAnswer) {
      toast.error('Хариултаа сонгоно уу.');
      return;
    }
    onAnswerSubmit(question.id, selectedAnswer);
    setSelectedAnswer(null);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Асуулт №{question.questionNumber}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <LatexRenderer text={question.questionText} />
        
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
          <Label>Хариулт</Label>
          <RadioGroup value={selectedAnswer || ''} onValueChange={(v) => setSelectedAnswer(v as 'true' | 'false')} className="flex gap-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true-answer" />
              <Label htmlFor="true-answer">Үнэн</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false-answer" />
              <Label htmlFor="false-answer">Худaл</Label>
            </div>
          </RadioGroup>
        </div>
        
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Илгээж байна...' : 'Хариулт илгээх'}
        </Button>
      </CardContent>
    </Card>
  );
};
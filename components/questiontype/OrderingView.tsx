'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown } from 'lucide-react';
import LatexRenderer from '@/components/LatexRenderer';

interface OrderingItem {
  id: string;
  text: string;
  mediaUrl: string | null;
}

interface OrderingViewProps {
  question: {
    id: string;
    questionText: string;
    questionMediaUrl: string | null;
    items: OrderingItem[];
    questionNumber: number;
  };
  onAnswerSubmit: (questionId: string, answer: string) => void;
  isSubmitting: boolean;
}

// Функц: Массивыг санамсаргүйгээр хутгах
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shuffleArray = <T extends any[]>(array: T): T => {
  const newArray = [...array] as T;
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const OrderingView: React.FC<OrderingViewProps> = ({ question, onAnswerSubmit, isSubmitting }) => {
  const [currentOrder, setCurrentOrder] = useState<OrderingItem[]>([]);

  // Асуултын зүйлсийг санамсаргүй байдлаар хутгаж эхний төлөвт оруулна.
  useEffect(() => {
    setCurrentOrder(shuffleArray(question.items));
  }, [question.items]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      return newOrder;
    });
  }, []);

  const handleSubmit = () => {
    if (currentOrder.length === 0) {
      toast.error('Дарааллуулах зүйлс байхгүй байна.');
      return;
    }
    const answer = currentOrder.map(item => item.id).join(',');
    onAnswerSubmit(question.id, answer);
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

        <div className="space-y-2">
          <Label>Зүйлсийг зөв дарааллаар байрлуулна уу:</Label>
          {currentOrder.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="font-bold w-6 text-center">{index + 1}.</span>
              <div className="flex-1 flex flex-col">
                <LatexRenderer text={item.text} />
                {item.mediaUrl && (
                  <div className="mt-1">
                    {item.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) && (
                      <img src={item.mediaUrl} alt={`Зүйл ${index + 1}`} className="max-h-20 object-contain rounded-md" />
                    )}
                    {item.mediaUrl.match(/\.(mp3|wav)$/i) && (
                      <audio controls src={item.mediaUrl} className="w-full" />
                    )}
                    {item.mediaUrl.match(/\.(mp4|webm)$/i) && (
                      <video controls src={item.mediaUrl} className="w-full" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, index - 1)}
                  disabled={index === 0 || isSubmitting}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, index + 1)}
                  disabled={index === currentOrder.length - 1 || isSubmitting}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Илгээж байна...' : 'Хариулт илгээх'}
        </Button>
      </CardContent>
    </Card>
  );
};
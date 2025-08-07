'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import LatexRenderer from '@/components/LatexRenderer'; // LatexRenderer-ийг импорт хийсэн

interface MatchingItem {
  id: string;
  text: string;
  mediaUrl: string | null;
}

interface MatchingViewProps {
  question: {
    id: string;
    questionText: string;
    questionMediaUrl: string | null;
    leftItems: MatchingItem[];
    rightItems: MatchingItem[]; // This array will be shuffled for the user
    questionNumber: number;
  };
  onAnswerSubmit: (questionId: string, answer: { [leftId: string]: string }) => void;
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

export const MatchingView: React.FC<MatchingViewProps> = ({ question, onAnswerSubmit, isSubmitting }) => {
  const [shuffledRightItems, setShuffledRightItems] = useState<MatchingItem[]>([]);
  const [selectedLeftItem, setSelectedLeftItem] = useState<string | null>(null);
  const [userMatches, setUserMatches] = useState<{ [leftId: string]: string }>({}); // { leftId: rightId }

  useEffect(() => {
    // Баруун талын зүйлсийг санамсаргүйгээр хутгана
    setShuffledRightItems(shuffleArray(question.rightItems));
    setUserMatches({}); // Шинэ асуулт ирэхэд хариултыг цэвэрлэнэ
    setSelectedLeftItem(null); // Сонголтыг цэвэрлэнэ
  }, [question]);

  const handleLeftItemClick = useCallback((itemId: string) => {
    // Зүүн талын зүйл дээр дарахад сонгоно
    setSelectedLeftItem(itemId);
  }, []);

  const handleRightItemClick = useCallback((rightItemId: string) => {
    if (selectedLeftItem) {
      // Зүүн талын зүйл сонгогдсон бол баруун талын зүйлтэй тааруулна
      setUserMatches(prevMatches => {
        const newMatches = { ...prevMatches };
        // Хэрэв өмнө нь энэ баруун талын зүйл өөр зүүн талын зүйлтэй тааруулагдсан бол устгана
        const existingLeftItem = Object.keys(newMatches).find(key => newMatches[key] === rightItemId);
        if (existingLeftItem) {
          delete newMatches[existingLeftItem];
        }
        // Шинээр тааруулна
        newMatches[selectedLeftItem] = rightItemId;
        return newMatches;
      });
      setSelectedLeftItem(null); // Тааруулсны дараа сонголтыг цэвэрлэнэ
    } else {
      toast.error('Эхлээд зүүн талын зүйлээ сонгоно уу.');
    }
  }, [selectedLeftItem]);

  const handleSubmit = () => {
    // Бүх зүүн талын зүйлс тааруулагдсан эсэхийг шалгана
    if (Object.keys(userMatches).length !== question.leftItems.length) {
      toast.error('Бүх зүйлсийг тааруулна уу.');
      return;
    }
    onAnswerSubmit(question.id, userMatches);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Асуулт №{question.questionNumber}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Асуултын текстийг LatexRenderer ашиглан харуулна */}
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

        <div className="grid grid-cols-2 gap-4">
          {/* Зүүн талын зүйлс */}
          <div className="space-y-2">
            <Label>Зүүн тал:</Label>
            {question.leftItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors
                            ${selectedLeftItem === item.id ? 'bg-blue-200 dark:bg-blue-700' : 'bg-gray-100 dark:bg-gray-700'}
                            ${userMatches[item.id] ? 'border-green-500' : 'border-gray-200 dark:border-gray-600'}`}
                onClick={() => handleLeftItemClick(item.id)}
              >
                <LatexRenderer text={item.text} />
                {item.mediaUrl && (
                  <div className="mt-1">
                    {item.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) && (
                      <img src={item.mediaUrl} alt={item.text} className="max-h-16 object-contain rounded-md" />
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
            ))}
          </div>

          {/* Баруун талын зүйлс (хутгасан) */}
          <div className="space-y-2">
            <Label>Баруун тал:</Label>
            {shuffledRightItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors
                            ${Object.values(userMatches).includes(item.id) ? 'bg-green-200 dark:bg-green-700' : 'bg-gray-100 dark:bg-gray-700'}
                            ${Object.values(userMatches).includes(item.id) ? 'border-green-500' : 'border-gray-200 dark:border-gray-600'}`}
                onClick={() => handleRightItemClick(item.id)}
              >
                <LatexRenderer text={item.text} />
                {item.mediaUrl && (
                  <div className="mt-1">
                    {item.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) && (
                      <img src={item.mediaUrl} alt={item.text} className="max-h-16 object-contain rounded-md" />
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
            ))}
          </div>
        </div>
        
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Илгээж байна...' : 'Хариулт илгээх'}
        </Button>
      </CardContent>
    </Card>
  );
};

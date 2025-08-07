'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FileUploader from '../FileUploader';

interface FillInTheBlankFormProps {
  onSave: (data: {
    questionText: string;
    questionMediaUrl: string | null;
    questionFile: File | null;
    correctAnswer: string[]; // Шинээр массив болгосон
    explanationText: string;
    explanationMediaUrl: string | null;
    explanationFile: File | null;
  }) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
}

export const FillInTheBlankForm: React.FC<FillInTheBlankFormProps> = ({ onSave, isSaving, onCancel }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(['']);
  const [explanationText, setExplanationText] = useState('');
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationMediaUrl, setExplanationMediaUrl] = useState<string | null>(null);
  const [mediaType] = useState('image/*');

  // Асуултын текст дэх хоосон зайны тоог тооцоолно
  const blankCount = useMemo(() => {
    const matches = questionText.match(/___/g);
    return matches ? matches.length : 0;
  }, [questionText]);

  // Хоосон зайны тоо өөрчлөгдөхөд хариултын талбарын тоог шинэчилнэ
  useMemo(() => {
    setCorrectAnswers(prevAnswers => {
      const newAnswers = new Array(blankCount).fill('');
      return newAnswers.map((_, index) => prevAnswers[index] || '');
    });
  }, [blankCount]);

  const handleSave = async () => {
    if (!questionText) {
      toast.error('Асуултын текстийг оруулна уу.');
      return;
    }
    if (blankCount === 0) {
      toast.error('Асуултын текстэнд хоосон зайг заахын тулд "___" (гурван доогуур зураас) тэмдгийг ашиглана уу.');
      return;
    }
    if (correctAnswers.some(ans => !ans.trim())) {
      toast.error('Бүх хоосон зайнд зөв хариулт оруулна уу.');
      return;
    }
    
    await onSave({
      questionText,
      questionMediaUrl,
      questionFile,
      correctAnswer: correctAnswers, // Массиваар дамжуулна
      explanationText,
      explanationMediaUrl,
      explanationFile,
    });
    
    setQuestionText('');
    setQuestionFile(null);
    setQuestionMediaUrl(null);
    setCorrectAnswers(['']);
    setExplanationText('');
    setExplanationFile(null);
    setExplanationMediaUrl(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="questionText">Асуултын текст (&quot;___&quot; ашиглан хоосон зайг тэмдэглэнэ үү)</Label>
        <Textarea id="questionText" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
      </div>

      <FileUploader
        label="Асуултын медиа файл"
        fileUrl={questionMediaUrl || undefined}
        onUploadSuccess={(url, file) => {
          setQuestionMediaUrl(url);
          setQuestionFile(file);
        }}
        onClear={() => {
          setQuestionMediaUrl(null);
          setQuestionFile(null);
        }}
        accept={mediaType}
      />
      
      <div>
        <Label>Зөв хариултууд</Label>
        <div className="space-y-2">
          {correctAnswers.map((answer, index) => (
            <Input 
              key={index} 
              placeholder={`Хариулт ${index + 1}`}
              value={answer} 
              onChange={(e) => {
                const newAnswers = [...correctAnswers];
                newAnswers[index] = e.target.value;
                setCorrectAnswers(newAnswers);
              }} 
            />
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="explanationText">Бодолт / Тайблар</Label>
        <Textarea id="explanationText" value={explanationText} onChange={(e) => setExplanationText(e.target.value)} />
      </div>

      <FileUploader
        label="Бодолтын медиа файл"
        fileUrl={explanationMediaUrl || undefined}
        onUploadSuccess={(url, file) => {
          setExplanationMediaUrl(url);
          setExplanationFile(file);
        }}
        onClear={() => {
          setExplanationMediaUrl(null);
          setExplanationFile(null);
        }}
        accept={mediaType}
      />

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
        </Button>
        {onCancel && <Button variant="outline" onClick={onCancel}>Цуцлах</Button>}
      </div>
    </div>
  );
};
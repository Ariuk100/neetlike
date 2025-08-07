'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import FileUploader from '../FileUploader';

interface TrueOrFalseFormProps {
  onSave: (data: {
    questionText: string;
    questionMediaUrl: string | null;
    questionFile: File | null;
    correctAnswer: 'true' | 'false';
    explanationText: string;
    explanationMediaUrl: string | null;
    explanationFile: File | null;
  }) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
}

export const TrueOrFalseForm: React.FC<TrueOrFalseFormProps> = ({ onSave, isSaving, onCancel }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<'true' | 'false'>('true');
  const [explanationText, setExplanationText] = useState('');
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationMediaUrl, setExplanationMediaUrl] = useState<string | null>(null);
  const [mediaType] = useState('image/*');

  const handleSave = async () => {
    if (!questionText) {
      toast.error('Асуултын текстийг оруулна уу.');
      return;
    }

    await onSave({
      questionText,
      questionMediaUrl,
      questionFile,
      correctAnswer,
      explanationText,
      explanationMediaUrl,
      explanationFile,
    });

    setQuestionText('');
    setQuestionFile(null);
    setQuestionMediaUrl(null);
    setCorrectAnswer('true');
    setExplanationText('');
    setExplanationFile(null);
    setExplanationMediaUrl(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="questionText">Асуултын текст</Label>
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
        <Label>Зөв хариулт</Label>
        <RadioGroup value={correctAnswer} onValueChange={(v: 'true' | 'false') => setCorrectAnswer(v)} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="true" id="true-option" />
            <Label htmlFor="true-option">Үнэн</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="false" id="false-option" />
            <Label htmlFor="false-option">Худaл</Label>
          </div>
        </RadioGroup>
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
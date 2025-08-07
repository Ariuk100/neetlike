'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FileUploader from '../FileUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Компонентийн пропсуудын төрлийг тодорхойлно
interface ProblemFormProps {
  onSave: (data: {
    questionText: string;
    questionMediaUrl: string | null;
    questionFile: File | null;
    options?: never; // Бодлогод options байхгүйг илэрхийлсэн
    correctAnswer: string;
    explanationText: string;
    explanationMediaUrl: string | null;
    explanationFile: File | null;
  }) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
}

/**
 * Бодлого хэлбэрийн асуулт үүсгэх маягт (модераторт зориулагдсан).
 * Асуултын текст болон зөв хариултыг оруулна.
 */
export const ProblemForm: React.FC<ProblemFormProps> = ({ onSave, isSaving, onCancel }) => {
  // Асуултын текст хадгалах төлөв
  const [questionText, setQuestionText] = useState('');
  
  // Асуултын медиа файлыг хадгалах төлөв
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);

  // Зөв хариултыг хадгалах төлөв
  const [correctAnswer, setCorrectAnswer] = useState('');

  // Бодолтын текст хадгалах төлөв
  const [explanationText, setExplanationText] = useState('');

  // Бодолтын медиа файлыг хадгалах төлөв
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationMediaUrl, setExplanationMediaUrl] = useState<string | null>(null);
  
  // Медиа файлын төрлийг хадгалах төлөв
  const [mediaType, setMediaType] = useState('image/*');

  /**
   * Маягтын мэдээллийг хадгалах функц.
   * Утга хоосон байгаа эсэхийг шалгаад, onSave пропсыг дуудна.
   */
  const handleSave = async () => {
    // Асуултын текст болон зөв хариултыг шалгана.
    if (!questionText || !correctAnswer) {
      toast.error('Асуулт болон зөв хариултыг оруулна уу.');
      return;
    }
    
    // Эцэг компонент руу өгөгдлийг дамжуулна
    await onSave({
      questionText,
      questionMediaUrl,
      questionFile,
      correctAnswer,
      explanationText,
      explanationMediaUrl,
      explanationFile,
    });
    
    // Маягтын төлөвийг анхны утгад нь оруулж цэвэрлэнэ
    setQuestionText('');
    setQuestionFile(null);
    setQuestionMediaUrl(null);
    setCorrectAnswer('');
    setExplanationText('');
    setExplanationFile(null);
    setExplanationMediaUrl(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="questionText">Бодлогын текст</Label>
        <Textarea id="questionText" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
      </div>

      {/* Асуултад медиа файл нэмэх хэсэг */}
      <FileUploader
        label="Бодлогын медиа файл"
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
        <Label>Бодлогын медиа төрөл</Label>
        <Select value={mediaType} onValueChange={setMediaType}>
          <SelectTrigger>
            <SelectValue placeholder="Төрөл сонгоно уу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image/*">Зураг</SelectItem>
            <SelectItem value="audio/*">Дуу</SelectItem>
            <SelectItem value="video/*">Бичлэг</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="correctAnswer">Зөв хариулт</Label>
        <Input id="correctAnswer" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
      </div>

      {/* Бодолт нэмэх хэсэг */}
      <div>
        <Label htmlFor="explanationText">Бодолт / Тайблар</Label>
        <Textarea id="explanationText" value={explanationText} onChange={(e) => setExplanationText(e.target.value)} />
      </div>

      {/* Бодолтод медиа файл нэмэх хэсэг */}
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

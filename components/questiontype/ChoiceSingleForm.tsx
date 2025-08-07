'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FileUploader from '../FileUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Сонголтын өгөгдлийн төрлийг тодорхойлно
interface Option {
  text: string;
  mediaUrl: string | null;
  mediaFile: File | null;
}

// Компонентийн пропсуудын төрлийг тодорхойлно
interface ChoiceSingleFormProps {
  onSave: (data: {
    questionText: string;
    questionMediaUrl: string | null;
    questionFile: File | null;
    options: Option[];
    correctAnswer: string;
    explanationText: string;
    explanationMediaUrl: string | null;
    explanationFile: File | null;
  }) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
}

/**
 * Нэг сонголттой асуулт үүсгэх маягт.
 * Асуулт, сонголтын текст болон медиа (зураг, дуу, видео) файл нэмэх боломжтой.
 */
export const ChoiceSingleForm: React.FC<ChoiceSingleFormProps> = ({ onSave, isSaving, onCancel }) => {
  // Асуултын текст хадгалах төлөв
  const [questionText, setQuestionText] = useState('');
  
  // Асуултын медиа файлыг хадгалах төлөв
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);

  // Сонголтуудыг хадгалах төлөв
  const [options, setOptions] = useState<Option[]>([
    { text: '', mediaUrl: null, mediaFile: null },
    { text: '', mediaUrl: null, mediaFile: null },
    { text: '', mediaUrl: null, mediaFile: null },
    { text: '', mediaUrl: null, mediaFile: null },
    { text: '', mediaUrl: null, mediaFile: null },
  ]);
  
  // Зөв хариултыг хадгалах төлөв
  const [correctAnswer, setCorrectAnswer] = useState('A');

  // Бодолтын текст хадгалах төлөв
  const [explanationText, setExplanationText] = useState('');

  // Бодолтын медиа файлыг хадгалах төлөв
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationMediaUrl, setExplanationMediaUrl] = useState<string | null>(null);
  
  // Сонголтонд байршуулах медиа файлын төрлийг хадгалах төлөв
  const [mediaType, setMediaType] = useState('image/*');

  /**
   * Сонголтын текстийг шинэчлэх функц.
   * @param index Сонголтын индекс (0-ээс эхэлнэ).
   * @param value Шинэ текст.
   */
  const handleOptionTextChange = useCallback((index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  }, [options]);

  /**
   * Сонголтын медиа файлыг шинэчлэх функц.
   * @param index Сонголтын индекс (0-ээс эхэлнэ).
   * @param file Шинэ файлын объект.
   * @param url Шинэ файлын түр зуурын URL.
   */
  const handleOptionMediaChange = useCallback((index: number, file: File, url: string) => {
    const newOptions = [...options];
    newOptions[index].mediaFile = file;
    newOptions[index].mediaUrl = url;
    setOptions(newOptions);
  }, [options]);

  /**
   * Сонголтын медиа файлыг устгах функц.
   * @param index Сонголтын индекс (0-ээс эхэлнэ).
   */
  const handleClearMedia = useCallback((index: number) => {
    const newOptions = [...options];
    newOptions[index].mediaFile = null;
    newOptions[index].mediaUrl = null;
    setOptions(newOptions);
  }, [options]);

  /**
   * Маягтын мэдээллийг хадгалах функц.
   * Утга хоосон байгаа эсэхийг шалгаад, onSave пропсыг дуудна.
   */
  const handleSave = async () => {
    // Асуултын текст болон зөв хариултыг шалгана.
    if (!questionText || !correctAnswer) {
      toast.error('Асуулт болон зөв хариултыг сонгоно уу.');
      return;
    }
    
    // Доод тал нь нэг сонголт текст эсвэл медиа файлтай байх ёстойг шалгана.
    const hasValidOption = options.some(opt => opt.text || opt.mediaFile);
    if (!hasValidOption) {
      toast.error('Доод тал нь нэг сонголтыг оруулна уу.');
      return;
    }

    // Эцэг компонент руу өгөгдлийг дамжуулна
    await onSave({
      questionText,
      questionMediaUrl,
      questionFile,
      options,
      correctAnswer,
      explanationText,
      explanationMediaUrl,
      explanationFile,
    });
    
    // Маягтын төлөвийг анхны утгад нь оруулж цэвэрлэнэ
    setQuestionText('');
    setQuestionFile(null);
    setQuestionMediaUrl(null);
    setOptions([
      { text: '', mediaUrl: null, mediaFile: null },
      { text: '', mediaUrl: null, mediaFile: null },
      { text: '', mediaUrl: null, mediaFile: null },
      { text: '', mediaUrl: null, mediaFile: null },
      { text: '', mediaUrl: null, mediaFile: null },
    ]);
    setCorrectAnswer('A');
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

      {/* Асуултад медиа файл нэмэх хэсэг */}
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
        <Label>Сонголтын медиа төрөл</Label>
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
        <Label>Сонголтууд</Label>
        {options.map((opt, index) => (
          <div key={index} className="flex flex-col gap-2 mb-4 p-2 border rounded-md">
            <div className="flex gap-2 items-center">
              <span className="font-bold">{String.fromCharCode(65 + index)}.</span>
              <Input
                placeholder="Сонголтын текст"
                value={opt.text}
                onChange={(e) => handleOptionTextChange(index, e.target.value)}
              />
            </div>
            <FileUploader
              label={`Медиа файл (${String.fromCharCode(65 + index)})`}
              fileUrl={opt.mediaUrl || undefined}
              onUploadSuccess={(url, file) => {
                handleOptionMediaChange(index, file, url);
              }}
              onClear={() => handleClearMedia(index)}
              accept={mediaType}
            />
          </div>
        ))}
      </div>

      <div>
        <Label>Зөв хариулт</Label>
        <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer} className="grid grid-cols-5 gap-2">
          {['A', 'B', 'C', 'D', 'E'].map(opt => (
            <div key={opt} className="flex items-center justify-center border rounded-md p-2 cursor-pointer
                                     hover:bg-primary/10 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
                                     aria-checked:bg-primary aria-checked:text-primary-foreground transition-colors"
                 data-state={correctAnswer === opt ? 'checked' : 'unchecked'}
                 onClick={() => setCorrectAnswer(opt)}>
              <RadioGroupItem value={opt} id={`correct-answer-${opt}`} className="sr-only" />
              <Label htmlFor={`correct-answer-${opt}`} className="cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
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

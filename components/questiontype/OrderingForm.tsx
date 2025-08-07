'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FileUploader from '../FileUploader';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderingItem {
  id: string;
  text: string;
  mediaUrl: string | null;
  mediaFile: File | null;
}

interface OrderingFormProps {
  onSave: (data: {
    questionText: string;
    questionMediaUrl: string | null;
    questionFile: File | null;
    orderedItems: OrderingItem[];
    correctAnswer: string;
    explanationText: string;
    explanationMediaUrl: string | null;
    explanationFile: File | null;
  }) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
}

// Уникал ID үүсгэх функц
const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const OrderingForm: React.FC<OrderingFormProps> = ({ onSave, isSaving, onCancel }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);

  const [items, setItems] = useState<OrderingItem[]>([
    { id: generateUniqueId(), text: '', mediaUrl: null, mediaFile: null },
    { id: generateUniqueId(), text: '', mediaUrl: null, mediaFile: null },
  ]);

  const [explanationText, setExplanationText] = useState('');
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationMediaUrl, setExplanationMediaUrl] = useState<string | null>(null);

  const [mediaType, setMediaType] = useState('image/*');

  const handleItemTextChange = useCallback((index: number, value: string) => {
    const newItems = [...items];
    newItems[index].text = value;
    setItems(newItems);
  }, [items]);

  const handleItemMediaChange = useCallback((index: number, file: File, url: string) => {
    const newItems = [...items];
    newItems[index].mediaFile = file;
    newItems[index].mediaUrl = url;
    setItems(newItems);
  }, [items]);

  const handleClearItemMedia = useCallback((index: number) => {
    const newItems = [...items];
    newItems[index].mediaFile = null;
    newItems[index].mediaUrl = null;
    setItems(newItems);
  }, [items]);

  const handleAddItem = useCallback(() => {
    setItems(prevItems => [
      ...prevItems,
      { id: generateUniqueId(), text: '', mediaUrl: null, mediaFile: null }
    ]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    if (!questionText) {
      toast.error('Асуултын текстийг оруулна уу.');
      return;
    }
    const hasValidItem = items.some(item => item.text || item.mediaFile);
    if (!hasValidItem) {
      toast.error('Доод тал нь нэг дарааллуулах зүйл оруулна уу.');
      return;
    }

    const correctAnswer = items.map(item => item.id).join(',');

    await onSave({
      questionText,
      questionMediaUrl,
      questionFile,
      orderedItems: items,
      correctAnswer,
      explanationText,
      explanationMediaUrl,
      explanationFile,
    });

    setQuestionText('');
    setQuestionFile(null);
    setQuestionMediaUrl(null);
    setItems([
      { id: generateUniqueId(), text: '', mediaUrl: null, mediaFile: null },
      { id: generateUniqueId(), text: '', mediaUrl: null, mediaFile: null },
    ]);
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
        <Label>Зүйлсийн медиа төрөл</Label>
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
        <Label>Дарааллуулах зүйлс (Зөв дарааллаар оруулна уу)</Label>
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-2 mb-4 p-2 border rounded-md">
            <div className="flex gap-2 items-center">
              <span className="font-bold">{index + 1}.</span>
              <Input
                placeholder="Зүйлийн текст"
                value={item.text}
                onChange={(e) => handleItemTextChange(index, e.target.value)}
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={items.length <= 2}>
                <MinusCircle className="h-5 w-5 text-red-500" />
              </Button>
            </div>
            <FileUploader
              label={`Медиа файл (${index + 1})`}
              fileUrl={item.mediaUrl || undefined}
              onUploadSuccess={(url, file) => {
                handleItemMediaChange(index, file, url);
              }}
              onClear={() => handleClearItemMedia(index)}
              accept={mediaType}
            />
          </div>
        ))}
        <Button variant="outline" onClick={handleAddItem} className="mt-2">
          <PlusCircle className="h-4 w-4 mr-2" /> Зүйл нэмэх
        </Button>
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
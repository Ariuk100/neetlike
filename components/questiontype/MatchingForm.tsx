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

interface MatchingPair {
  leftId: string;
  leftText: string;
  leftMediaFile: File | null;
  leftMediaUrl: string | null;
  rightId: string;
  rightText: string;
  rightMediaFile: File | null;
  rightMediaUrl: string | null;
}

interface MatchingFormProps {
  onSave: (data: {
    questionText: string;
    questionMediaUrl: string | null;
    questionFile: File | null;
    matchingPairs: MatchingPair[];
    correctAnswer: { [key: string]: string }; // Correct answer is an object of pairings
    explanationText: string;
    explanationMediaUrl: string | null;
    explanationFile: File | null;
  }) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
}

export const MatchingForm: React.FC<MatchingFormProps> = ({ onSave, isSaving, onCancel }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);

  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([
    { leftId: 'left-1', leftText: '', leftMediaFile: null, leftMediaUrl: null, rightId: 'right-1', rightText: '', rightMediaFile: null, rightMediaUrl: null },
    { leftId: 'left-2', leftText: '', leftMediaFile: null, leftMediaUrl: null, rightId: 'right-2', rightText: '', rightMediaFile: null, rightMediaUrl: null },
  ]);

  const [explanationText, setExplanationText] = useState('');
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationMediaUrl, setExplanationMediaUrl] = useState<string | null>(null);

  const [mediaType, setMediaType] = useState('image/*');

  const handleLeftTextChange = useCallback((index: number, value: string) => {
    const newPairs = [...matchingPairs];
    newPairs[index].leftText = value;
    setMatchingPairs(newPairs);
  }, [matchingPairs]);

  const handleLeftMediaChange = useCallback((index: number, file: File, url: string) => {
    const newPairs = [...matchingPairs];
    newPairs[index].leftMediaFile = file;
    newPairs[index].leftMediaUrl = url;
    setMatchingPairs(newPairs);
  }, [matchingPairs]);

  const handleClearLeftMedia = useCallback((index: number) => {
    const newPairs = [...matchingPairs];
    newPairs[index].leftMediaFile = null;
    newPairs[index].leftMediaUrl = null;
    setMatchingPairs(newPairs);
  }, [matchingPairs]);

  const handleRightTextChange = useCallback((index: number, value: string) => {
    const newPairs = [...matchingPairs];
    newPairs[index].rightText = value;
    setMatchingPairs(newPairs);
  }, [matchingPairs]);

  const handleRightMediaChange = useCallback((index: number, file: File, url: string) => {
    const newPairs = [...matchingPairs];
    newPairs[index].rightMediaFile = file;
    newPairs[index].rightMediaUrl = url;
    setMatchingPairs(newPairs);
  }, [matchingPairs]);

  const handleClearRightMedia = useCallback((index: number) => {
    const newPairs = [...matchingPairs];
    newPairs[index].rightMediaFile = null;
    newPairs[index].rightMediaUrl = null;
    setMatchingPairs(newPairs);
  }, [matchingPairs]);

  const handleAddPair = useCallback(() => {
    setMatchingPairs(prevPairs => {
      const newIndex = prevPairs.length + 1;
      return [
        ...prevPairs,
        {
          leftId: `left-${newIndex}`,
          leftText: '',
          leftMediaFile: null,
          leftMediaUrl: null,
          rightId: `right-${newIndex}`,
          rightText: '',
          rightMediaFile: null,
          rightMediaUrl: null,
        },
      ];
    });
  }, []);

  const handleRemovePair = useCallback((index: number) => {
    setMatchingPairs(prevPairs => prevPairs.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    if (!questionText) {
      toast.error('Асуултын текстийг оруулна уу.');
      return;
    }
    const hasValidPair = matchingPairs.some(
      (pair) => pair.leftText || pair.leftMediaFile || pair.rightText || pair.rightMediaFile
    );
    if (!hasValidPair) {
      toast.error('Доод тал нь нэг тааруулах хос оруулна уу.');
      return;
    }

    const correctAnswer: { [key: string]: string } = {};
    matchingPairs.forEach(pair => {
      correctAnswer[pair.leftId] = pair.rightId;
    });

    await onSave({
      questionText,
      questionMediaUrl,
      questionFile,
      matchingPairs,
      correctAnswer,
      explanationText,
      explanationMediaUrl,
      explanationFile,
    });

    // Reset form
    setQuestionText('');
    setQuestionFile(null);
    setQuestionMediaUrl(null);
    setMatchingPairs([
      { leftId: 'left-1', leftText: '', leftMediaFile: null, leftMediaUrl: null, rightId: 'right-1', rightText: '', rightMediaFile: null, rightMediaUrl: null },
      { leftId: 'left-2', leftText: '', leftMediaFile: null, leftMediaUrl: null, rightId: 'right-2', rightText: '', rightMediaFile: null, rightMediaUrl: null },
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
        <Label>Тааруулах зүйлсийн медиа төрөл</Label>
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
        <Label>Тааруулах хосууд (Зөв хосоор нь оруулна уу)</Label>
        {matchingPairs.map((pair, index) => (
          <div key={index} className="flex flex-col gap-2 mb-4 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">Хос {index + 1}</span>
              <Button variant="ghost" size="icon" onClick={() => handleRemovePair(index)} disabled={matchingPairs.length <= 2}>
                <MinusCircle className="h-5 w-5 text-red-500" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Зүүн тал */}
              <div className="space-y-2">
                <Label>Зүүн тал</Label>
                <Input
                  placeholder="Зүүн талын текст"
                  value={pair.leftText}
                  onChange={(e) => handleLeftTextChange(index, e.target.value)}
                />
                <FileUploader
                  label="Зүүн талын медиа"
                  fileUrl={pair.leftMediaUrl || undefined}
                  onUploadSuccess={(url, file) => handleLeftMediaChange(index, file, url)}
                  onClear={() => handleClearLeftMedia(index)}
                  accept={mediaType}
                />
              </div>

              {/* Баруун тал */}
              <div className="space-y-2">
                <Label>Баруун тал</Label>
                <Input
                  placeholder="Баруун талын текст"
                  value={pair.rightText}
                  onChange={(e) => handleRightTextChange(index, e.target.value)}
                />
                <FileUploader
                  label="Баруун талын медиа"
                  fileUrl={pair.rightMediaUrl || undefined}
                  onUploadSuccess={(url, file) => handleRightMediaChange(index, file, url)}
                  onClear={() => handleClearRightMedia(index)}
                  accept={mediaType}
                />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={handleAddPair} className="mt-2">
          <PlusCircle className="h-4 w-4 mr-2" /> Хос нэмэх
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

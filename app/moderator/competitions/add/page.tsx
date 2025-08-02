'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import LatexRenderer from '@/components/LatexRenderer';
import MultipleChoiceQuestion from '@/components/questiontype/MultipleChoiceQuestion';
import TextInputQuestion from '@/components/questiontype/TextInputQuestion';
import FillInTheBlanksQuestion from '@/components/questiontype/FillInTheBlanksQuestion';
import MatchingQuestion from '@/components/questiontype/MatchingQuestion';
import OrderingQuestion from '@/components/questiontype/OrderingQuestion';
import CategorizationQuestion from '@/components/questiontype/CategorizationQuestion'; // Шинээр нэмэгдсэн
import FileUploader from '@/components/FileUploader';
import Image from 'next/image';

interface SolutionContent {
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface QuestionOption {
  text: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface MatchingItem {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface MatchingPair {
  leftId: string;
  rightId: string;
}

interface OrderingItem {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface CategorizationItem {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'text-input' | 'fill-in-the-blanks' | 'matching' | 'ordering' | 'categorization';
  text: string;
  score: number;
  options?: QuestionOption[];
  correctAnswer?: string;
  correctAnswers?: string[];
  questionImage?: string;
  questionAudio?: string;
  questionVideo?: string;
  solution?: SolutionContent;
  leftItems?: MatchingItem[];
  rightItems?: MatchingItem[];
  correctMatches?: MatchingPair[];
  orderingItems?: OrderingItem[];
  correctOrder?: string[];
  categories?: string[];
  categorizationItems?: CategorizationItem[];
  correctCategories?: Record<string, string[]>;
}

export default function ModeratorCompetitionAddPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('6');
  const [timeLimit, setTimeLimit] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [currentQuestionType, setCurrentQuestionType] = useState<'multiple-choice' | 'text-input' | 'fill-in-the-blanks' | 'matching' | 'ordering' | 'categorization'>('multiple-choice');
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentQuestionScore, setCurrentQuestionScore] = useState(1);
  const [currentQuestionImage, setCurrentQuestionImage] = useState<string | undefined>();
  const [currentQuestionAudio, setCurrentQuestionAudio] = useState<string | undefined>();
  const [currentQuestionVideo, setCurrentQuestionVideo] = useState<string | undefined>();

  const [currentOptions, setCurrentOptions] = useState<QuestionOption[]>([{ text: '', image: '' }, { text: '', image: '' }]);
  const [currentNewOption, setCurrentNewOption] = useState<QuestionOption>({ text: '', image: '', audio: '', video: '' });
  const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState<string>('');

  const [currentCorrectAnswers, setCurrentCorrectAnswers] = useState<string[]>(['']);
  const blankCount = currentQuestionText.split('[BLANK]').length - 1;

  const [currentLeftItems, setCurrentLeftItems] = useState<MatchingItem[]>([]);
  const [currentRightItems, setCurrentRightItems] = useState<MatchingItem[]>([]);
  const [currentNewLeftItem, setCurrentNewLeftItem] = useState<MatchingItem>({ id: '', text: '', image: '', audio: '', video: '' });
  const [currentNewRightItem, setCurrentNewRightItem] = useState<MatchingItem>({ id: '', text: '', image: '', audio: '', video: '' });
  const [currentCorrectMatches, setCurrentCorrectMatches] = useState<MatchingPair[]>([]);

  const [currentOrderingItems, setCurrentOrderingItems] = useState<OrderingItem[]>([]);
  const [currentNewOrderingItem, setCurrentNewOrderingItem] = useState<OrderingItem>({ id: '', text: '', image: '', audio: '', video: '' });
  
  // Шинээр нэмэгдсэн төлөвүүд
  const [currentCategories, setCurrentCategories] = useState<string[]>([]);
  const [currentNewCategory, setCurrentNewCategory] = useState('');
  const [currentCategorizationItems, setCurrentCategorizationItems] = useState<CategorizationItem[]>([]);
  const [currentNewCategorizationItem, setCurrentNewCategorizationItem] = useState<CategorizationItem>({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
  const [currentCorrectCategories, setCurrentCorrectCategories] = useState<Record<string, string[]>>({});

  const [currentSolutionText, setCurrentSolutionText] = useState('');
  const [currentSolutionImage, setCurrentSolutionImage] = useState<string | undefined>();
  const [currentSolutionAudio, setCurrentSolutionAudio] = useState<string | undefined>();
  const [currentSolutionVideo, setCurrentSolutionVideo] = useState<string | undefined>();
  
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (currentQuestionText || currentOptions.some(opt => opt.text.trim() !== '') || currentLeftItems.length > 0 || currentOrderingItems.length > 0 || currentCategorizationItems.length > 0) {
      setPreviewQuestionId(null);
    }
  }, [currentQuestionText, currentOptions, currentLeftItems, currentOrderingItems, currentCategorizationItems]);

  useEffect(() => {
    if (currentQuestionType === 'fill-in-the-blanks') {
      const newAnswers = Array(blankCount).fill(null).map((_, i) => currentCorrectAnswers[i] || '');
      setCurrentCorrectAnswers(newAnswers);
    } else {
      setCurrentCorrectAnswers(['']);
    }
  }, [blankCount, currentQuestionType]);

  useEffect(() => {
    if (currentQuestionType === 'matching' && currentLeftItems.length > 0 && currentRightItems.length > 0) {
        if (currentLeftItems.length !== currentRightItems.length) {
            setCurrentCorrectMatches([]);
            return;
        }
        const newMatches = currentLeftItems.map((leftItem, index) => {
            const existingMatch = currentCorrectMatches.find(match => match.leftId === leftItem.id);
            if (existingMatch) {
                return existingMatch;
            }
            const rightItem = currentRightItems[index];
            return { leftId: leftItem.id, rightId: rightItem?.id || '' };
        });
        setCurrentCorrectMatches(newMatches);
    } else {
        setCurrentCorrectMatches([]);
    }
  }, [currentLeftItems, currentRightItems, currentQuestionType]);

  const handleAddOption = () => {
    if (currentNewOption.text.trim() !== '' || currentNewOption.image || currentNewOption.audio || currentNewOption.video) {
      setCurrentOptions((prev) => [...prev, currentNewOption]);
      setCurrentNewOption({ text: '', image: '', audio: '', video: '' });
    } else {
      toast.error('Хариултын хувилбар оруулна уу.');
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    const newOptions = currentOptions.filter((_, index) => index !== indexToRemove);
    setCurrentOptions(newOptions);
    const removedOptionLetter = String.fromCharCode(65 + indexToRemove);
    if (removedOptionLetter === currentCorrectAnswer) {
      setCurrentCorrectAnswer('');
    }
  };

  const handleAddLeftItem = () => {
    if (currentNewLeftItem.text || currentNewLeftItem.image || currentNewLeftItem.audio || currentNewLeftItem.video) {
      const newItem = { ...currentNewLeftItem, id: `left-${Date.now()}` };
      setCurrentLeftItems(prev => [...prev, newItem]);
      setCurrentNewLeftItem({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
    } else {
      toast.error('Зүүн талын элемент оруулна уу.');
    }
  };

  const handleAddRightItem = () => {
    if (currentNewRightItem.text || currentNewRightItem.image || currentNewRightItem.audio || currentNewRightItem.video) {
      const newItem = { ...currentNewRightItem, id: `right-${Date.now()}` };
      setCurrentRightItems(prev => [...prev, newItem]);
      setCurrentNewRightItem({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
    } else {
      toast.error('Баруун талын элемент оруулна уу.');
    }
  };

  const handleRemoveLeftItem = (idToRemove: string) => {
    setCurrentLeftItems(prev => prev.filter(item => item.id !== idToRemove));
    setCurrentCorrectMatches(prev => prev.filter(match => match.leftId !== idToRemove));
  };
  
  const handleRemoveRightItem = (idToRemove: string) => {
    setCurrentRightItems(prev => prev.filter(item => item.id !== idToRemove));
    setCurrentCorrectMatches(prev => prev.filter(match => match.rightId !== idToRemove));
  };
  
  const handleAddOrderingItem = () => {
    if (currentNewOrderingItem.text || currentNewOrderingItem.image || currentNewOrderingItem.audio || currentNewOrderingItem.video) {
      const newItem = { ...currentNewOrderingItem, id: `order-${Date.now()}` };
      setCurrentOrderingItems(prev => [...prev, newItem]);
      setCurrentNewOrderingItem({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
    } else {
      toast.error('Дарааллын элемент оруулна уу.');
    }
  };
  
  const handleRemoveOrderingItem = (idToRemove: string) => {
    setCurrentOrderingItems(prev => prev.filter(item => item.id !== idToRemove));
  };
  
  // Шинээр нэмэгдсэн функцууд
  const handleAddCategory = () => {
    if (currentNewCategory.trim() !== '' && !currentCategories.includes(currentNewCategory)) {
        setCurrentCategories(prev => [...prev, currentNewCategory]);
        setCurrentCorrectCategories(prev => ({ ...prev, [currentNewCategory]: [] }));
        setCurrentNewCategory('');
    } else {
        toast.error('Ангиллын нэрийг оруулна уу эсвэл давхардсан байна.');
    }
  };
  
  const handleRemoveCategory = (categoryToRemove: string) => {
    setCurrentCategories(prev => prev.filter(cat => cat !== categoryToRemove));
    setCurrentCorrectCategories(prev => {
        const newCorrectCategories = { ...prev };
        delete newCorrectCategories[categoryToRemove];
        return newCorrectCategories;
    });
  };

  const handleAddCategorizationItem = () => {
    if (currentNewCategorizationItem.text || currentNewCategorizationItem.image || currentNewCategorizationItem.audio || currentNewCategorizationItem.video) {
      const newItem = { ...currentNewCategorizationItem, id: `cat-${Date.now()}` };
      setCurrentCategorizationItems(prev => [...prev, newItem]);
      setCurrentNewCategorizationItem({ id: '', text: undefined, image: undefined, audio: undefined, video: undefined });
    } else {
      toast.error('Ангилах элементийг оруулна уу.');
    }
  };
  
  const handleRemoveCategorizationItem = (idToRemove: string) => {
    setCurrentCategorizationItems(prev => prev.filter(item => item.id !== idToRemove));
    setCurrentCorrectCategories(prev => {
        const newCorrectCategories = { ...prev };
        for(const cat in newCorrectCategories) {
            newCorrectCategories[cat] = newCorrectCategories[cat].filter(itemId => itemId !== idToRemove);
        }
        return newCorrectCategories;
    });
  };

  const handleAddQuestion = useCallback(() => {
    if (!currentQuestionText || currentQuestionScore <= 0) {
      toast.error('Асуулт болон оноог оруулна уу.');
      return;
    }

    const solutionData: SolutionContent = {};
    if (currentSolutionText) solutionData.text = currentSolutionText;
    if (currentSolutionImage) solutionData.image = currentSolutionImage;
    if (currentSolutionAudio) solutionData.audio = currentSolutionAudio;
    if (currentSolutionVideo) solutionData.video = currentSolutionVideo;
    
    const solutionExists = Object.keys(solutionData).length > 0;

    let newQuestion: Question;
    
    if (currentQuestionType === 'multiple-choice') {
      const filteredOptions = currentOptions.filter(option => option.text.trim() !== '' || option.image || option.audio || option.video);
      if (filteredOptions.length < 2) {
        toast.error('Сонгох хариулттай асуултад ядаж 2 хувилбар байх ёстой.');
        return;
      }
      if (!currentCorrectAnswer) {
        toast.error('Зөв хариултыг сонгоно уу.');
        return;
      }
      const correctIndex = currentCorrectAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
      const correctAnswerText = filteredOptions[correctIndex]?.text;

      if (!correctAnswerText) {
        toast.error('Сонгосон зөв хариулт алга байна.');
        return;
      }
      
      newQuestion = {
        id: `q-${Date.now()}`,
        type: 'multiple-choice',
        text: currentQuestionText,
        score: currentQuestionScore,
        options: filteredOptions,
        correctAnswer: correctAnswerText,
        questionImage: currentQuestionImage || undefined,
        questionAudio: currentQuestionAudio || undefined,
        questionVideo: currentQuestionVideo || undefined,
        solution: solutionExists ? solutionData : undefined,
      };
    } else if (currentQuestionType === 'fill-in-the-blanks') {
      if (blankCount === 0) {
        toast.error('Хоосон зай нөхөх асуултад ядаж нэг [BLANK] тэмдэглэгээ байх ёстой.');
        return;
      }
      if (currentCorrectAnswers.some(ans => !ans.trim())) {
        toast.error('Бүх хоосон зайн зөв хариултыг оруулна уу.');
        return;
      }
      newQuestion = {
        id: `q-${Date.now()}`,
        type: 'fill-in-the-blanks',
        text: currentQuestionText,
        score: currentQuestionScore,
        correctAnswers: currentCorrectAnswers,
        questionImage: currentQuestionImage || undefined,
        questionAudio: currentQuestionAudio || undefined,
        questionVideo: currentQuestionVideo || undefined,
        solution: solutionExists ? solutionData : undefined,
      };
    } else if (currentQuestionType === 'matching') {
      if (currentLeftItems.length < 2 || currentRightItems.length < 2) {
        toast.error('Ижилсүүлэх асуултад хоёр талд нь ядаж 2 элемент байх ёстой.');
        return;
      }
      if (currentLeftItems.length !== currentRightItems.length) {
        toast.error('Зүүн ба баруун талын элементүүдийн тоо тэнцүү байх ёстой.');
        return;
      }
      const allMatchesDefined = currentCorrectMatches.every(match => match.leftId && match.rightId);
      if (!allMatchesDefined) {
        toast.error('Бүх хослолыг тохируулна уу.');
        return;
      }
      newQuestion = {
        id: `q-${Date.now()}`,
        type: 'matching',
        text: currentQuestionText,
        score: currentQuestionScore,
        leftItems: currentLeftItems,
        rightItems: currentRightItems,
        correctMatches: currentCorrectMatches,
        questionImage: currentQuestionImage || undefined,
        questionAudio: currentQuestionAudio || undefined,
        questionVideo: currentQuestionVideo || undefined,
        solution: solutionExists ? solutionData : undefined,
      };
    } else if (currentQuestionType === 'ordering') {
      if (currentOrderingItems.length < 2) {
        toast.error('Дарааллуулж байрлуулах асуултад ядаж 2 элемент байх ёстой.');
        return;
      }
      const initialOrder = currentOrderingItems.map(item => item.id);
      newQuestion = {
        id: `q-${Date.now()}`,
        type: 'ordering',
        text: currentQuestionText,
        score: currentQuestionScore,
        orderingItems: currentOrderingItems,
        correctOrder: initialOrder,
        questionImage: currentQuestionImage || undefined,
        questionAudio: currentQuestionAudio || undefined,
        questionVideo: currentQuestionVideo || undefined,
        solution: solutionExists ? solutionData : undefined,
      };
    } else if (currentQuestionType === 'categorization') { // Шинэ төрөл
        if (currentCategories.length < 2 || currentCategorizationItems.length < 2) {
            toast.error('Ангилах асуултад ядаж 2 ангилал болон 2 элемент байх ёстой.');
            return;
        }
        // Check if all items are assigned to a category
        const allItems = currentCategorizationItems.map(item => item.id);
        const assignedItems = Object.values(currentCorrectCategories).flat();
        const unassignedItems = allItems.filter(id => !assignedItems.includes(id));

        if (unassignedItems.length > 0) {
            toast.error('Бүх элементүүдийг ангилалд хуваарилна уу.');
            return;
        }

        newQuestion = {
            id: `q-${Date.now()}`,
            type: 'categorization',
            text: currentQuestionText,
            score: currentQuestionScore,
            categories: currentCategories,
            categorizationItems: currentCategorizationItems,
            correctCategories: currentCorrectCategories,
            questionImage: currentQuestionImage || undefined,
            questionAudio: currentQuestionAudio || undefined,
            questionVideo: currentQuestionVideo || undefined,
            solution: solutionExists ? solutionData : undefined,
        };
    }
    
    else { // text-input
      newQuestion = {
        id: `q-${Date.now()}`,
        type: 'text-input',
        text: currentQuestionText,
        score: currentQuestionScore,
        questionImage: currentQuestionImage || undefined,
        questionAudio: currentQuestionAudio || undefined,
        questionVideo: currentQuestionVideo || undefined,
        solution: solutionExists ? solutionData : undefined,
      };
    }
    
    setQuestions((prev) => [...prev, newQuestion]);

    setCurrentQuestionText('');
    setCurrentQuestionScore(1);
    setCurrentQuestionImage(undefined);
    setCurrentQuestionAudio(undefined);
    setCurrentQuestionVideo(undefined);
    setCurrentOptions([{ text: '', image: '' }, { text: '', image: '' }]);
    setCurrentCorrectAnswer('');
    setCurrentCorrectAnswers(['']);
    setCurrentLeftItems([]);
    setCurrentRightItems([]);
    setCurrentNewLeftItem({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
    setCurrentNewRightItem({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
    setCurrentCorrectMatches([]);
    setCurrentOrderingItems([]);
    setCurrentNewOrderingItem({ id: '', text: '', image: undefined, audio: undefined, video: undefined });
    setCurrentCategories([]);
    setCurrentNewCategory('');
    setCurrentCategorizationItems([]);
    setCurrentNewCategorizationItem({ id: '', text: undefined, image: undefined, audio: undefined, video: undefined });
    setCurrentCorrectCategories({});
    setPreviewQuestionId(null);
    setCurrentSolutionText('');
    setCurrentSolutionImage(undefined);
    setCurrentSolutionAudio(undefined);
    setCurrentSolutionVideo(undefined);

    toast.success('Асуултыг нэмлээ.');
  }, [currentQuestionText, currentQuestionScore, currentQuestionType, currentOptions, currentCorrectAnswer, currentCorrectAnswers, blankCount, currentQuestionImage, currentQuestionAudio, currentQuestionVideo, currentLeftItems, currentRightItems, currentCorrectMatches, currentOrderingItems, currentCategories, currentCategorizationItems, currentCorrectCategories, currentSolutionText, currentSolutionImage, currentSolutionAudio, currentSolutionVideo]);

  const handleRemoveQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setPreviewQuestionId(null);
    toast.info('Асуултыг устгалаа.');
  }, []);

  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

  const handleSave = async () => {
    if (!title || questions.length === 0 || !startTime || !selectedClass) {
      toast.error('Гарчиг, эхлэх цаг, анги болон ядаж нэг асуулт оруулна уу.');
      return;
    }

    setIsSaving(true);
    const competitionData = {
      title,
      description,
      examDate,
      startTime,
      selectedClass,
      timeLimit,
      totalScore,
      questions,
    };

    console.log('Тэмцээний өгөгдөл:', competitionData);
    toast.success('Тэмцээний өгөгдөл хадгалагдлаа!');
    setIsSaving(false);
  };
  
  const questionToPreview = previewQuestionId 
    ? questions.find(q => q.id === previewQuestionId)
    : null;

    const ItemRenderer = ({ item }: { item: MatchingItem | OrderingItem | CategorizationItem }) => (
        <div className="flex flex-col items-center space-y-2 p-2">
            {item.image && (
                <Image src={item.image} alt={item.text || 'Matching Image'} width={50} height={50} className="rounded" />
            )}
            {item.audio && (
                <audio controls src={item.audio} className="w-full" />
            )}
            {item.video && (
                <video controls src={item.video} width={100} height={75} className="rounded" />
            )}
            {item.text && <LatexRenderer text={item.text} />}
        </div>
    );

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Тэмцээний ерөнхий мэдээлэл</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Гарчиг</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="description">Тайлбар</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="examDate">Огноо</Label>
              <Input id="examDate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="startTime">Эхлэх цаг</Label>
              <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="selectedClass">Анги</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Анги сонгох" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6-р анги</SelectItem>
                  <SelectItem value="7">7-р анги</SelectItem>
                  <SelectItem value="8">8-р анги</SelectItem>
                  <SelectItem value="9">9-р анги</SelectItem>
                  <SelectItem value="10">10-р анги</SelectItem>
                  <SelectItem value="11">11-р анги</SelectItem>
                  <SelectItem value="12">12-р анги</SelectItem>
                  <SelectItem value="Багш">Багш</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeLimit">Хугацаа (мин)</Label>
              <Input id="timeLimit" type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Асуулт нэмэх</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Асуултын төрөл</Label>
                <Select
                  value={currentQuestionType}
                  onValueChange={(value) => setCurrentQuestionType(value as 'multiple-choice' | 'text-input' | 'fill-in-the-blanks' | 'matching' | 'ordering' | 'categorization')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Асуултын төрөл сонгох" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Сонгох хариулттай асуулт</SelectItem>
                    <SelectItem value="text-input">Текст хариулттай асуулт</SelectItem>
                    <SelectItem value="fill-in-the-blanks">Хоосон зай нөхөх</SelectItem>
                    <SelectItem value="matching">Ижилсүүлэх</SelectItem>
                    <SelectItem value="ordering">Дарааллуулж байрлуулах</SelectItem>
                    <SelectItem value="categorization">Ангилах / Бүлэгт хуваах</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="questionText">Асуулт (Latex)</Label>
                {currentQuestionType === 'fill-in-the-blanks' && (
                  <p className="text-sm text-muted-foreground my-2">
                    Хоосон орхих хэсэгт **&quot;[BLANK]&quot;** гэж бичнэ үү. Жишээ нь: &quot;Нарны системд [BLANK] гариг байдаг.&quot;
                  </p>
                )}
                <Textarea
                  id="questionText"
                  placeholder="Жишээ нь: Ньютоны хууль юу вэ?"
                  value={currentQuestionText}
                  onChange={(e) => setCurrentQuestionText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUploader
                  label="Асуултын зураг"
                  fileUrl={currentQuestionImage}
                  onUploadSuccess={(url, fileType) => {if(fileType === 'image') setCurrentQuestionImage(url)}}
                  onClear={() => setCurrentQuestionImage(undefined)}
                  accept="image/*"
                />
                <FileUploader
                  label="Асуултын аудио"
                  fileUrl={currentQuestionAudio}
                  onUploadSuccess={(url, fileType) => {if(fileType === 'audio') setCurrentQuestionAudio(url)}}
                  onClear={() => setCurrentQuestionAudio(undefined)}
                  accept="audio/*"
                />
                <FileUploader
                  label="Асуултын бичлэг"
                  fileUrl={currentQuestionVideo}
                  onUploadSuccess={(url, fileType) => {if(fileType === 'video') setCurrentQuestionVideo(url)}}
                  onClear={() => setCurrentQuestionVideo(undefined)}
                  accept="video/*"
                />
              </div>
              
              {currentQuestionType === 'multiple-choice' && (
                <div className="space-y-4">
                  <Label className="font-semibold text-lg">Хариултын хувилбарууд</Label>
                  {currentOptions.map((option, index) => (
                    <div key={index} className="space-y-2 p-2 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <Label>{String.fromCharCode(65 + index)}.</Label>
                        <Input
                          type="text"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...currentOptions];
                            newOptions[index].text = e.target.value;
                            setCurrentOptions(newOptions);
                          }}
                          placeholder="Хариултын текст"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(index)}>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-6">
                        <FileUploader
                          label="Зураг"
                          fileUrl={option.image}
                          onUploadSuccess={(url, fileType) => {
                            if (fileType === 'image') {
                                const newOptions = [...currentOptions];
                                newOptions[index].image = url;
                                newOptions[index].audio = undefined;
                                newOptions[index].video = undefined;
                                setCurrentOptions(newOptions);
                            }
                          }}
                          onClear={() => {
                            const newOptions = [...currentOptions];
                            newOptions[index].image = undefined;
                            setCurrentOptions(newOptions);
                          }}
                          accept="image/*"
                        />
                        <FileUploader
                          label="Аудио"
                          fileUrl={option.audio}
                          onUploadSuccess={(url, fileType) => {
                            if (fileType === 'audio') {
                                const newOptions = [...currentOptions];
                                newOptions[index].audio = url;
                                newOptions[index].image = undefined;
                                newOptions[index].video = undefined;
                                setCurrentOptions(newOptions);
                            }
                          }}
                          onClear={() => {
                            const newOptions = [...currentOptions];
                            newOptions[index].audio = undefined;
                            setCurrentOptions(newOptions);
                          }}
                          accept="audio/*"
                        />
                        <FileUploader
                          label="Бичлэг"
                          fileUrl={option.video}
                          onUploadSuccess={(url, fileType) => {
                            if (fileType === 'video') {
                                const newOptions = [...currentOptions];
                                newOptions[index].video = url;
                                newOptions[index].image = undefined;
                                newOptions[index].audio = undefined;
                                setCurrentOptions(newOptions);
                            }
                          }}
                          onClear={() => {
                            const newOptions = [...currentOptions];
                            newOptions[index].video = undefined;
                            setCurrentOptions(newOptions);
                          }}
                          accept="video/*"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2 p-2 border rounded-md border-dashed">
                    <Label className="font-semibold">Шинэ хувилбар нэмэх</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        placeholder="Хариултын текст"
                        value={currentNewOption.text}
                        onChange={(e) => setCurrentNewOption(prev => ({ ...prev, text: e.target.value }))}
                      />
                      <Button type="button" onClick={handleAddOption}>
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-6">
                       <FileUploader
                          label="Зураг"
                          fileUrl={currentNewOption.image}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'image') setCurrentNewOption(prev => ({ ...prev, image: url, audio: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewOption(prev => ({ ...prev, image: undefined }))}
                          accept="image/*"
                        />
                        <FileUploader
                          label="Аудио"
                          fileUrl={currentNewOption.audio}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'audio') setCurrentNewOption(prev => ({ ...prev, audio: url, image: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewOption(prev => ({ ...prev, audio: undefined }))}
                          accept="audio/*"
                        />
                        <FileUploader
                          label="Бичлэг"
                          fileUrl={currentNewOption.video}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'video') setCurrentNewOption(prev => ({ ...prev, video: url, image: undefined, audio: undefined }))}}
                          onClear={() => setCurrentNewOption(prev => ({ ...prev, video: undefined }))}
                          accept="video/*"
                        />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="correctAnswer">Зөв хариулт</Label>
                    <Select value={currentCorrectAnswer} onValueChange={setCurrentCorrectAnswer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Зөв хариулт сонгох" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentOptions.map((option, index) => (
                          <SelectItem key={index} value={String.fromCharCode(65 + index)}>
                            {String.fromCharCode(65 + index)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {currentQuestionType === 'fill-in-the-blanks' && (
                <div className="space-y-4">
                  <Label className="font-semibold text-lg">Зөв хариултууд ({blankCount})</Label>
                  <p className="text-sm text-muted-foreground">Асуултын текст дэх **`[BLANK]`** тэмдэглэгээний дарааллаар зөв хариултуудыг оруулна уу.</p>
                  {Array.from({ length: blankCount }).map((_, index) => (
                    <Input
                      key={index}
                      type="text"
                      placeholder={`${index + 1}-р хоосон зайн хариулт`}
                      value={currentCorrectAnswers[index] || ''}
                      onChange={(e) => {
                        const newAnswers = [...currentCorrectAnswers];
                        newAnswers[index] = e.target.value;
                        setCurrentCorrectAnswers(newAnswers);
                      }}
                    />
                  ))}
                </div>
              )}
              
               {currentQuestionType === 'matching' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-2 border rounded-md">
                      <Label className="font-semibold text-lg">Зүүн тал ({currentLeftItems.length})</Label>
                      {currentLeftItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center space-x-2 border-b last:border-b-0 py-2">
                          <ItemRenderer item={item} />
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveLeftItem(item.id)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <div className="space-y-2 pt-4">
                        <Label>Шинэ элемент нэмэх</Label>
                        <Input
                            type="text"
                            placeholder="Текст"
                            value={currentNewLeftItem.text}
                            onChange={(e) => setCurrentNewLeftItem(prev => ({ ...prev, text: e.target.value }))}
                        />
                        <FileUploader
                          label="Зураг"
                          fileUrl={currentNewLeftItem.image}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'image') setCurrentNewLeftItem(prev => ({ ...prev, image: url, audio: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewLeftItem(prev => ({ ...prev, image: undefined }))}
                          accept="image/*"
                        />
                        <FileUploader
                          label="Аудио"
                          fileUrl={currentNewLeftItem.audio}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'audio') setCurrentNewLeftItem(prev => ({ ...prev, audio: url, image: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewLeftItem(prev => ({ ...prev, audio: undefined }))}
                          accept="audio/*"
                        />
                        <FileUploader
                          label="Бичлэг"
                          fileUrl={currentNewLeftItem.video}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'video') setCurrentNewLeftItem(prev => ({ ...prev, video: url, image: undefined, audio: undefined }))}}
                          onClear={() => setCurrentNewLeftItem(prev => ({ ...prev, video: undefined }))}
                          accept="video/*"
                        />
                        <Button onClick={handleAddLeftItem} className="w-full">
                          <PlusCircle className="mr-2 h-4 w-4" /> Нэмэх
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 p-2 border rounded-md">
                      <Label className="font-semibold text-lg">Баруун тал ({currentRightItems.length})</Label>
                      {currentRightItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center space-x-2 border-b last:border-b-0 py-2">
                          <ItemRenderer item={item} />
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveRightItem(item.id)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <div className="space-y-2 pt-4">
                        <Label>Шинэ элемент нэмэх</Label>
                        <Input
                            type="text"
                            placeholder="Текст"
                            value={currentNewRightItem.text}
                            onChange={(e) => setCurrentNewRightItem(prev => ({ ...prev, text: e.target.value }))}
                        />
                        <FileUploader
                          label="Зураг"
                          fileUrl={currentNewRightItem.image}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'image') setCurrentNewRightItem(prev => ({ ...prev, image: url, audio: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewRightItem(prev => ({ ...prev, image: undefined }))}
                          accept="image/*"
                        />
                        <FileUploader
                          label="Аудио"
                          fileUrl={currentNewRightItem.audio}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'audio') setCurrentNewRightItem(prev => ({ ...prev, audio: url, image: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewRightItem(prev => ({ ...prev, audio: undefined }))}
                          accept="audio/*"
                        />
                        <FileUploader
                          label="Бичлэг"
                          fileUrl={currentNewRightItem.video}
                          onUploadSuccess={(url, fileType) => {if (fileType === 'video') setCurrentNewRightItem(prev => ({ ...prev, video: url, image: undefined, audio: undefined }))}}
                          onClear={() => setCurrentNewRightItem(prev => ({ ...prev, video: undefined }))}
                          accept="video/*"
                        />
                        <Button onClick={handleAddRightItem} className="w-full">
                          <PlusCircle className="mr-2 h-4 w-4" /> Нэмэх
                        </Button>
                      </div>
                    </div>
                  </div>
                  {currentLeftItems.length > 0 && currentLeftItems.length === currentRightItems.length && (
                    <div className="space-y-2 p-2 border rounded-md">
                        <Label className="font-semibold text-lg">Зөв хослол</Label>
                        {currentLeftItems.map((leftItem) => (
                            <div key={leftItem.id} className="flex items-center space-x-2">
                                <span className="w-1/3 truncate"><LatexRenderer text={leftItem.text || "Зураг"} /></span>
                                <span className="text-xl font-bold">~</span>
                                <Select
                                    value={currentCorrectMatches.find(m => m.leftId === leftItem.id)?.rightId || ''}
                                    onValueChange={(value) => {
                                        const newMatches = [...currentCorrectMatches];
                                        const matchIndex = newMatches.findIndex(m => m.leftId === leftItem.id);
                                        if (matchIndex > -1) {
                                            newMatches[matchIndex].rightId = value;
                                        } else {
                                            newMatches.push({ leftId: leftItem.id, rightId: value });
                                        }
                                        setCurrentCorrectMatches(newMatches);
                                    }}
                                >
                                    <SelectTrigger className="w-2/3">
                                        <SelectValue placeholder="Зөв хослолыг сонгох" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currentRightItems.map((rightItem) => (
                                            <SelectItem key={rightItem.id} value={rightItem.id}>
                                                <LatexRenderer text={rightItem.text || "Зураг"} />
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              
              {currentQuestionType === 'ordering' && (
                <div className="space-y-4">
                  <div className="space-y-2 p-2 border rounded-md">
                    <Label className="font-semibold text-lg">Дарааллын элементүүд ({currentOrderingItems.length})</Label>
                    {currentOrderingItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center space-x-2 border-b last:border-b-0 py-2">
                        <ItemRenderer item={item} />
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveOrderingItem(item.id)}>
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <div className="space-y-2 pt-4">
                      <Label>Шинэ элемент нэмэх</Label>
                      <Input
                        type="text"
                        placeholder="Текст"
                        value={currentNewOrderingItem.text}
                        onChange={(e) => setCurrentNewOrderingItem(prev => ({ ...prev, text: e.target.value }))}
                      />
                      <FileUploader
                        label="Зураг"
                        fileUrl={currentNewOrderingItem.image}
                        onUploadSuccess={(url, fileType) => {if(fileType === 'image') setCurrentNewOrderingItem(prev => ({ ...prev, image: url, audio: undefined, video: undefined }))}}
                        onClear={() => setCurrentNewOrderingItem(prev => ({ ...prev, image: undefined }))}
                        accept="image/*"
                      />
                      <FileUploader
                        label="Аудио"
                        fileUrl={currentNewOrderingItem.audio}
                        onUploadSuccess={(url, fileType) => {if(fileType === 'audio') setCurrentNewOrderingItem(prev => ({ ...prev, audio: url, image: undefined, video: undefined }))}}
                        onClear={() => setCurrentNewOrderingItem(prev => ({ ...prev, audio: undefined }))}
                        accept="audio/*"
                      />
                      <FileUploader
                        label="Бичлэг"
                        fileUrl={currentNewOrderingItem.video}
                        onUploadSuccess={(url, fileType) => {if(fileType === 'video') setCurrentNewOrderingItem(prev => ({ ...prev, video: url, image: undefined, audio: undefined }))}}
                        onClear={() => setCurrentNewOrderingItem(prev => ({ ...prev, video: undefined }))}
                        accept="video/*"
                      />
                      <Button onClick={handleAddOrderingItem} className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" /> Нэмэх
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {currentQuestionType === 'categorization' && (
                  <div className="space-y-4">
                    <div className="space-y-2 p-2 border rounded-md">
                      <Label className="font-semibold text-lg">Ангиллууд ({currentCategories.length})</Label>
                      <p className="text-sm text-muted-foreground">Ангиллын нэрсийг оруулна уу.</p>
                      <div className="space-y-2">
                          {currentCategories.map(category => (
                              <div key={category} className="flex items-center space-x-2">
                                  <Input type="text" value={category} disabled />
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveCategory(category)}>
                                      <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                          <Input
                              type="text"
                              placeholder="Шинэ ангиллын нэр"
                              value={currentNewCategory}
                              onChange={(e) => setCurrentNewCategory(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCategory();
                              }}
                          />
                          <Button onClick={handleAddCategory}>
                              <PlusCircle className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 p-2 border rounded-md">
                      <Label className="font-semibold text-lg">Ангилах зүйлс ({currentCategorizationItems.length})</Label>
                      {currentCategorizationItems.map(item => (
                          <div key={item.id} className="flex justify-between items-center space-x-2 border-b last:border-b-0 py-2">
                              <ItemRenderer item={item} />
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveCategorizationItem(item.id)}>
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                          </div>
                      ))}
                      <div className="space-y-2 pt-4">
                        <Label>Шинэ зүйл нэмэх</Label>
                        <Input
                          type="text"
                          placeholder="Текст"
                          value={currentNewCategorizationItem.text || ''}
                          onChange={(e) => setCurrentNewCategorizationItem(prev => ({ ...prev, text: e.target.value }))}
                        />
                        <FileUploader
                          label="Зураг"
                          fileUrl={currentNewCategorizationItem.image}
                          onUploadSuccess={(url, fileType) => {if(fileType === 'image') setCurrentNewCategorizationItem(prev => ({ ...prev, image: url, audio: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewCategorizationItem(prev => ({ ...prev, image: undefined }))}
                          accept="image/*"
                        />
                        <FileUploader
                          label="Аудио"
                          fileUrl={currentNewCategorizationItem.audio}
                          onUploadSuccess={(url, fileType) => {if(fileType === 'audio') setCurrentNewCategorizationItem(prev => ({ ...prev, audio: url, image: undefined, video: undefined }))}}
                          onClear={() => setCurrentNewCategorizationItem(prev => ({ ...prev, audio: undefined }))}
                          accept="audio/*"
                        />
                        <FileUploader
                          label="Бичлэг"
                          fileUrl={currentNewCategorizationItem.video}
                          onUploadSuccess={(url, fileType) => {if(fileType === 'video') setCurrentNewCategorizationItem(prev => ({ ...prev, video: url, image: undefined, audio: undefined }))}}
                          onClear={() => setCurrentNewCategorizationItem(prev => ({ ...prev, video: undefined }))}
                          accept="video/*"
                        />
                        <Button onClick={handleAddCategorizationItem} className="w-full">
                          <PlusCircle className="mr-2 h-4 w-4" /> Нэмэх
                        </Button>
                      </div>
                    </div>

                    {currentCategories.length > 0 && currentCategorizationItems.length > 0 && (
                        <div className="space-y-2 p-2 border rounded-md">
                            <Label className="font-semibold text-lg">Зөв хариултыг тогтоох</Label>
                            <p className="text-sm text-muted-foreground">Доорх зүйлсийг чирж, зөв ангилалд нь оруулна уу.</p>
                            <CategorizationQuestion
                                questionId="correct-answer-setup"
                                question=""
                                categories={currentCategories}
                                items={currentCategorizationItems}
                                onAnswer={setCurrentCorrectCategories}
                                initialAnswer={currentCorrectCategories}
                                readOnly={false}
                            />
                        </div>
                    )}
                  </div>
              )}

              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Бодолт</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="solutionText">Бодолт (Latex)</Label>
                    <Textarea
                      id="solutionText"
                      placeholder="Асуултын бодолтыг бичнэ үү."
                      value={currentSolutionText}
                      onChange={(e) => setCurrentSolutionText(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FileUploader
                      label="Бодолтын зураг"
                      fileUrl={currentSolutionImage}
                      onUploadSuccess={(url) => setCurrentSolutionImage(url)}
                      onClear={() => setCurrentSolutionImage(undefined)}
                      accept="image/*"
                    />
                    <FileUploader
                      label="Бодолтын аудио"
                      fileUrl={currentSolutionAudio}
                      onUploadSuccess={(url) => setCurrentSolutionAudio(url)}
                      onClear={() => setCurrentSolutionAudio(undefined)}
                      accept="audio/*"
                    />
                    <FileUploader
                      label="Бодолтын бичлэг"
                      fileUrl={currentSolutionVideo}
                      onUploadSuccess={(url) => setCurrentSolutionVideo(url)}
                      onClear={() => setCurrentSolutionVideo(undefined)}
                      accept="video/*"
                    />
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="questionScore">Оноо</Label>
                <Input
                  id="questionScore"
                  type="number"
                  value={currentQuestionScore}
                  onChange={(e) => setCurrentQuestionScore(Number(e.target.value))}
                  min={1}
                />
              </div>
              <Button onClick={handleAddQuestion} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Асуулт нэмэх
              </Button>
            </CardContent>
          </Card>

          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Оруулсан асуултууд ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {questions.map((q, index) => (
                  <div 
                    key={q.id} 
                    onClick={() => setPreviewQuestionId(q.id)}
                    className="p-4 border rounded-md shadow-sm space-y-2 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{index + 1}. Асуулт</p>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(q.id)}>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label>Асуулт:</Label>
                      <p className="mt-1"><LatexRenderer text={q.text} /></p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Оноо: {q.score}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Хадгалж байна...' : 'Тэмцээн хадгалах'}
          </Button>
        </div>

       <div className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Тэмцээний урьдчилсан харалт</CardTitle>
    </CardHeader>
    <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 -m-6 mb-0 p-6 pb-4">
          <h4 className="font-semibold text-base">Урьдчилсан харалт:</h4>
      </div>
      <div className="mt-4">
        {questionToPreview ? (
            <>
                {questionToPreview.type === 'multiple-choice' ? (
                    <MultipleChoiceQuestion
                        questionId={questionToPreview.id}
                        question={questionToPreview.text}
                        questionImage={questionToPreview.questionImage}
                        questionAudio={questionToPreview.questionAudio}
                        questionVideo={questionToPreview.questionVideo}
                        options={questionToPreview.options!}
                        onAnswer={() => {}}
                    />
                ) : questionToPreview.type === 'fill-in-the-blanks' ? (
                    <FillInTheBlanksQuestion
                        questionId={questionToPreview.id}
                        question={questionToPreview.text}
                        questionImage={questionToPreview.questionImage}
                        questionAudio={questionToPreview.questionAudio}
                        questionVideo={questionToPreview.questionVideo}
                        onAnswer={() => {}}
                    />
                ) : questionToPreview.type === 'matching' ? (
                    <MatchingQuestion
                        questionId={questionToPreview.id}
                        question={questionToPreview.text}
                        leftItems={questionToPreview.leftItems!}
                        rightItems={questionToPreview.rightItems!}
                        onAnswer={() => {}}
                    />
                ) : questionToPreview.type === 'ordering' ? (
                    <OrderingQuestion
                        questionId={questionToPreview.id}
                        question={questionToPreview.text}
                        items={questionToPreview.orderingItems!}
                        onAnswer={() => {}}
                        shuffle={false}
                    />
                ) : questionToPreview.type === 'categorization' ? (
                    <CategorizationQuestion
                        questionId={questionToPreview.id}
                        question={questionToPreview.text}
                        categories={questionToPreview.categories!}
                        items={questionToPreview.categorizationItems!}
                        onAnswer={() => {}}
                    />
                ) : (
                    <TextInputQuestion
                        questionId={questionToPreview.id}
                        question={questionToPreview.text}
                        questionImage={questionToPreview.questionImage}
                        questionAudio={questionToPreview.questionAudio}
                        questionVideo={questionToPreview.questionVideo}
                        onAnswer={() => {}}
                    />
                )}
            </>
        ) : (
          currentQuestionText ? (
            currentQuestionType === 'multiple-choice' ? (
              <MultipleChoiceQuestion
                questionId="current-question-preview"
                question={currentQuestionText}
                questionImage={currentQuestionImage}
                questionAudio={currentQuestionAudio}
                questionVideo={currentQuestionVideo}
                options={currentOptions}
                onAnswer={() => {}}
              />
            ) : currentQuestionType === 'fill-in-the-blanks' ? (
              <FillInTheBlanksQuestion
                questionId="current-question-preview"
                question={currentQuestionText}
                questionImage={currentQuestionImage}
                questionAudio={currentQuestionAudio}
                questionVideo={currentQuestionVideo}
                onAnswer={() => {}}
              />
            ) : currentQuestionType === 'matching' ? (
                <MatchingQuestion
                  questionId="current-question-preview"
                  question={currentQuestionText}
                  leftItems={currentLeftItems}
                  rightItems={currentRightItems}
                  onAnswer={() => {}}
                />
            ) : currentQuestionType === 'ordering' ? (
                <OrderingQuestion
                    questionId="current-question-preview"
                    question={currentQuestionText}
                    items={currentOrderingItems}
                    onAnswer={() => {}}
                    shuffle={false}
                />
            ) : currentQuestionType === 'categorization' ? (
                <CategorizationQuestion
                    questionId="current-question-preview"
                    question={currentQuestionText}
                    categories={currentCategories}
                    items={currentCategorizationItems}
                    onAnswer={() => {}}
                />
            ) : (
              <TextInputQuestion
                questionId="current-question-preview"
                question={currentQuestionText}
                questionImage={currentQuestionImage}
                questionAudio={currentQuestionAudio}
                questionVideo={currentQuestionVideo}
                onAnswer={() => {}}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Асуулт эсвэл харахыг хүссэн асуултыг сонгоно уу.</p>
          )
        )}
      </div>

      {questionToPreview?.solution && (
          <div className="mt-8 p-4 border-t-2 border-dashed">
              <h5 className="font-semibold text-md mb-2">Бодолт</h5>
              {questionToPreview.solution.image && <img src={questionToPreview.solution.image} alt="Solution Image" className="rounded-md my-2" />}
              {questionToPreview.solution.audio && <audio controls src={questionToPreview.solution.audio} className="w-full my-2" />}
              {questionToPreview.solution.video && <video controls src={questionToPreview.solution.video} className="w-full my-2" />}
              {questionToPreview.solution.text && <p className="mt-1"><LatexRenderer text={questionToPreview.solution.text} /></p>}
          </div>
      )}
    </CardContent>
  </Card>
</div>
      </div>
    </div>
  );
}
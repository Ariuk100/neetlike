// src/components/questiontype/ImageAnnotationQuestion.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import LatexRenderer from '../LatexRenderer';
import { cn } from '@/lib/utils';

interface LabelItem {
  id: string;
  text: string;
}

interface Hotspot {
  id: string;
  labelId: string;
  x: number; // Percentage value (0-100)
  y: number; // Percentage value (0-100)
  width: number; // Percentage value (0-100)
  height: number; // Percentage value (0-100)
}

interface UserAnswer {
  labelId: string;
  droppedAt: {
    x: number; // Percentage value (0-100)
    y: number; // Percentage value (0-100)
  };
}

interface ImageAnnotationQuestionProps {
  questionId: string;
  question: string;
  imageUrl: string;
  labels: LabelItem[];
  hotspots: Hotspot[];
  readOnly?: boolean;
  userAnswers?: UserAnswer[];
  onAnswer?: (answers: UserAnswer[]) => void;
}

const AnnotationLabel = ({
  text,
  onClick,
  style,
  isCorrect,
  readOnly,
  isDraggable = false,
  onDragStart,
}: {
  text: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  isCorrect?: boolean;
  readOnly?: boolean;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) => {
  const baseStyle = `w-24 h-10 flex items-center justify-center p-2 rounded-md shadow-lg text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis`;
  const color = readOnly ? (isCorrect ? 'bg-green-500' : 'bg-red-500') : 'bg-blue-500';
  const cursor = readOnly ? 'cursor-not-allowed' : (isDraggable ? 'cursor-grab' : 'cursor-pointer');

  return (
    <div
      className={cn(baseStyle, color, cursor)}
      style={style}
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
    >
      {text}
    </div>
  );
};

export default function ImageAnnotationQuestion({
  question,
  imageUrl,
  labels,
  hotspots,
  readOnly = false,
  userAnswers: initialUserAnswers = [],
  onAnswer,
}: ImageAnnotationQuestionProps) {
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>(initialUserAnswers);
  const [isClient, setIsClient] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null); // Залруулсан: HTMLDiviment -> HTMLDivElement

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDragStart = (e: React.DragEvent, labelId: string) => {
    if (readOnly) return;
    e.dataTransfer.setData('text/plain', labelId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (readOnly || !dropZoneRef.current) return;
    e.preventDefault();
    const labelId = e.dataTransfer.getData('text/plain');
    if (!labelId) return;

    const dropZoneRect = dropZoneRef.current.getBoundingClientRect();
    
    const x = ((e.clientX - dropZoneRect.left) / dropZoneRect.width) * 100;
    const y = ((e.clientY - dropZoneRect.top) / dropZoneRect.height) * 100;

    const newUserAnswer = { labelId, droppedAt: { x, y } };

    const existingAnswerIndex = userAnswers.findIndex(ans => ans.labelId === labelId);
    const updatedAnswers = existingAnswerIndex > -1
      ? userAnswers.map((ans, index) => index === existingAnswerIndex ? newUserAnswer : ans)
      : [...userAnswers, newUserAnswer];

    setUserAnswers(updatedAnswers);
    onAnswer?.(updatedAnswers);
  };

  const handleRemove = (labelId: string) => {
    if (readOnly) return;
    const updatedAnswers = userAnswers.filter(ans => ans.labelId !== labelId);
    setUserAnswers(updatedAnswers);
    onAnswer?.(updatedAnswers);
  };

  const isCorrect = (labelId: string, x: number, y: number) => {
    const correctHotspot = hotspots.find(hs => hs.labelId === labelId);
    if (!correctHotspot) return false;
    return (
      x >= correctHotspot.x &&
      x <= correctHotspot.x + correctHotspot.width &&
      y >= correctHotspot.y &&
      y <= correctHotspot.y + correctHotspot.height
    );
  };

  const calculateScore = () => {
    if (!readOnly || !initialUserAnswers) return null;
    let correctCount = 0;
    initialUserAnswers.forEach(ans => {
      if (isCorrect(ans.labelId, ans.droppedAt.x, ans.droppedAt.y)) {
        correctCount++;
      }
    });
    return `${correctCount} / ${hotspots.length}`;
  };

  // Залруулсан: ans.id -> ans.labelId
  const availableLabels = labels.filter(label => !userAnswers.find(ans => ans.labelId === label.id));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <LatexRenderer text={question} />
          {readOnly && <Label className="text-lg">Оноо: {calculateScore()}</Label>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div
            className="flex-1 relative border rounded-md min-h-[400px] overflow-hidden"
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isClient && <img src={imageUrl} alt="Annotation Base" className="w-full h-full object-contain" />}
            
            {userAnswers.map((ans, index) => {
              const labelText = labels.find(l => l.id === ans.labelId)?.text || '';
              const isLabelCorrect = readOnly ? isCorrect(ans.labelId, ans.droppedAt.x, ans.droppedAt.y) : false;

              return (
                <AnnotationLabel
                  key={index}
                  text={labelText}
                  readOnly={readOnly}
                  isCorrect={isLabelCorrect}
                  onClick={() => handleRemove(ans.labelId)}
                  style={{
                    position: 'absolute',
                    left: `${ans.droppedAt.x}%`,
                    top: `${ans.droppedAt.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
            
            {readOnly && hotspots.map((hs, index) => (
              <div
                key={`hs-${index}`}
                className="absolute border-2 border-dashed border-green-500 bg-green-500 opacity-20"
                style={{
                  left: `${hs.x}%`,
                  top: `${hs.y}%`,
                  width: `${hs.width}%`,
                  height: `${hs.height}%`,
                }}
              ></div>
            ))}
          </div>

          <div className="md:w-1/4 space-y-2 p-4 border rounded-md">
            <Label className="text-lg">Шошгонууд:</Label>
            {availableLabels.map(label => (
              <AnnotationLabel
                key={label.id}
                text={label.text}
                isDraggable={!readOnly}
                readOnly={readOnly}
                onDragStart={(e) => handleDragStart(e, label.id)}
                style={{
                  cursor: readOnly ? 'not-allowed' : 'grab',
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
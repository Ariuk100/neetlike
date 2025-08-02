// src/components/questiontype/CategorizationQuestion.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import LatexRenderer from '../LatexRenderer';

interface CategorizationItem {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

interface CategorizationQuestionProps {
  questionId: string;
  question: string;
  categories: string[];
  items: CategorizationItem[];
  onAnswer: (userAnswer: Record<string, string[]>) => void;
  readOnly?: boolean;
  initialAnswer?: Record<string, string[]>;
}

export default function CategorizationQuestion({
  question,
  categories,
  items,
  onAnswer,
  readOnly = false,
  initialAnswer,
}: CategorizationQuestionProps) {
  const [currentCategories, setCurrentCategories] = useState<Record<string, string[]>>({});
  const [unsortedItems, setUnsortedItems] = useState<CategorizationItem[]>([]);

  useEffect(() => {
    const newCategories: Record<string, string[]> = {};
    categories.forEach(cat => newCategories[cat] = []);
    
    let currentUnsortedItems = [...items];

    if (initialAnswer && Object.keys(initialAnswer).length > 0) {
      for (const cat in initialAnswer) {
          if (newCategories.hasOwnProperty(cat)) {
              newCategories[cat] = initialAnswer[cat];
          }
      }
      const assignedItemIds = Object.values(initialAnswer).flat();
      currentUnsortedItems = items.filter(item => !assignedItemIds.includes(item.id));
    }
    
    setCurrentCategories(newCategories);
    setUnsortedItems(currentUnsortedItems);
    
  }, [categories, items, initialAnswer]);
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    e.dataTransfer.setData('itemId', itemId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, category: string) => {
    if (readOnly) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
  
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newCategories = { ...currentCategories };
    let newUnsortedItems = [...unsortedItems];

    // Remove from previous unsorted list
    newUnsortedItems = newUnsortedItems.filter(i => i.id !== itemId);

    // Remove from previous category if it exists
    for (const cat in newCategories) {
      newCategories[cat] = newCategories[cat].filter(id => id !== itemId);
    }
    
    // Add item to the new category
    if (category !== 'unsorted') {
        if (newCategories[category]) { // Check if category exists
            newCategories[category].push(itemId);
        } else {
            // If category doesn't exist, put it back in unsorted
            newUnsortedItems = [...newUnsortedItems, item];
        }
    } else {
        newUnsortedItems = [...newUnsortedItems, item];
    }

    setCurrentCategories(newCategories);
    setUnsortedItems(newUnsortedItems);
    onAnswer(newCategories);
  };

  const renderItem = (item: CategorizationItem, isDraggable: boolean) => (
    <div
      key={item.id}
      draggable={isDraggable}
      onDragStart={isDraggable ? (e) => handleDragStart(e, item.id) : undefined}
      className={`relative p-2 bg-white border rounded-md cursor-grab ${isDraggable && 'hover:bg-gray-100'}`}
    >
      {item.text && <LatexRenderer text={item.text} />}
      {item.image && <Image src={item.image} alt={item.text || 'Item Image'} width={100} height={75} className="mt-2 rounded" />}
      {item.audio && <audio controls src={item.audio} className="w-full mt-2" />}
      {item.video && <video controls src={item.video} width={100} height={75} className="mt-2" />}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        {question && <CardTitle>{question}</CardTitle>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Unsorted Items */}
          <div className="flex-1 min-h-[100px] border-2 border-dashed rounded-md p-4 bg-gray-50 space-y-2"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'unsorted')}
          >
            <h4 className="font-semibold text-sm mb-2">Ангилаагүй зүйлс</h4>
            <div className="space-y-2">
              {unsortedItems.map(item => renderItem(item, !readOnly))}
            </div>
          </div>
          
          {/* Categories */}
          {categories.map(category => (
            <div
              key={category}
              className="flex-1 min-h-[100px] border rounded-md p-4 space-y-2"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category)}
            >
              <h4 className="font-semibold text-sm mb-2">{category}</h4>
              <div className="space-y-2">
                {currentCategories[category]?.map(itemId => {
                    const item = items.find(i => i.id === itemId);
                    return item ? renderItem(item, !readOnly) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
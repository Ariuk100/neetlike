'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import LatexRenderer from '../LatexRenderer';

// Ordering Question-ийн элементийн өгөгдөл
interface OrderingItem {
  id: string;
  text?: string;
  image?: string;
  audio?: string;
  video?: string;
}

// Ordering Question-ийн пропс
interface OrderingQuestionProps {
  questionId: string;
  question: string;
  items: OrderingItem[];
  onAnswer: (orderedItems: string[]) => void;
  shuffle?: boolean; // Шинэ проп
}

// Элементийг харуулах болон Drag and Drop хийх туслах компонент
function SortableItem({ item }: { item: OrderingItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-100 p-4 rounded-md shadow-sm cursor-grab active:cursor-grabbing border flex items-center space-x-4 mb-2"
    >
      <div className="flex flex-col items-center space-y-2 flex-1">
        {item.image && (
          <Image src={item.image} alt={item.text || 'Зураг'} width={50} height={50} className="rounded object-cover" />
        )}
        {item.audio && (
          <audio controls src={item.audio} className="w-full" />
        )}
        {item.video && (
          <video controls src={item.video} width={100} height={75} className="rounded" />
        )}
        {item.text && <LatexRenderer text={item.text} />}
      </div>
    </div>
  );
}

// Үндсэн компонент
export default function OrderingQuestion({question, items, onAnswer, shuffle = true }: OrderingQuestionProps) {
  const [orderedItems, setOrderedItems] = useState(items);
  const sensors = useSensors(useSensor(PointerSensor));

  // Эхний утгыг useMemo-г ашиглан холино
  const initialItems = useMemo(() => {
    if (shuffle) {
      const shuffled = [...items];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return items;
  }, [items, shuffle]);

  // Эхний холигдсон утгыг state-д хадгална
  useEffect(() => {
    setOrderedItems(initialItems);
  }, [initialItems]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = orderedItems.findIndex(item => item.id === active.id);
      const newIndex = orderedItems.findIndex(item => item.id === over.id);
      
      const newOrderedItems = [...orderedItems];
      const [movedItem] = newOrderedItems.splice(oldIndex, 1);
      newOrderedItems.splice(newIndex, 0, movedItem);

      setOrderedItems(newOrderedItems);
      onAnswer(newOrderedItems.map(item => item.id));
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold text-lg"><LatexRenderer text={question} /></h3>
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedItems} strategy={verticalListSortingStrategy}>
          {orderedItems.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
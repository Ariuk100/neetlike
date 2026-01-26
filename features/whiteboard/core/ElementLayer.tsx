/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Edit3, Play, MousePointer2 } from 'lucide-react';
// import { TextFormatToolbar } from './TextFormatToolbar'; // Temporarily commented out
// import { InputDialog } from './InputDialog'; // Temporarily commented out
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WhiteboardElement } from '../types';

interface ElementLayerProps {
    sessionId: string;
    currentPage: number;
    isTeacher: boolean;
    isAllowedToWrite?: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    selectedElement: string | null;
    onSelect: (id: string | null) => void;
    userName: string;
    collectionName?: string;
}

export default function ElementLayer({
    sessionId,
    currentPage,
    isTeacher,
    isAllowedToWrite = false,
    containerRef,
    selectedElement,
    onSelect,
    userName,
    collectionName = 'whiteboard_sessions'
}: ElementLayerProps) {
    const [elements, setElements] = useState<WhiteboardElement[]>([]);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);

    // Interactive Mode
    const [interactingElement, setInteractingElement] = useState<string | null>(null);

    // Refs
    const initialElementRef = useRef<WhiteboardElement | null>(null);
    const initialPointerPos = useRef({ x: 0, y: 0 });

    const [editingElement, setEditingElement] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    useEffect(() => {
        if (!sessionId) return;
        const q = query(collection(db, collectionName, sessionId, 'pages', String(currentPage), 'elements'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newElements: WhiteboardElement[] = [];
            snapshot.forEach((doc) => {
                newElements.push({ id: doc.id, ...doc.data() } as WhiteboardElement);
            });
            newElements.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
            setElements(newElements);
        });
        return () => unsubscribe();
    }, [sessionId, currentPage, collectionName]);

    // Clear interacting state when deselected
    useEffect(() => {
        if (!selectedElement) {
            setInteractingElement(null);
        }
    }, [selectedElement]);

    const handlePointerDown = (e: React.PointerEvent, elementId: string, handle?: string) => {
        const canInteract = isTeacher || isAllowedToWrite;
        if (!canInteract) return;

        if (interactingElement === elementId) return;
        if (!containerRef.current) return;

        e.stopPropagation();

        const target = e.target as HTMLElement;
        const isInput = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName) || target.isContentEditable;

        if (!isInput) {
            e.preventDefault();
            (e.target as Element).setPointerCapture(e.pointerId);
        } else {
            return;
        }

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        onSelect(elementId);
        initialPointerPos.current = { x: e.clientX, y: e.clientY };
        initialElementRef.current = { ...element };

        const rect = containerRef.current.getBoundingClientRect();

        if (handle) {
            if (!isTeacher) return;
            setIsResizing(true);
            setResizeHandle(handle);
        } else {
            if (!isTeacher) return;

            const elLeftPx = (element.x / 100) * rect.width;
            const elTopPx = (element.y / 100) * rect.height;
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            setDragOffset({
                x: mouseX - elLeftPx,
                y: mouseY - elTopPx
            });
            setIsDragging(true);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!containerRef.current || !selectedElement || !initialElementRef.current) return;
        if (!isDragging && !isResizing) return;

        e.stopPropagation();
        const rect = containerRef.current.getBoundingClientRect();

        // 1. DRAGGING
        if (isDragging) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const newLeftPx = mouseX - dragOffset.x;
            const newTopPx = mouseY - dragOffset.y;

            let newX = (newLeftPx / rect.width) * 100;
            let newY = (newTopPx / rect.height) * 100;

            newX = Math.max(0, Math.min(100 - (initialElementRef.current.width), newX));
            newY = Math.max(0, Math.min(100 - (initialElementRef.current.height), newY));

            setElements(prev => prev.map(el =>
                el.id === selectedElement ? { ...el, x: newX, y: newY } : el
            ));
        }

        // 2. RESIZING
        if (isResizing && resizeHandle) {
            const deltaXPx = e.clientX - initialPointerPos.current.x;
            const deltaYPx = e.clientY - initialPointerPos.current.y;

            const deltaXPerc = (deltaXPx / rect.width) * 100;
            const deltaYPerc = (deltaYPx / rect.height) * 100;

            const base = initialElementRef.current;
            let newX = base.x;
            let newY = base.y;
            let newW = base.width;
            let newH = base.height;
            const aspectRatio = base.width / base.height;

            if (resizeHandle.includes('e')) {
                newW = Math.max(5, base.width + deltaXPerc);
            }
            if (resizeHandle.includes('s')) {
                newH = Math.max(5, base.height + deltaYPerc);
            }
            if (resizeHandle.includes('w')) {
                const proposedW = base.width - deltaXPerc;
                if (proposedW >= 5) {
                    newW = proposedW;
                    newX = base.x + deltaXPerc;
                }
            }
            if (resizeHandle.includes('n')) {
                const proposedH = base.height - deltaYPerc;
                if (proposedH >= 5) {
                    newH = proposedH;
                    newY = base.y + deltaYPerc;
                }
            }

            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(resizeHandle);
            const shouldLock = base.type !== 'text' && isCorner;

            if (shouldLock) {
                if (resizeHandle === 'se' || resizeHandle === 'sw' || resizeHandle === 'ne' || resizeHandle === 'nw') {
                    newH = newW / aspectRatio;
                }
            }

            setElements(prev => prev.map(el =>
                el.id === selectedElement
                    ? { ...el, x: newX, y: newY, width: newW, height: newH }
                    : el
            ));
        }
    };

    const handlePointerUp = async (e: React.PointerEvent) => {
        const canInteract = isTeacher || isAllowedToWrite;
        if (!canInteract) return;

        try {
            (e.target as Element).releasePointerCapture(e.pointerId);
        } catch { }

        if ((isDragging || isResizing) && selectedElement) {
            const element = elements.find(el => el.id === selectedElement);
            if (element) {
                const elementRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', selectedElement);
                await updateDoc(elementRef, {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height
                });
            }
        }

        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
        initialElementRef.current = null;
    };


    const handleDelete = async (elementId: string) => {
        if (!isTeacher) return;
        const elementRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', elementId);
        try {
            await deleteDoc(elementRef);
            onSelect(null);
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    const toggleInteraction = (elementId: string) => {
        if (interactingElement === elementId) {
            setInteractingElement(null);
        } else {
            setInteractingElement(elementId);
        }
    };

    // Helper: Update element wrapper (Passed to widgets)
    const updateElement = async (id: string, data: Partial<WhiteboardElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...data } : el));
        const elementRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', id);
        await updateDoc(elementRef, data);
    };


    return (
        <div className="absolute inset-0 pointer-events-none z-10 w-full h-full">
            {elements.map((element) => {
                const isSelected = selectedElement === element.id;
                const isInteracting = interactingElement === element.id ||
                    ['playing', 'racing', 'showing_answer', 'finished'].includes(element.gameStatus);

                // DYNAMIC WIDGET LOADING
                const WidgetComponent = WIDGET_REGISTRY[element.type]?.component;

                // If no widget found (maybe legacy types or unimplemented), fallback?
                // For now, let's just handle Text/Image/Video directly if we haven't extracted them yet, 
                // OR better, we extract them right now. 
                // Since I haven't extracted them yet, I'll temporarily keep the legacy hardcoded rendering for basic types
                // AND check the registry.

                return (
                    <div
                        key={element.id}
                        className={`absolute 
                            ${!isInteracting ? 'touch-none select-none' : ''} 
                            ${isSelected ? 'ring-2 ring-blue-500' : ''}
                            ${isInteracting ? 'pointer-events-none z-50' : 'pointer-events-auto'}
                        `}
                        style={{
                            left: `${element.x}%`,
                            top: `${element.y}%`,
                            width: `${element.width}%`,
                            height: `${element.height}%`,
                            cursor: isTeacher ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        }}
                        onPointerDown={(e) => handlePointerDown(e, element.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        {/* 1. REGISTRY WIDGETS */}
                        {WidgetComponent && (
                            <div className="w-full h-full relative pointer-events-auto">
                                <WidgetComponent
                                    element={element}
                                    isTeacher={isTeacher}
                                    updateElement={updateElement} // Pass updater
                                    sessionId={sessionId}
                                    currentPage={currentPage}
                                    userName={userName}
                                    collectionName={collectionName}
                                />
                                {(!isInteracting && element.type !== 'measurement_objects') && (
                                    <div className="absolute inset-0 bg-transparent z-10" />
                                )}
                            </div>
                        )}

                        {/* 2. LEGACY FALLBACKS (Will be moved to widgets later) */}
                        {/* Text */}
                        {!WidgetComponent && element.type === 'text' && (
                            <div className="w-full h-full flex items-center justify-center overflow-hidden p-2 select-none"
                                style={{
                                    fontFamily: element.style?.fontFamily || 'Inter',
                                    fontSize: element.style?.fontSize || 16,
                                    color: element.style?.color || '#000000',
                                    fontWeight: element.style?.bold ? 'bold' : 'normal',
                                    fontStyle: element.style?.italic ? 'italic' : 'normal',
                                    textDecoration: element.style?.underline ? 'underline' : 'none',
                                    textAlign: element.style?.textAlign || 'center',
                                }}>
                                {element.content}
                            </div>
                        )}
                        {/* Image */}
                        {!WidgetComponent && element.type === 'image' && element.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={element.url} alt="Element" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                        )}
                        {/* Video */}
                        {!WidgetComponent && element.type === 'video' && element.url && (
                            <div className="w-full h-full relative pointer-events-auto">
                                <iframe
                                    src={element.url}
                                    className={`w-full h-full ${isInteracting ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                                {!isInteracting && <div className="absolute inset-0 bg-transparent z-10" />}
                            </div>
                        )}


                        {/* CONTROLS */}
                        {isSelected && !isInteracting && (
                            <>
                                {/* Interaction Toggle Button */}
                                {(WidgetComponent || element.type === 'video' || element.type === 'iframe') && (
                                    <button
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 z-50 shadow-md pointer-events-auto"
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            toggleInteraction(element.id);
                                        }}
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                    </button>
                                )}

                                {/* Delete Button */}
                                {isTeacher && (
                                    <button
                                        className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-50 shadow-md border-2 border-white pointer-events-auto"
                                        onPointerDown={(e) => { e.stopPropagation(); handleDelete(element.id); }}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}

                                {/* Resize Handles */}
                                {isTeacher && ['nw', 'ne', 'sw', 'se'].map((handle) => (
                                    <div
                                        key={handle}
                                        className={`absolute w-3 h-3 bg-white border border-blue-500 z-30 resize-handle pointer-events-auto cursor-${handle}-resize
                                            ${handle === 'nw' ? '-top-1.5 -left-1.5' : ''}
                                            ${handle === 'ne' ? '-top-1.5 -right-1.5' : ''}
                                            ${handle === 'sw' ? '-bottom-1.5 -left-1.5' : ''}
                                            ${handle === 'se' ? '-bottom-1.5 -right-1.5' : ''}
                                        `}
                                        onPointerDown={(e) => handlePointerDown(e, element.id, handle)}
                                    />
                                ))}
                            </>
                        )}

                        {/* Return to Edit Mode Button */}
                        {isSelected && isInteracting && (
                            <button
                                className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white rounded-full flex items-center gap-2 hover:bg-blue-700 z-50 shadow-md text-sm font-medium pointer-events-auto"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    toggleInteraction(element.id);
                                }}
                            >
                                <MousePointer2 className="w-4 h-4" />
                                Хөдөлгөх горим
                            </button>
                        )}

                    </div>
                );
            })}
        </div >
    );
}

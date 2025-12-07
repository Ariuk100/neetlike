'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Edit3, Play, MousePointer2 } from 'lucide-react';
import TextFormatToolbar, { TextStyle } from './TextFormatToolbar';
import InputDialog from './InputDialog';
import PhotonRaceGame from './PhotonRaceGame';
import QuizGame from './QuizGame';

export interface WhiteboardElement {
    id: string;
    type: 'image' | 'text' | 'video' | 'iframe' | 'photon_game' | 'quiz_game';
    x: number;      // Percentage (0-100)
    y: number;      // Percentage (0-100)
    width: number;  // Percentage (0-100)
    height: number; // Percentage (0-100)
    url?: string;   // For images/videos
    content?: string; // For text
    style?: {
        fontFamily?: string;
        fontSize?: number;
        color?: string;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;  // NEW
        textAlign?: 'left' | 'center' | 'right';
    };
    animation?: string;
    animationDuration?: number;
    createdAt: string;
    createdBy?: string;
}

interface ElementLayerProps {
    sessionId: string;
    currentPage: number;
    isTeacher: boolean;
    isAllowedToWrite?: boolean; // NEW
    containerRef: React.RefObject<HTMLDivElement | null>;
    selectedElement: string | null;
    onSelect: (id: string | null) => void;
    userName: string;
}

export default function ElementLayer({ sessionId, currentPage, isTeacher, isAllowedToWrite = false, containerRef, selectedElement, onSelect, userName }: ElementLayerProps) {
    const [elements, setElements] = useState<WhiteboardElement[]>([]);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);

    // NEW: Interactive Mode (for Videos)
    const [interactingElement, setInteractingElement] = useState<string | null>(null);

    // Refs for precision calculation (avoids state lag)
    const initialElementRef = useRef<WhiteboardElement | null>(null);
    const initialPointerPos = useRef({ x: 0, y: 0 });

    const [editingElement, setEditingElement] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Sync elements
    useEffect(() => {
        if (!sessionId) return;
        const q = query(collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newElements: WhiteboardElement[] = [];
            snapshot.forEach((doc) => {
                newElements.push({ id: doc.id, ...doc.data() } as WhiteboardElement);
            });
            newElements.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            setElements(newElements);
        });
        return () => unsubscribe();
    }, [sessionId, currentPage]);

    // Clear interacting state when deselected
    useEffect(() => {
        if (!selectedElement) {
            setInteractingElement(null);
        }
    }, [selectedElement]);

    // ---- Interaction Logic (Pointer Events for Precision) ----

    const handlePointerDown = (e: React.PointerEvent, elementId: string, handle?: string) => {
        // PERMISSION: Teacher OR Student with Write Access can select.
        // However, we might restrict Drag/Resize to Teacher only for now?
        // User requested: "Students can use sim separate".
        // Let's allow Selection for everyone (if allowed), but guard Drag/Resize.
        const canInteract = isTeacher || isAllowedToWrite;
        if (!canInteract) return;

        // If in "Interact Mode", do NOT start drag/resize for this element
        if (interactingElement === elementId) return;

        if (!containerRef.current) return;

        e.stopPropagation(); // Prevent canvas drawing
        e.preventDefault();  // Prevent text selection/scrolling

        // Capture pointer to ensure we get events even if cursor goes outside
        (e.target as Element).setPointerCapture(e.pointerId);

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        onSelect(elementId);
        initialPointerPos.current = { x: e.clientX, y: e.clientY };
        initialElementRef.current = { ...element };

        const rect = containerRef.current.getBoundingClientRect();

        if (handle) {
            // Start Resizing - TEACHER ONLY
            if (!isTeacher) return;
            setIsResizing(true);
            setResizeHandle(handle);
        } else {
            // Start Dragging - TEACHER ONLY (for now, to avoid students breaking layout)
            // Or allow students to move items? Usually dangerous. Let's keep layout to teacher.
            if (!isTeacher) {
                // If student clicks, just select (for showing controls like Play), but don't drag
                return;
            }

            // Calculate exact offset from element top-left
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

        // Only process if we are actively interacting
        if (!isDragging && !isResizing) return;

        e.stopPropagation();
        const rect = containerRef.current.getBoundingClientRect();

        // 1. DRAGGING
        if (isDragging) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Raw pixel position
            const newLeftPx = mouseX - dragOffset.x;
            const newTopPx = mouseY - dragOffset.y;

            // Convert to Percentage
            let newX = (newLeftPx / rect.width) * 100;
            let newY = (newTopPx / rect.height) * 100;

            // Optional: Clamp to stay inside
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
            const aspectRatio = base.width / base.height; // For images

            if (resizeHandle.includes('e')) {
                newW = Math.max(5, base.width + deltaXPerc);
            }
            if (resizeHandle.includes('s')) {
                newH = Math.max(5, base.height + deltaYPerc);
            }
            if (resizeHandle.includes('w')) {
                // Determine the new width first
                // If moving left, deltaX is negative, width increases
                const proposedW = base.width - deltaXPerc;
                if (proposedW >= 5) {
                    newW = proposedW;
                    newX = base.x + deltaXPerc; // Move start X
                }
            }
            if (resizeHandle.includes('n')) {
                const proposedH = base.height - deltaYPerc;
                if (proposedH >= 5) {
                    newH = proposedH;
                    newY = base.y + deltaYPerc;
                }
            }

            // Aspect Ratio Lock (for non-text and corner handles)
            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(resizeHandle);
            const shouldLock = base.type !== 'text' && isCorner;

            if (shouldLock) {
                if (resizeHandle === 'se' || resizeHandle === 'sw' || resizeHandle === 'ne' || resizeHandle === 'nw') {
                    // Simple approach: Use Width to drive Height
                    // Refinements can be added later
                    newH = newW / aspectRatio;

                    // Note: Ideally, if 'n' is involved, we must adjust Y so bottom stays fixed.
                    // This simple logic might drift slightly if top-left is anchor.
                    // Let's rely on standard resize for now.
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
        // Release capture usually
        const canInteract = isTeacher || isAllowedToWrite;
        if (!canInteract) return;

        // Release capture
        try {
            (e.target as Element).releasePointerCapture(e.pointerId);
        } catch {
            // Ignore if element lost
        }

        if ((isDragging || isResizing) && selectedElement) {
            const element = elements.find(el => el.id === selectedElement);
            if (element) {
                // Persist to Firebase
                const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', selectedElement);
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
        const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', elementId);
        try {
            await deleteDoc(elementRef);
            onSelect(null);
        } catch (e) {
            console.error("Delete failed", e);
        }
    };

    // Toggle between "Move/Edit" (default) and "Interact/Play" (video)
    const toggleInteraction = (elementId: string) => {
        if (interactingElement === elementId) {
            setInteractingElement(null); // Go to Edit mode
        } else {
            setInteractingElement(elementId); // Go to Interact mode
        }
    };


    // ... Keep Helper Functions (getAnimationClass, Text styles etc) ...
    const getAnimationClass = (animation?: string) => {
        switch (animation) {
            case 'fadeIn': return 'animate-fade-in';
            case 'slideLeft': return 'animate-slide-left';
            case 'slideRight': return 'animate-slide-right';
            case 'slideUp': return 'animate-slide-up';
            case 'slideDown': return 'animate-slide-down';
            case 'bounce': return 'animate-bounce';
            case 'zoomIn': return 'animate-zoom-in';
            default: return '';
        }
    };
    const handleStyleChange = async (elementId: string, styleUpdate: Partial<TextStyle>) => {
        const element = elements.find(el => el.id === elementId);
        if (!element) return;
        const newStyle = { ...element.style, ...styleUpdate };
        setElements(prev => prev.map(el => el.id === elementId ? { ...el, style: newStyle } : el));
        const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', elementId);
        await updateDoc(elementRef, { style: newStyle });
    };
    const handleAnimationChange = async (elementId: string, animation: string) => {
        setElements(prev => prev.map(el => el.id === elementId ? { ...el, animation: animation === 'none' ? undefined : animation } : el));
        const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', elementId);
        await updateDoc(elementRef, { animation: animation === 'none' ? null : animation });
    };
    const handleTextContentUpdate = async (newContent: string) => {
        if (!editingElement) return;
        setElements(prev => prev.map(el => el.id === editingElement ? { ...el, content: newContent } : el));
        const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', editingElement);
        await updateDoc(elementRef, { content: newContent });
        setEditingElement(null);
    };
    const openEditDialog = (elementId: string) => {
        setEditingElement(elementId);
        setEditDialogOpen(true);
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {elements.map((element) => {
                const isSelected = selectedElement === element.id && (isTeacher || isAllowedToWrite);
                const isInteracting = interactingElement === element.id;

                return (
                    <div
                        key={element.id}
                        className={`absolute 
                            ${element.type !== 'quiz_game' ? 'touch-none select-none' : ''} 
                            ${getAnimationClass(element.animation)} 
                            ${isSelected ? 'ring-2 ring-blue-500' : ''}
                            ${isInteracting ? 'pointer-events-none z-50' : 'pointer-events-auto'}
                        `}
                        style={{
                            left: `${element.x}%`,
                            top: `${element.y}%`,
                            width: `${element.width}%`,
                            height: `${element.height}%`,
                            cursor: isTeacher ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            animationDuration: element.animationDuration ? `${element.animationDuration}ms` : '500ms'
                        }}
                        onPointerDown={(e) => handlePointerDown(e, element.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        {/* Content */}
                        {element.type === 'image' && element.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={element.url} alt="Element" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
                        )}
                        {element.type === 'text' && (
                            <div
                                className="w-full h-full flex items-center justify-center overflow-hidden p-2 select-none"
                                style={{
                                    fontFamily: element.style?.fontFamily || 'Inter',
                                    fontSize: element.style?.fontSize || 16,
                                    color: element.style?.color || '#000000',
                                    fontWeight: element.style?.bold ? 'bold' : 'normal',
                                    fontStyle: element.style?.italic ? 'italic' : 'normal',
                                    textDecoration: element.style?.underline ? 'underline' : 'none',
                                    textAlign: element.style?.textAlign || 'center',
                                }}
                            >
                                {element.content}
                            </div>
                        )}
                        {/* Generic Iframe/Simulation - Reusing video interaction logic */}
                        {element.type === 'iframe' && element.url && (
                            <div className="w-full h-full relative pointer-events-auto">
                                <iframe
                                    src={element.url}
                                    className={`w-full h-full border-none ${isInteracting ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    allowFullScreen
                                />
                                {!isInteracting && (
                                    <div className="absolute inset-0 bg-transparent z-10" />
                                )}
                            </div>
                        )}

                        {element.type === 'video' && element.url && (
                            <div className="w-full h-full relative pointer-events-auto">
                                {/* Video Iframe */}
                                <iframe
                                    src={element.url}
                                    className={`w-full h-full ${isInteracting ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                                {/* Overlay for dragging - only present when NOT interacting */}
                                {!isInteracting && (
                                    <div className="absolute inset-0 bg-transparent z-10" />
                                )}
                            </div>
                        )}

                        {element.type === 'photon_game' && (
                            <div className="w-full h-full relative pointer-events-auto">
                                <PhotonRaceGame
                                    isTeacher={isTeacher}
                                    isAllowedDraw={isAllowedToWrite || isTeacher}
                                    element={element}
                                    sessionId={sessionId}
                                    currentPage={currentPage}
                                    userName={userName}
                                />
                                {!isInteracting && (
                                    <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" />
                                )}
                            </div>
                        )}

                        {element.type === 'quiz_game' && (
                            <div className="w-full h-full relative pointer-events-auto">
                                <QuizGame
                                    isTeacher={isTeacher}
                                    isAllowedDraw={isAllowedToWrite || isTeacher}
                                    element={element}
                                    sessionId={sessionId}
                                    currentPage={currentPage}
                                    userName={userName}
                                />
                            </div>
                        )}

                        {/* Teacher Controls - Only when selected */}
                        {isSelected && !isInteracting && (
                            <>
                                {/* Text Toolbar */}
                                {element.type === 'text' && (
                                    <TextFormatToolbar
                                        style={{
                                            fontFamily: element.style?.fontFamily || 'Inter',
                                            fontSize: element.style?.fontSize || 24,
                                            color: element.style?.color || '#000000',
                                            bold: element.style?.bold || false,
                                            italic: element.style?.italic || false,
                                            underline: element.style?.underline || false,
                                            textAlign: element.style?.textAlign || 'center'
                                        }}
                                        animation={element.animation || 'none'}
                                        onStyleChange={(styleUpdate) => handleStyleChange(element.id, styleUpdate)}
                                        onAnimationChange={(animation) => handleAnimationChange(element.id, animation)}
                                    />
                                )}

                                {/* NEW: Video/Iframe Interaction Toggle */}
                                {(element.type === 'video' || element.type === 'iframe') && (
                                    <button
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 z-50 shadow-md pointer-events-auto"
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            toggleInteraction(element.id);
                                        }}
                                        title={element.type === 'iframe' ? "Ашиглах / Удирдах" : "Тоглуулах / Удирдах"}
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                    </button>
                                )}

                                {/* Delete button - Enhanced (Teacher Only) */}
                                {isTeacher && (
                                    <button
                                        className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-50 shadow-md border-2 border-white pointer-events-auto"
                                        onPointerDown={(e) => { e.stopPropagation(); handleDelete(element.id); }}
                                        title="Устгах"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}

                                {element.type === 'text' && isTeacher && (
                                    <button
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 z-30 shadow-sm pointer-events-auto"
                                        onPointerDown={(e) => { e.stopPropagation(); openEditDialog(element.id); }}
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Resize Handles (Teacher Only) */}
                                {isTeacher && ['nw', 'ne', 'sw', 'se'].map((handle) => (
                                    <div
                                        key={handle}
                                        className={`absolute w-3 h-3 bg-white border border-blue-500 z-30 resize-handle pointer-events-auto
                                            ${handle === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                                            ${handle === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : ''}
                                            ${handle === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                                            ${handle === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                                        `}
                                        onPointerDown={(e) => handlePointerDown(e, element.id, handle)}
                                    />
                                ))}
                            </>
                        )}

                        {/* Interacting Mode Controls (Minimal) */}
                        {isSelected && isInteracting && (
                            <button
                                className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white rounded-full flex items-center gap-2 hover:bg-blue-700 z-50 shadow-md text-sm font-medium pointer-events-auto"
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    toggleInteraction(element.id);
                                }}
                            >
                                <MousePointer2 className="w-4 h-4" />
                                Хөдөлгөх горим руу буцах
                            </button>
                        )}

                    </div>
                );
            })}

            <InputDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                title="Текст засах"
                placeholder="Текст..."
                defaultValue={elements.find(el => el.id === editingElement)?.content || ''}
                multiline
                onSubmit={handleTextContentUpdate}
            />
        </div>
    );
}

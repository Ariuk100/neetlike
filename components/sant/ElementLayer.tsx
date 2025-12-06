'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { X, Move, Edit3 } from 'lucide-react';
import TextFormatToolbar, { TextStyle } from './TextFormatToolbar';
import InputDialog from './InputDialog';

export interface WhiteboardElement {
    id: string;
    type: 'image' | 'text' | 'video';
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
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function ElementLayer({ sessionId, currentPage, isTeacher, containerRef }: ElementLayerProps) {
    const [elements, setElements] = useState<WhiteboardElement[]>([]);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const initialSize = useRef({ width: 0, height: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    // NEW: Text edit dialog state
    const [editingElement, setEditingElement] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Sync elements from Firebase
    useEffect(() => {
        if (!sessionId) return;

        const q = query(
            collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newElements: WhiteboardElement[] = [];
            snapshot.forEach((doc) => {
                newElements.push({ id: doc.id, ...doc.data() } as WhiteboardElement);
            });
            // Sort by creation time
            newElements.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            setElements(newElements);
        });

        return () => unsubscribe();
    }, [sessionId, currentPage]);

    const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
        if (!isTeacher) return;
        e.stopPropagation();
        setSelectedElement(elementId);

        const element = elements.find(el => el.id === elementId);
        if (!element || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - (element.x / 100 * rect.width),
            y: e.clientY - (element.y / 100 * rect.height)
        });
        setIsDragging(true);
    };

    const handleMouseMove = async (e: React.MouseEvent) => {
        if (!isDragging || !selectedElement || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = ((e.clientX - dragOffset.x) / rect.width) * 100;
        const newY = ((e.clientY - dragOffset.y) / rect.height) * 100;

        // Clamp to container bounds
        const clampedX = Math.max(0, Math.min(100, newX));
        const clampedY = Math.max(0, Math.min(100, newY));

        // Update local state for smooth dragging
        setElements(prev => prev.map(el =>
            el.id === selectedElement
                ? { ...el, x: clampedX, y: clampedY }
                : el
        ));
    };

    const handleMouseUp = async () => {
        if (isDragging && selectedElement) {
            const element = elements.find(el => el.id === selectedElement);
            if (element) {
                // Save to Firebase
                const elementRef = doc(
                    db,
                    'whiteboard_sessions',
                    sessionId,
                    'pages',
                    String(currentPage),
                    'elements',
                    selectedElement
                );
                await updateDoc(elementRef, {
                    x: element.x,
                    y: element.y
                });
            }
        }
        setIsDragging(false);
        setIsResizing(false);
    };

    const handleDelete = async (elementId: string) => {
        if (!isTeacher) return;

        const elementRef = doc(
            db,
            'whiteboard_sessions',
            sessionId,
            'pages',
            String(currentPage),
            'elements',
            elementId
        );
        await deleteDoc(elementRef);
        setSelectedElement(null);
    };

    const handleResizeStart = (e: React.MouseEvent, elementId: string) => {
        if (!isTeacher) return;
        e.stopPropagation();

        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        setSelectedElement(elementId);
        setIsResizing(true);
        initialSize.current = { width: element.width, height: element.height };
        initialPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleResizeMove = async (e: React.MouseEvent) => {
        if (!isResizing || !selectedElement || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = ((e.clientX - initialPos.current.x) / rect.width) * 100;
        const deltaY = ((e.clientY - initialPos.current.y) / rect.height) * 100;

        const newWidth = Math.max(5, initialSize.current.width + deltaX);
        const newHeight = Math.max(5, initialSize.current.height + deltaY);

        setElements(prev => prev.map(el =>
            el.id === selectedElement
                ? { ...el, width: newWidth, height: newHeight }
                : el
        ));
    };

    const handleResizeEnd = async () => {
        if (isResizing && selectedElement) {
            const element = elements.find(el => el.id === selectedElement);
            if (element) {
                const elementRef = doc(
                    db,
                    'whiteboard_sessions',
                    sessionId,
                    'pages',
                    String(currentPage),
                    'elements',
                    selectedElement
                );
                await updateDoc(elementRef, {
                    width: element.width,
                    height: element.height
                });
            }
        }
        setIsResizing(false);
    };

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

    // NEW: Handle style change for text elements
    const handleStyleChange = async (elementId: string, styleUpdate: Partial<TextStyle>) => {
        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        const newStyle = { ...element.style, ...styleUpdate };

        // Update local state
        setElements(prev => prev.map(el =>
            el.id === elementId
                ? { ...el, style: newStyle }
                : el
        ));

        // Save to Firebase
        const elementRef = doc(
            db,
            'whiteboard_sessions',
            sessionId,
            'pages',
            String(currentPage),
            'elements',
            elementId
        );
        await updateDoc(elementRef, { style: newStyle });
    };

    // NEW: Handle animation change
    const handleAnimationChange = async (elementId: string, animation: string) => {
        // Update local state
        setElements(prev => prev.map(el =>
            el.id === elementId
                ? { ...el, animation: animation === 'none' ? undefined : animation }
                : el
        ));

        // Save to Firebase
        const elementRef = doc(
            db,
            'whiteboard_sessions',
            sessionId,
            'pages',
            String(currentPage),
            'elements',
            elementId
        );
        await updateDoc(elementRef, {
            animation: animation === 'none' ? null : animation
        });
    };

    // NEW: Handle text content update
    const handleTextContentUpdate = async (newContent: string) => {
        if (!editingElement) return;

        // Update local state
        setElements(prev => prev.map(el =>
            el.id === editingElement
                ? { ...el, content: newContent }
                : el
        ));

        // Save to Firebase
        const elementRef = doc(
            db,
            'whiteboard_sessions',
            sessionId,
            'pages',
            String(currentPage),
            'elements',
            editingElement
        );
        await updateDoc(elementRef, { content: newContent });

        setEditingElement(null);
    };

    // NEW: Open edit dialog for text element
    const openEditDialog = (elementId: string) => {
        setEditingElement(elementId);
        setEditDialogOpen(true);
    };

    return (
        <div
            className="absolute inset-0 pointer-events-none z-10"
            onMouseMove={(e) => {
                if (isDragging) handleMouseMove(e);
                if (isResizing) handleResizeMove(e);
            }}
            onMouseUp={() => {
                handleMouseUp();
                handleResizeEnd();
            }}
            onMouseLeave={() => {
                handleMouseUp();
                handleResizeEnd();
            }}
        >
            {elements.map((element) => (
                <div
                    key={element.id}
                    className={`absolute pointer-events-auto ${getAnimationClass(element.animation)} ${selectedElement === element.id && isTeacher ? 'ring-2 ring-blue-500' : ''
                        }`}
                    style={{
                        left: `${element.x}%`,
                        top: `${element.y}%`,
                        width: `${element.width}%`,
                        height: `${element.height}%`,
                        cursor: isTeacher ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        animationDuration: element.animationDuration ? `${element.animationDuration}ms` : '500ms'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isTeacher) setSelectedElement(element.id);
                    }}
                >
                    {/* Image Element */}
                    {element.type === 'image' && element.url && (
                        <img
                            src={element.url}
                            alt="Whiteboard element"
                            className="w-full h-full object-contain"
                            draggable={false}
                        />
                    )}

                    {/* Text Element */}
                    {element.type === 'text' && (
                        <div
                            className="w-full h-full flex items-center justify-center overflow-hidden p-2"
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

                    {/* Video Element (YouTube embed) */}
                    {element.type === 'video' && element.url && (
                        <iframe
                            src={element.url}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    )}

                    {/* Control handles for teacher */}
                    {isTeacher && selectedElement === element.id && (
                        <>
                            {/* Text Format Toolbar - only for text elements */}
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

                            {/* Delete button */}
                            <button
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(element.id);
                                }}
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {/* Edit button for text elements */}
                            {element.type === 'text' && (
                                <button
                                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 z-20"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(element.id);
                                    }}
                                    title="Текст засах"
                                >
                                    <Edit3 className="w-3 h-3" />
                                </button>
                            )}

                            {/* Resize handle */}
                            <div
                                className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize z-20 flex items-center justify-center"
                                onMouseDown={(e) => handleResizeStart(e, element.id)}
                            >
                                <Move className="w-2 h-2 text-white" />
                            </div>
                        </>
                    )}
                </div>
            ))}

            {/* Text Edit Dialog */}
            <InputDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                title="Текст засах"
                placeholder="Текст оруулна уу..."
                defaultValue={elements.find(el => el.id === editingElement)?.content || ''}
                multiline
                onSubmit={handleTextContentUpdate}
            />
        </div>
    );
}

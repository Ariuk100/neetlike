'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, writeBatch, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Trash2, Eraser, Pen, Lock, Unlock, ChevronLeft, ChevronRight, Plus, ImageIcon, Type, Video, MousePointer, FolderOpen, FileUp, Globe, FileMinus, Target } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from 'sonner';
import ElementLayer, { WhiteboardElement } from './ElementLayer';
import InputDialog from './InputDialog';
import SaveLessonDialog from './SaveLessonDialog';
import LoadLessonDialog from './LoadLessonDialog';
import { uploadWhiteboardImage, generateElementId } from '@/lib/whiteboardStorage';
import { saveSessionAsTemplate, loadTemplateToSession, clearSessionContent, LessonTemplate } from '@/lib/lessonHelpers';

const COLORS = [
    '#000000', // Black
    '#DC2626', // Red
    '#2563EB', // Blue
    '#16A34A', // Green
    '#CA8A04', // Yellow/Gold
    '#EA580C', // Orange
    '#9333EA', // Purple
    '#DB2777', // Pink
    '#0F766E', // Teal
    '#4B5563', // Gray
];

interface Point {
    x: number;
    y: number;
}

interface DrawPath {
    id?: string;
    points: Point[];
    color: string;
    width: number;
    type: 'pen' | 'eraser';
    createdAt: string;
    createdBy?: string;
}

interface WhiteboardCanvasProps {
    sessionId: string;
    isTeacher: boolean;
    isAllowedToWrite?: boolean;
    userName?: string;
    currentPage: number;
    totalPages: number;
    onAddPage?: () => void;
    onDeletePage?: () => void;
    onNavigatePage?: (delta: number) => void;
}

interface CursorData {
    x: number;
    y: number;
    userName: string;
    color: string;
    type?: 'default' | 'laser';
    isTeacher?: boolean;
    lastUpdated: string;
}

// Simple throttle utility to avoid dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simpleThrottle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
    let lastFunc: ReturnType<typeof setTimeout>;
    let lastRan: number;
    return function (...args: Parameters<T>) {
        if (!lastRan) {
            func(...args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func(...args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

export default function WhiteboardCanvas({
    sessionId,
    isTeacher,
    isAllowedToWrite = true,
    userName = 'Guest',
    currentPage,
    totalPages,
    onAddPage,
    onDeletePage,
    onNavigatePage
}: WhiteboardCanvasProps) {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentPath = useRef<Point[]>([]);
    const context = useRef<CanvasRenderingContext2D | null>(null);

    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(2);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'cursor' | 'laser'>('cursor');
    const [paths, setPaths] = useState<DrawPath[]>([]);
    const [cursors, setCursors] = useState<Record<string, CursorData>>({});
    const [canDraw, setCanDraw] = useState(isAllowedToWrite);
    const [isUploading, setIsUploading] = useState(false);
    // Local mouse position for rendering "own" laser
    const [localMousePos, setLocalMousePos] = useState<{ x: number, y: number } | null>(null);

    // Dialogs
    const [textDialogOpen, setTextDialogOpen] = useState(false);
    const [videoDialogOpen, setVideoDialogOpen] = useState(false);
    const [iframeDialogOpen, setIframeDialogOpen] = useState(false);
    const [saveLessonOpen, setSaveLessonOpen] = useState(false);
    const [loadLessonOpen, setLoadLessonOpen] = useState(false);
    const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false);

    const [selectedElement, setSelectedElement] = useState<string | null>(null);

    // Initialize canvas context
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            context.current = canvas.getContext('2d');
            const ctx = context.current;
            if (ctx) {
                // Set initial canvas properties
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, []);

    // Resize canvas to fill container
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (canvas && container) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;
            canvas.style.width = `${container.clientWidth}px`;
            canvas.style.height = `${container.clientHeight}px`;
            if (context.current) {
                context.current.scale(dpr, dpr);
                // Redraw all paths after resize
                redrawAllPaths(paths);
            }
        }
    }, [paths]);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [resizeCanvas]);

    // Update canDraw state when isAllowedToWrite changes
    useEffect(() => {
        setCanDraw(isAllowedToWrite);
    }, [isAllowedToWrite]);

    // Sync paths from Firebase
    useEffect(() => {
        if (!sessionId) return;
        const q = query(
            collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'paths'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newPaths: DrawPath[] = [];
            snapshot.forEach((doc) => {
                newPaths.push({ id: doc.id, ...doc.data() } as DrawPath);
            });
            setPaths(newPaths);
            // Redrawl logic is handled by the useEffect watching 'paths'
        });
        return () => unsubscribe();
    }, [sessionId, currentPage]);

    // Sync cursors from Firebase
    useEffect(() => {
        if (!sessionId) return;
        // Teacher listens to everyone. Students only need to listen if they need to see Teacher's laser.
        // To save bandwidth, maybe we only query based on need?
        // But for simplicity, let's listen to 'cursors' collection.
        const q = query(collection(db, 'whiteboard_sessions', sessionId, 'cursors'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newCursors: Record<string, CursorData> = {};
            snapshot.forEach((doc) => {
                // Filter out self
                if (doc.id !== userName) {
                    newCursors[doc.id] = doc.data() as CursorData;
                }
            });
            setCursors(newCursors);
        });

        return () => unsubscribe();
    }, [sessionId, userName]);

    // Redraw when paths change
    useEffect(() => {
        redrawAllPaths(paths);
    }, [paths]);


    // Drawing functions
    const startDrawing = (e: React.PointerEvent) => {
        // Deselect when clicking on canvas (background)
        if (isTeacher && selectedElement) {
            setSelectedElement(null);
        }

        const isAllowedToDraw = canDraw || isTeacher;
        if (!isAllowedToDraw || tool === 'cursor' || tool === 'laser') return;

        e.preventDefault(); // Prevent scrolling on touch devices
        (e.target as Element).setPointerCapture(e.pointerId);

        setIsDrawing(true);
        const { offsetX, offsetY } = e.nativeEvent;
        // Normalize coordinates (0-1)
        const container = containerRef.current;
        if (!container) return;

        const normX = offsetX / container.clientWidth;
        const normY = offsetY / container.clientHeight;

        currentPath.current = [{ x: normX, y: normY }];
    };

    const draw = (e: React.PointerEvent) => {
        const isAllowedToDraw = canDraw || isTeacher;
        if (!isDrawing || !isAllowedToDraw || tool === 'cursor') return;

        const { offsetX, offsetY } = e.nativeEvent;
        const container = containerRef.current;
        if (!container) return;

        const normX = offsetX / container.clientWidth;
        const normY = offsetY / container.clientHeight;

        currentPath.current.push({ x: normX, y: normY });

        // Optimistic update for smoother drawing
        const incompletePath: DrawPath = {
            points: currentPath.current,
            color: tool === 'eraser' ? '#FFFFFF' : color,
            width: width,
            type: tool === 'eraser' ? 'eraser' : 'pen',
            createdAt: new Date().toISOString(),
        };
        redrawAllPaths([...paths, incompletePath]);
    };

    const endDrawing = async (e: React.PointerEvent) => {
        const isAllowedToDraw = canDraw || isTeacher;
        if (!isDrawing || !isAllowedToDraw || tool === 'cursor') return;

        (e.target as Element).releasePointerCapture(e.pointerId);

        setIsDrawing(false);
        if (currentPath.current.length > 1) {
            const newPath = {
                points: [...currentPath.current],
                color: tool === 'eraser' ? '#FFFFFF' : color,
                width: width,
                type: tool === 'eraser' ? 'eraser' : 'pen',
                createdAt: new Date().toISOString(),
                createdBy: userName,
            };

            // Save to Firestore
            try {
                await addDoc(collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'paths'), newPath);
            } catch (error) {
                console.error("Error saving path:", error);
            }
        }
        currentPath.current = [];
    };

    const redrawAllPaths = (allPaths: DrawPath[]) => {
        const ctx = context.current;
        const canvas = canvasRef.current;
        const container = containerRef.current;

        if (ctx && canvas && container) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const w = container.clientWidth;
            const h = container.clientHeight;

            allPaths.forEach((path) => {
                ctx.beginPath();
                if (path.points && path.points.length > 0) {
                    // Convert normalized coords to pixels
                    const firstPt = path.points[0];
                    // Handle legacy data (if x > 1, assume pixels, else normalized)
                    const startX = firstPt.x > 1.0 ? firstPt.x : firstPt.x * w;
                    const startY = firstPt.y > 1.0 ? firstPt.y : firstPt.y * h;

                    ctx.moveTo(startX, startY);

                    path.points.forEach((point) => {
                        const px = point.x > 1.0 ? point.x : point.x * w;
                        const py = point.y > 1.0 ? point.y : point.y * h;
                        ctx.lineTo(px, py);
                    });
                }
                ctx.strokeStyle = path.color;
                ctx.lineWidth = path.width;
                ctx.stroke();
            });
        }
    };

    // Cursor handling
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const sendCursorUpdate = useCallback(
        simpleThrottle(async (x: number, y: number) => {
            // Students always broadcast.
            // Teacher only broadcasts if using Laser.
            if (isTeacher && tool !== 'laser') {
                // Option: We could delete the cursor doc if switching away from laser?
                // For now, let's just stop updating. The receiver will check "lastUpdated" or we can explicit delete.
                // Ideally, we delete the doc when tool changes. 
                // But for MVP, let's just allow updating.
                // Actually, if I stop updating, the old cursor position remains "stuck" for students.
                // Let's broadcast "type: default" when not laser, so students can filter it out (hide it).
                // OR we only write if tool == laser.
                // Let's only write if tool == laser. To clear it, we might need a separate effect.
                // Let's just update as "type: default" and filter on client side.
                // Wait, writing to DB every move for teacher (default tool) might be wasteful if no one watches.
                // But students write every move. One teacher writing is fine.
            }
            // Actually, let's write updates regardless, but mark the type.

            try {
                const cursorRef = doc(db, 'whiteboard_sessions', sessionId, 'cursors', userName);
                await setDoc(cursorRef, {
                    x,
                    y,
                    userName,
                    color: tool === 'laser' ? '#ef4444' : color, // Force red for laser
                    type: tool === 'laser' ? 'laser' : 'default',
                    isTeacher,
                    lastUpdated: new Date().toISOString()
                });
            } catch {
                // Ignore errors for cursor updates to avoid spamming console
            }
        }, 50), [sessionId, userName, color, isTeacher, tool]
    );

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDrawing) {
            draw(e);
        }

        const container = containerRef.current;
        if (container) {
            const x = e.nativeEvent.offsetX / container.clientWidth;
            const y = e.nativeEvent.offsetY / container.clientHeight;

            // Track local mouse for Laser rendering
            if (tool === 'laser') {
                setLocalMousePos({ x, y });
            } else if (localMousePos) {
                setLocalMousePos(null);
            }

            sendCursorUpdate(x, y);
        }
    };

    const handlePointerLeave = (e: React.PointerEvent) => {
        if (isDrawing) endDrawing(e);
        setLocalMousePos(null);
    };

    // Toolbar actions
    const handleClearConfirm = async () => {
        // Clear paths from Firestore
        const q = query(collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'paths'));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    };

    const togglePermissions = async () => {
        try {
            const sessionRef = doc(db, 'whiteboard_sessions', sessionId);
            // Updating the exact field name used in page.tsx: isStudentWriteAllowed
            await updateDoc(sessionRef, {
                isStudentWriteAllowed: !isAllowedToWrite
            });
            toast.success(isAllowedToWrite ? 'Сурагчдын эрхийг хаалаа' : 'Сурагчдын эрхийг нээлээ');
        } catch (error) {
            console.error("Error toggling permissions:", error);
            toast.error("Эрх солих үед алдаа гарлаа");
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const imageUrl = await uploadWhiteboardImage(sessionId, currentPage, file);

            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'image',
                x: 35, // Default center position (approx)
                y: 20,
                width: 30,
                height: 30,
                url: imageUrl,
                createdAt: new Date().toISOString(),
                createdBy: userName
            };

            await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);

            toast.success('Зураг амжилттай хуулагдлаа!');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Зураг хуулах үед алдаа гарлаа.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear the input
            }
        }
    };

    const createTextElement = async (text: string) => {
        if (!text.trim()) return;

        try {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'text',
                x: 40,
                y: 40,
                width: 20,
                height: 10,
                content: text,
                style: {
                    fontSize: 24,
                    color: color, // Use current selected color
                    fontFamily: 'Inter',
                    textAlign: 'center'
                },
                createdAt: new Date().toISOString(),
                createdBy: userName
            };

            await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
            setTextDialogOpen(false);
        } catch (error) {
            console.error("Error creating text:", error);
            toast.error("Текст нэмэхэд алдаа гарлаа");
        }
    };

    const createVideoElement = async (url: string) => {
        if (!url.trim()) return;

        let embedUrl = url;
        // Basic YouTube URL parsing
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1]?.split('&')[0];
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1];
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        try {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'video',
                x: 30,
                y: 20,
                width: 40,
                height: 22.5, // 16:9 aspect ratio
                url: embedUrl,
                createdAt: new Date().toISOString(),
                createdBy: userName
            };

            await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
            setVideoDialogOpen(false);
        } catch (error) {
            console.error("Error creating video:", error);
            toast.error("Видео нэмэхэд алдаа гарлаа");
        }
    };

    const createIframeElement = async (url: string) => {
        if (!url.trim()) return;

        try {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'iframe',
                x: 25,
                y: 15,
                width: 50,
                height: 40,
                url: url,
                createdAt: new Date().toISOString(),
                createdBy: userName
            };

            await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
            setIframeDialogOpen(false);
        } catch (error) {
            console.error("Error creating simulation:", error);
            toast.error("Simulation нэмэхэд алдаа гарлаа");
        }
    };



    // ------------------------------------------------------------------
    // NEW: Lesson Prep Handlers
    // ------------------------------------------------------------------
    const handleSaveLesson = async (metadata: { title: string; subject: string; grade: string }) => {
        try {
            await saveSessionAsTemplate(sessionId, { ...metadata, authorName: userName || 'Багш' }, totalPages);
            toast.success('Хичээл амжилттай хадгалагдлаа!');
            // User requested: "Clear board and return to page 1" after save
            await clearSessionContent(sessionId, totalPages);
            toast.info('Самбарыг шинэ хичээлд бэлдэж цэвэрлэлээ.');
        } catch (e) {
            console.error(e);
            toast.error('Хадгалахад алдаа гарлаа.');
        }
    };

    const handleLoadLesson = async (template: LessonTemplate) => {
        if (!confirm(`"${template.title}" хичээлийг ачаалах уу? Одоогийн самбар дээр нэмэгдэх болно.`)) return;
        try {
            await loadTemplateToSession(sessionId, template);
            toast.success('Хичээл ачаалагдлаа!');
        } catch (e) {
            console.error(e);
            toast.error('Ачаалахад алдаа гарлаа.');
        }
    };

    // New logic: Show toolbar for students too (subset of tools)
    const showToolbar = isTeacher || (canDraw);

    return (
        <>
            <div className="flex flex-col items-center justify-center w-full h-full bg-stone-100 gap-4">
                {/* Toolbar - Visible to Teacher AND Students (who are allowed) */}
                {showToolbar && (
                    <div className="flex-none bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 sm:px-6 sm:py-3 flex items-center gap-2 sm:gap-4 border border-stone-200 z-30 max-w-[95%] overflow-x-auto">

                        {/* 1. LESSON CONTROLS (Teacher Only) */}
                        {isTeacher && (
                            <>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setLoadLessonOpen(true)}
                                        className="rounded-full gap-2 text-stone-600 hover:text-stone-900 px-3"
                                        title="Хичээл нээх"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden sm:inline">Нээх</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSaveLessonOpen(true)}
                                        className="rounded-full gap-2 text-stone-600 hover:text-stone-900 px-3"
                                        title="Бэлдэх / Хадгалах"
                                    >
                                        <FileUp className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden sm:inline">Бэлдэх</span>
                                    </Button>



                                    <div className="h-6 w-px bg-stone-200 mx-1" />
                                </div>
                            </>
                        )}

                        {/* 2. DRAWING TOOLS */}
                        <div className="flex gap-2 flex-shrink-0">
                            {/* Cursor Tool */}
                            <Button
                                variant={tool === 'cursor' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('cursor')}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                                title="Сонгох / Хөдөлгөх"
                            >
                                <MousePointer className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>

                            {/* Laser Tool (Teacher Only) */}
                            {isTeacher && (
                                <Button
                                    variant={tool === 'laser' ? 'default' : 'ghost'}
                                    size="icon"
                                    onClick={() => setTool('laser')}
                                    className={`rounded-full w-8 h-8 sm:w-10 sm:h-10 ${tool === 'laser' ? 'bg-red-500 hover:bg-red-600' : 'text-red-500 hover:bg-red-50'}`}
                                    title="Лазер заагч"
                                >
                                    <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                            )}

                            <Button
                                variant={tool === 'pen' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('pen')}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                                title="Үзэг"
                            >
                                <Pen className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                                variant={tool === 'eraser' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('eraser')}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                                title="Баллуур"
                            >
                                <Eraser className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                        </div>

                        <div className="h-6 w-px bg-stone-200 flex-shrink-0" />

                        <div className="flex items-center gap-2 w-24 sm:w-32 flex-shrink-0">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-8 h-8 rounded-full p-0 border-2 shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: color, borderColor: '#e7e5e4' }}
                                    />
                                </PopoverTrigger>
                                <PopoverContent className="w-fit p-3" side="top">
                                    <div className="grid grid-cols-5 gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                className={`w-8 h-8 rounded-full border border-stone-200 transition-transform hover:scale-110 focus:outline-none ring-offset-2 ${color === c ? 'ring-2 ring-stone-900' : ''}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setColor(c)}
                                            />
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Slider
                                value={[width]}
                                min={1}
                                max={20}
                                step={1}
                                onValueChange={([v]) => setWidth(v)}
                                className="w-full"
                            />
                        </div>

                        {/* Teacher ONLY Controls */}
                        {isTeacher && (
                            <>
                                {/* Media Buttons */}
                                <div className="h-6 w-px bg-stone-200 flex-shrink-0" />

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-stone-600 hover:text-stone-900"
                                        title="Зураг нэмэх"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTextDialogOpen(true)}
                                        className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-stone-600 hover:text-stone-900"
                                        title="Текст нэмэх"
                                    >
                                        <Type className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setVideoDialogOpen(true)}
                                        className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-stone-600 hover:text-stone-900"
                                        title="Видео нэмэх"
                                    >
                                        <Video className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIframeDialogOpen(true)}
                                        className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-stone-600 hover:text-stone-900"
                                        title="Simulation / Embed нэмэх"
                                    >
                                        <Globe className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="h-6 w-px bg-stone-200 flex-shrink-0" />

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={togglePermissions}
                                        className={`rounded-full gap-2 px-3 ${!isAllowedToWrite ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'text-stone-500 hover:bg-stone-100'}`}
                                        title={isAllowedToWrite ? "Сурагчдыг цоожлох" : "Сурагчдыг нээх"}
                                    >
                                        {isAllowedToWrite ? (
                                            <>
                                                <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span className="text-xs font-normal whitespace-nowrap">Цоожлох</span>
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span className="text-xs font-semibold whitespace-nowrap">Нээх</span>
                                            </>
                                        )}
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-red-500 hover:text-red-700 hover:bg-red-50" title="Цэвэрлэх">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Самбарыг цэвэрлэх үү?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Энэ үйлдэл самбар дээрх бүх зургийг устгах бөгөөд буцаах боломжгүй.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Болих</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleClearConfirm} className="bg-red-500 hover:bg-red-600">
                                                    Цэвэрлэх
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>

                                {/* Page Navigation */}
                                <div className="h-6 w-px bg-stone-200 flex-shrink-0" />

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onNavigatePage?.(-1)}
                                        disabled={currentPage <= 0}
                                        className="rounded-full w-8 h-8"
                                        title="Өмнөх хуудас"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    <span className="text-sm font-medium text-stone-600 min-w-[60px] text-center">
                                        {currentPage + 1} / {totalPages}
                                    </span>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onNavigatePage?.(1)}
                                        disabled={currentPage >= totalPages - 1}
                                        className="rounded-full w-8 h-8"
                                        title="Дараах хуудас"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={onAddPage}
                                        className="rounded-full w-8 h-8 ml-1 border-dashed"
                                        title="Шинэ хуудас нэмэх"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setDeletePageDialogOpen(true)}
                                        disabled={totalPages <= 1}
                                        className="rounded-full w-8 h-8 ml-1 border-dashed text-red-500 hover:text-red-700 hover:bg-red-50"
                                        title="Хуудас устгах"
                                    >
                                        <FileMinus className="w-4 h-4" />
                                    </Button>

                                    <AlertDialog open={deletePageDialogOpen} onOpenChange={setDeletePageDialogOpen}>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Энэ хуудсыг устгах уу?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Энэ үйлдэл тухайн хуудасны бүх зүйлийг устгаж, дараагийн хуудсуудыг урагшлуулах болно.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Болих</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => { onDeletePage?.(); setDeletePageDialogOpen(false); }} className="bg-red-500 hover:bg-red-600">
                                                    Устгах
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </>
                        )}
                    </div >
                )}

                <div ref={containerRef} className="relative w-full aspect-video max-h-full bg-white rounded-lg shadow-lg overflow-hidden touch-none">
                    {/* Background Logo */}
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10"
                        style={{ backgroundImage: 'url(/sant-watermark-white.png)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain' }}
                    >
                    </div>

                    {/* Element Layer for Images/Text/Video - Z-index 10 */}
                    <ElementLayer
                        sessionId={sessionId}
                        currentPage={currentPage}
                        isTeacher={isTeacher}
                        isAllowedToWrite={isAllowedToWrite} // Pass permission
                        containerRef={containerRef}
                        selectedElement={selectedElement}
                        onSelect={setSelectedElement}
                    />

                    {/* Drawing Canvas - Z-index 50/Increased */}
                    <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 w-full h-full z-50 
                            ${tool === 'cursor' ? 'pointer-events-none' : ''}
                            ${tool === 'laser' ? 'cursor-none pointer-events-auto' : ''} 
                            ${(tool === 'pen' || tool === 'eraser') ? 'pointer-events-auto cursor-crosshair' : ''}
                        `}
                        onPointerDown={startDrawing} // Laser can also click to "fire" effect maybe? Or just track.
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrawing}
                        onPointerLeave={handlePointerLeave}
                    />

                    {/* Live Cursors Overlay - Everyone sees (Filtered) - Z-index 60 (Top) */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[60]">

                        {/* 1. Own Laser (Teacher sees themselves) */}
                        {isTeacher && tool === 'laser' && localMousePos && (
                            <div
                                className="absolute flex flex-col items-center"
                                style={{
                                    left: `${localMousePos.x * 100}%`,
                                    top: `${localMousePos.y * 100}%`,
                                    transform: 'translate(-50%, -50%)',
                                    transition: 'none' // Instant movement for self
                                }}
                            >
                                <div className="relative">
                                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
                                    <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                                </div>
                            </div>
                        )}

                        {/* 2. Other Cursors */}
                        {Object.entries(cursors).map(([id, cursor]) => {
                            // Logic:
                            // If I am Teacher: Show all students.
                            // If I am Student: Show any cursor that is 'laser' (usually Teacher).

                            // Relaxed logic: If it's a laser, show it to everyone.
                            const shouldShow = isTeacher || (cursor.type === 'laser');

                            if (!shouldShow) return null;

                            return (
                                <div
                                    key={id}
                                    className="absolute flex flex-col items-center"
                                    style={{
                                        left: `${cursor.x * 100}%`,
                                        top: `${cursor.y * 100}%`,
                                        transform: 'translate(-50%, -50%)',
                                        transition: 'left 0.1s linear, top 0.1s linear'
                                    }}
                                >
                                    {cursor.type === 'laser' ? (
                                        // Laser Render
                                        <div className="relative">
                                            <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
                                            <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
                                        </div>
                                    ) : (
                                        // Default Render
                                        <>
                                            <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: cursor.color }} />
                                            <span className="mt-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm">
                                                {cursor.userName}
                                            </span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Locked State Overlay for Students (Minimal, non-blocking if allowed) */}
                    {!isTeacher && !isAllowedToWrite && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100/90 text-red-800 px-4 py-2 rounded-full text-xs font-semibold shadow-sm border border-red-200 pointer-events-none flex items-center gap-2 z-40">
                            <Lock className="w-3 h-3" />
                            Зөвхөн багш бичнэ
                        </div>
                    )}

                    {/* Page Indicator for Students (read-only) */}
                    {!isTeacher && totalPages > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium pointer-events-none z-40 backdrop-blur-sm">
                            Хуудас {currentPage + 1} / {totalPages}
                        </div>
                    )}
                </div>
            </div >

            {/* Input Dialogs */}
            < InputDialog
                open={textDialogOpen}
                onOpenChange={setTextDialogOpen}
                title="Текст нэмэх"
                placeholder="Текст оруулна уу..."
                onSubmit={createTextElement}
            />

            <InputDialog
                open={videoDialogOpen}
                onOpenChange={setVideoDialogOpen}
                title="YouTube видео нэмэх"
                placeholder="YouTube URL оруулна уу (жишээ: https://youtube.com/watch?v=...)"
                onSubmit={createVideoElement}
            />

            {/* Iframe Dialog */}
            <InputDialog
                open={iframeDialogOpen}
                onOpenChange={setIframeDialogOpen}
                title="Simulation / Embed нэмэх"
                placeholder="URL оруулна уу (Жишээ: https://phet.colorado.edu/...)"
                onSubmit={createIframeElement}
            />

            <SaveLessonDialog
                open={saveLessonOpen}
                onOpenChange={setSaveLessonOpen}
                onSave={handleSaveLesson}
            />

            <LoadLessonDialog
                open={loadLessonOpen}
                onOpenChange={setLoadLessonOpen}
                onLoad={handleLoadLesson}
            />
        </>
    );
}

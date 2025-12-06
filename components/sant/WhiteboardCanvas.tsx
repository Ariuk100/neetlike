'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, writeBatch, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Trash2, Eraser, Pen, Lock, Unlock, ChevronLeft, ChevronRight, Plus, ImageIcon, Type, Video } from 'lucide-react';
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
import ElementLayer from './ElementLayer';
import InputDialog from './InputDialog';
import { uploadWhiteboardImage, generateElementId } from '@/lib/whiteboardStorage';

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
    // NEW: Multi-page support
    currentPage: number;
    totalPages: number;
    onAddPage?: () => void;
    onNavigatePage?: (delta: number) => void;
}

interface CursorData {
    x: number;
    y: number;
    userName: string;
    color: string;
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
    onNavigatePage
}: WhiteboardCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);  // NEW: For ElementLayer
    const fileInputRef = useRef<HTMLInputElement>(null); // NEW: For image upload
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(2);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const currentPath = useRef<Point[]>([]);
    const [paths, setPaths] = useState<DrawPath[]>([]);
    const [cursors, setCursors] = useState<Record<string, CursorData>>({});
    const [isUploading, setIsUploading] = useState(false);  // NEW: Upload state
    // NEW: Dialog states for text and video
    const [textDialogOpen, setTextDialogOpen] = useState(false);
    const [videoDialogOpen, setVideoDialogOpen] = useState(false);

    // Throttled cursor updater
    const updateCursor = useRef(simpleThrottle(async (x: number, y: number, connected: boolean) => {
        if (!userName || !sessionId) return;
        try {
            const cursorRef = doc(db, 'whiteboard_sessions', sessionId, 'cursors', userName);
            if (connected) {
                await setDoc(cursorRef, {
                    x, y,
                    userName,
                    color: isTeacher ? '#FF0000' : '#0000FF', // Simple differentiation
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            }
        } catch (e) {
            console.error(e);
        }
    }, 100)).current;

    // Scale logic for responsiveness
    const getCanvasPoint = (e: React.PointerEvent | PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    // Sync paths from Firebase (now page-based)
    useEffect(() => {
        if (!sessionId) return;
        // NEW: Listen to paths under the current page
        const q = query(
            collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'paths'),
            orderBy('createdAt')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newPaths: DrawPath[] = [];
            snapshot.forEach((doc) => {
                newPaths.push({ id: doc.id, ...doc.data() } as DrawPath);
            });
            setPaths(newPaths);
        });
        return () => unsubscribe();
    }, [sessionId, currentPage]); // Re-subscribe when page changes

    // Cursor Listener
    useEffect(() => {
        if (!sessionId) return;
        const q = query(collection(db, 'whiteboard_sessions', sessionId, 'cursors'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newCursors: Record<string, CursorData> = {};
            snapshot.forEach((doc) => {
                if (doc.id !== userName) { // Don't show own cursor
                    newCursors[doc.id] = doc.data() as CursorData;
                }
            });
            setCursors(newCursors);
        });
        return () => unsubscribe();
    }, [sessionId, userName]);

    // Redraw canvas when paths change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate scale factor to ensure consistent line width across resolutions
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        paths.forEach((p) => {
            if (p.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = p.type === 'eraser' ? '#ffffff' : p.color;
            ctx.lineWidth = p.width * scale; // Scale width for High DPI
            ctx.moveTo(p.points[0].x, p.points[0].y);
            for (let i = 1; i < p.points.length; i++) {
                ctx.lineTo(p.points[i].x, p.points[i].y);
            }
            ctx.stroke();
        });
    }, [paths]);

    const canDraw = isTeacher || isAllowedToWrite;

    const startDrawing = (e: React.PointerEvent) => {
        if (!canDraw) return;
        setIsDrawing(true);
        const point = getCanvasPoint(e);
        currentPath.current = [point];
    };

    const draw = (e: React.PointerEvent) => {
        if (!isDrawing || !canDraw) return;
        const point = getCanvasPoint(e);
        currentPath.current.push(point);

        // Optimistic local drawing
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx && currentPath.current.length > 1) {
            const rect = canvas.getBoundingClientRect();
            const scale = canvas.width / rect.width;

            const lastPoint = currentPath.current[currentPath.current.length - 2];
            ctx.beginPath();
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            ctx.lineWidth = width * scale; // Scale width for High DPI
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    };

    const endDrawing = async () => {
        if (!isDrawing || !canDraw) return;
        setIsDrawing(false);

        if (currentPath.current.length > 0) {
            try {
                // NEW: Save to page-specific paths collection
                await addDoc(collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'paths'), {
                    points: currentPath.current,
                    color,
                    width,
                    type: tool,
                    createdAt: new Date().toISOString(),
                    createdBy: userName // Add metadata
                });
            } catch (error) {
                console.error("Error adding path: ", error);
            }
        }
        currentPath.current = [];
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            // Store normalized coordinates (0-1)
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            updateCursor(x, y, true);
        }
        draw(e);
    };

    const handleClearConfirm = async () => {
        if (!isTeacher) return;

        try {
            // Batch delete for efficiency - robust cleanup (now page-based)
            const q = query(collection(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'paths'));
            const snapshot = await getDocs(q);

            // Firestore limit is 500 per batch. If more, we need multiple batches.
            const batchSize = 500;
            const chunks = [];
            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                chunks.push(snapshot.docs.slice(i, i + batchSize));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            toast.success('Самбар цэвэрлэгдлээ');
        } catch (e) {
            console.error("Clear error:", e);
            toast.error('Алдаа гарлаа');
        }
    };

    const togglePermissions = async () => {
        if (!isTeacher) return;
        try {
            await updateDoc(doc(db, 'whiteboard_sessions', sessionId), {
                isStudentWriteAllowed: !isAllowedToWrite // Invert current prop state
            });
            toast.success(isAllowedToWrite ? 'Сурагчийн эрхийг хаалаа' : 'Сурагчид бичих эрх нээлээ');
        } catch {
            toast.error('Эрх солиход алдаа гарлаа');
        }
    };

    // NEW: Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isTeacher || !e.target.files?.length) return;

        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            toast.error('Зөвхөн зураг upload хийх боломжтой');
            return;
        }

        setIsUploading(true);
        try {
            const url = await uploadWhiteboardImage(sessionId, currentPage, file);

            // Add element to Firebase
            const elementId = generateElementId();
            await setDoc(
                doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', elementId),
                {
                    type: 'image',
                    url,
                    x: 10,      // Initial position (10% from left)
                    y: 10,      // Initial position (10% from top)
                    width: 30,  // Initial size (30% of container)
                    height: 30,
                    animation: 'fadeIn',
                    animationDuration: 500,
                    createdAt: new Date().toISOString(),
                    createdBy: userName
                }
            );

            toast.success('Зураг нэмэгдлээ');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Зураг upload хийхэд алдаа гарлаа');
        } finally {
            setIsUploading(false);
            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // NEW: Add text element (opens dialog)
    const handleAddText = () => {
        if (!isTeacher) return;
        setTextDialogOpen(true);
    };

    // NEW: Actually create the text element
    const createTextElement = async (text: string) => {
        try {
            const elementId = generateElementId();
            await setDoc(
                doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', elementId),
                {
                    type: 'text',
                    content: text,
                    x: 20,
                    y: 20,
                    width: 40,
                    height: 15,
                    style: {
                        fontFamily: 'Inter',
                        fontSize: 24,
                        color: '#000000',
                        bold: false,
                        italic: false,
                        textAlign: 'center'
                    },
                    animation: 'slideUp',
                    animationDuration: 500,
                    createdAt: new Date().toISOString(),
                    createdBy: userName
                }
            );

            toast.success('Текст нэмэгдлээ');
        } catch (error) {
            console.error('Add text error:', error);
            toast.error('Текст нэмэхэд алдаа гарлаа');
        }
    };

    // NEW: Add video element (opens dialog)
    const handleAddVideo = () => {
        if (!isTeacher) return;
        setVideoDialogOpen(true);
    };

    // NEW: Create video element from YouTube URL
    const createVideoElement = async (url: string) => {
        // Convert YouTube URL to embed URL
        let embedUrl = url;

        // Handle various YouTube URL formats
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            embedUrl = `https://www.youtube.com/embed/${match[1]}`;
        } else if (!url.includes('embed')) {
            toast.error('YouTube URL оруулна уу');
            return;
        }

        try {
            const elementId = generateElementId();
            await setDoc(
                doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', elementId),
                {
                    type: 'video',
                    url: embedUrl,
                    x: 10,
                    y: 10,
                    width: 50,
                    height: 35,
                    animation: 'fadeIn',
                    animationDuration: 500,
                    createdAt: new Date().toISOString(),
                    createdBy: userName
                }
            );

            toast.success('Видео нэмэгдлээ');
        } catch (error) {
            console.error('Add video error:', error);
            toast.error('Видео нэмэхэд алдаа гарлаа');
        }
    };

    // Set canvas size with DPI support and ResizeObserver
    useEffect(() => {
        if (!canvasRef.current?.parentElement) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry && canvasRef.current) {
                const width = entry.target.clientWidth;
                const height = entry.target.clientHeight;
                const dpr = window.devicePixelRatio || 1;

                canvasRef.current.width = width * dpr;
                canvasRef.current.height = height * dpr;

                // Note: We use manual scaling in draw/redraw, so no ctx.scale() here
            }
        });

        observer.observe(canvasRef.current.parentElement);
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div className="flex flex-col items-center justify-center w-full h-full bg-stone-100 gap-4">
                {/* Teacher Controls - Now Above the Board */}
                {isTeacher && (
                    <div className="flex-none bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 sm:px-6 sm:py-3 flex items-center gap-2 sm:gap-4 border border-stone-200 z-20 max-w-[95%] overflow-x-auto">
                        <div className="flex gap-2 flex-shrink-0">
                            <Button
                                variant={tool === 'pen' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('pen')}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
                            >
                                <Pen className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                                variant={tool === 'eraser' ? 'default' : 'ghost'}
                                size="icon"
                                onClick={() => setTool('eraser')}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
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

                        {/* NEW: Media Buttons */}
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
                                onClick={handleAddText}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-stone-600 hover:text-stone-900"
                                title="Текст нэмэх"
                            >
                                <Type className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleAddVideo}
                                className="rounded-full w-8 h-8 sm:w-10 sm:h-10 text-stone-600 hover:text-stone-900"
                                title="Видео нэмэх"
                            >
                                <Video className="w-4 h-4" />
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
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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

                        {/* NEW: Page Navigation */}
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
                        </div>
                    </div>
                )}

                <div ref={containerRef} className="relative w-full aspect-video max-h-full bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Background Logo */}
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10"
                        style={{ backgroundImage: 'url(/sant-watermark-white.png)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'contain' }}
                    >
                    </div>

                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                        onPointerDown={startDrawing}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrawing}
                        onPointerLeave={endDrawing}
                    />

                    {/* Element Layer for Images/Text/Video */}
                    <ElementLayer
                        sessionId={sessionId}
                        currentPage={currentPage}
                        isTeacher={isTeacher}
                        containerRef={containerRef}
                    />

                    {/* Live Cursors Overlay - Only Teacher Sees */}
                    {isTeacher && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {Object.entries(cursors).map(([id, cursor]) => (
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
                                    <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: cursor.color }} />
                                    <span className="mt-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm">
                                        {cursor.userName}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Locked State Overlay for Students */}
                    {!isTeacher && !isAllowedToWrite && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100/90 text-red-800 px-4 py-2 rounded-full text-xs font-semibold shadow-sm border border-red-200 pointer-events-none flex items-center gap-2 z-20">
                            <Lock className="w-3 h-3" />
                            Зөвхөн багш бичнэ
                        </div>
                    )}

                    {/* Page Indicator for Students (read-only) */}
                    {!isTeacher && totalPages > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/50 text-white px-3 py-1.5 rounded-full text-xs font-medium pointer-events-none z-20 backdrop-blur-sm">
                            Хуудас {currentPage + 1} / {totalPages}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Dialogs */}
            <InputDialog
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
        </>
    );
}

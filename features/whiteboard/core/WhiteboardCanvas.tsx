'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, writeBatch, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

import ElementLayer from './ElementLayer';
import { generateElementId, uploadWhiteboardImage } from './utils/whiteboardStorage';
import { WhiteboardElement } from '../types';

interface Point {
    x: number;
    y: number;
}

interface DrawPath {
    id?: string;
    points: Point[];
    color: string;
    width: number;
    type: 'pen' | 'eraser' | 'laser';
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
    collectionName?: string;

    // Controlled State Props
    tool?: 'pen' | 'eraser' | 'cursor' | 'laser';
    color?: string;
    width?: number;
    // We don't need setters if we only consume them for drawing
    // But we might need 'setTool' if we want shortcuts (like 'V' for cursor) to work bubbling up
    setTool?: (tool: 'pen' | 'eraser' | 'cursor' | 'laser') => void;
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

// Throttle utility
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
    onNavigatePage,
    collectionName = 'whiteboard_sessions',
    tool = 'cursor',
    color = '#000000',
    width = 2,
    setTool
}: WhiteboardCanvasProps) {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentPath = useRef<Point[]>([]);
    const context = useRef<CanvasRenderingContext2D | null>(null);

    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [paths, setPaths] = useState<DrawPath[]>([]);
    const [canDraw, setCanDraw] = useState(isAllowedToWrite);
    const [localMousePos, setLocalMousePos] = useState<{ x: number, y: number } | null>(null);

    const [selectedElement, setSelectedElement] = useState<string | null>(null);

    // Initialize canvas context
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            context.current = canvas.getContext('2d');
            const ctx = context.current;
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, []);

    // Resize canvas
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
                redrawAllPaths(paths);
            }
        }
    }, [paths]);

    useEffect(() => {
        resizeCanvas();

        // Use ResizeObserver to detect container size changes
        const container = containerRef.current;
        if (!container) return;

        let rafId: number | null = null;

        const resizeObserver = new ResizeObserver(() => {
            // Throttle with RAF
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                resizeCanvas();
                rafId = null;
            });
        });

        resizeObserver.observe(container);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
        };
    }, [resizeCanvas]);

    // Permissions
    useEffect(() => {
        setCanDraw(isAllowedToWrite);
    }, [isAllowedToWrite]);

    // Sync Paths
    useEffect(() => {
        if (!sessionId) return;
        const q = query(
            collection(db, collectionName, sessionId, 'pages', String(currentPage), 'paths'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newPaths: DrawPath[] = [];
            snapshot.forEach((doc) => {
                newPaths.push({ id: doc.id, ...doc.data() } as DrawPath);
            });
            setPaths(newPaths);
        });
        return () => unsubscribe();
    }, [sessionId, currentPage, collectionName]);

    // ✅ Laser animation loop & cleanup
    useEffect(() => {
        let rafId: number;
        let cleanupId: NodeJS.Timeout;

        const animate = () => {
            const hasLasers = paths.some(p => p.type === 'laser');
            const isDrawingLaser = isDrawing && tool === 'laser';

            // We run the loop if there are background lasers (fading) OR if we are actively drawing a laser
            if (hasLasers || isDrawingLaser) {
                let pathsToRender = paths;

                // Merge current drawing path (for ANY tool) if we are in the loop
                // This ensures that if we draw with a Pen while a Laser is fading, the Pen stroke is included in the frame
                if (isDrawing && currentPath.current.length > 0) {
                    const pendingPath: DrawPath = {
                        points: currentPath.current,
                        color: tool === 'eraser' ? 'rgba(0,0,0,1)' : (tool === 'laser' ? color : color),
                        width: tool === 'eraser' ? width * 15 : (tool === 'laser' ? width * 2 : width),
                        type: tool === 'laser' ? 'laser' : (tool === 'eraser' ? 'eraser' : 'pen'),
                        createdAt: new Date().toISOString(),
                        createdBy: userName
                    };
                    pathsToRender = [...paths, pendingPath];
                }

                redrawAllPaths(pathsToRender);
                rafId = requestAnimationFrame(animate);
            }
        };

        // Start animation if needed
        if (paths.some(p => p.type === 'laser') || (isDrawing && tool === 'laser')) {
            rafId = requestAnimationFrame(animate);
        }

        // Cleanup interval for expiring lasers
        const laserPaths = paths.filter(p => p.type === 'laser');
        if (laserPaths.length > 0) {
            cleanupId = setInterval(async () => {
                const now = Date.now();
                const batch = writeBatch(db);
                let hasChanges = false;

                laserPaths.forEach(path => {
                    const createdAt = new Date(path.createdAt).getTime();
                    // 2 Seconds fade out
                    if (now - createdAt > 2000) {
                        const pathRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'paths', path.id!);
                        batch.delete(pathRef);
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    await batch.commit();
                }
            }, 500);
        }

        return () => {
            if (cleanupId) clearInterval(cleanupId);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [paths, sessionId, currentPage, collectionName, isDrawing, tool, color, width, userName]);

    // Redraw for non-laser updates or when not animating
    useEffect(() => {
        const hasLasers = paths.some(p => p.type === 'laser');
        // Only trigger manual redraw if animation loop isn't active
        if (!hasLasers && !(isDrawing && tool === 'laser')) {
            redrawAllPaths(paths);
        }
    }, [paths, isDrawing, tool]);

    // Keyboard shortcuts - now require setTool prop
    useEffect(() => {
        if (!setTool) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'v': setTool('cursor'); break;
                case 'p': setTool('pen'); break;
                case 'e': setTool('eraser'); break;
                case 'l': setTool('laser'); break;
                case 'escape': setSelectedElement(null); break; // ✅ Эскэйп товчоор болих
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTool]);

    // Draw Logic
    const startDrawing = (e: React.PointerEvent) => {
        // ✅ Сонгосон элементийг цуцлах
        if (selectedElement) {
            setSelectedElement(null);
        }

        const isAllowedToDraw = canDraw || isTeacher;
        // Laser одоо зурдаг болсон
        if (!isAllowedToDraw || tool === 'cursor') return;

        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);

        setIsDrawing(true);
        const { offsetX, offsetY } = e.nativeEvent;
        const container = containerRef.current;
        if (!container) return;

        // ✅ Fixed Virtual Coordinate System (2000x2000)
        // Ингэснээр sidebar нээх хаахад зураасны хэмжээ өөрчлөгдөхгүй тогтвортой байна
        const normX = (offsetX / container.clientWidth) * 2000;
        const normY = (offsetY / container.clientHeight) * 2000;

        currentPath.current = [{ x: normX, y: normY }];
    };

    const draw = (e: React.PointerEvent) => {
        const isAllowedToDraw = canDraw || isTeacher;
        if (!isDrawing || !isAllowedToDraw || tool === 'cursor') return;

        const { offsetX, offsetY } = e.nativeEvent;
        const container = containerRef.current;
        if (!container) return;

        const normX = (offsetX / container.clientWidth) * 2000;
        const normY = (offsetY / container.clientHeight) * 2000;

        currentPath.current.push({ x: normX, y: normY });

        // If animation loop is active (because of lasers or we are using laser), defer to it
        const hasLasers = paths.some(p => p.type === 'laser');
        if (tool === 'laser' || hasLasers) return;

        // Optimistic rendering for non-laser tools (only if no loop is running)
        const incompletePath: DrawPath = {
            points: currentPath.current,
            color: tool === 'eraser' ? 'rgba(0,0,0,1)' : color,
            width: tool === 'eraser' ? width * 15 : width,
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
            const newPath: DrawPath = {
                points: [...currentPath.current],
                color: tool === 'eraser' ? 'rgba(0,0,0,1)' : color,
                width: tool === 'eraser' ? width * 15 : (tool === 'laser' ? width * 2 : width),
                type: tool === 'laser' ? 'laser' : (tool === 'eraser' ? 'eraser' : 'pen'),
                createdAt: new Date().toISOString(),
                createdBy: userName,
            };

            await addDoc(collection(db, collectionName, sessionId, 'pages', String(currentPage), 'paths'), newPath);
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

                // ✅ Эрэйзерийн хувьд "destination-out" болгож арилгадаг болголоо
                if (path.type === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                }

                if (path.points && path.points.length > 0) {
                    const firstPt = path.points[0];
                    // ✅ Virtual (2000) -> Screen conversion
                    const startX = (firstPt.x / 2000) * w;
                    const startY = (firstPt.y / 2000) * h;

                    ctx.moveTo(startX, startY);

                    path.points.forEach((point) => {
                        const px = (point.x / 2000) * w;
                        const py = (point.y / 2000) * h;
                        ctx.lineTo(px, py);
                    });
                }

                if (path.type === 'laser') {
                    const now = Date.now();
                    const createdAt = new Date(path.createdAt).getTime();
                    const age = now - createdAt;
                    const opacity = Math.max(0, 1 - age / 2000); // 2 секунд уусна

                    ctx.globalAlpha = opacity;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = path.color;
                    ctx.strokeStyle = path.color;
                    ctx.lineWidth = path.width * 2;
                } else {
                    ctx.globalAlpha = 1.0;
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = path.type === 'eraser' ? 'rgba(0,0,0,1)' : path.color;
                    ctx.lineWidth = path.width;
                }

                ctx.stroke();
            });
            // ✅ Буцаагаад хэвийн болгох
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // Track mouse position for eraser cursor
        const { offsetX, offsetY } = e.nativeEvent;
        setLocalMousePos({ x: offsetX, y: offsetY });

        if (isDrawing) {
            draw(e);
        }
    };

    const handlePointerLeave = () => {
        setLocalMousePos(null);
        if (isDrawing) setIsDrawing(false);
    };

    return (
        <div className="w-full bg-white relative" style={{ height: '100%' }}>
            {/* Canvas Area */}
            <div ref={containerRef} className="absolute inset-0 overflow-hidden touch-none" style={{
                backgroundImage: `
                    linear-gradient(to right, #e5e5e5 1px, transparent 1px),
                    linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                backgroundColor: 'white'
            }}>
                {/* Grid Background */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(200, 200, 200, 0.15) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(200, 200, 200, 0.15) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px',
                        zIndex: -1
                    }}
                />

                <canvas
                    ref={canvasRef}
                    className="absolute inset-0"
                    style={{
                        zIndex: 20,
                        pointerEvents: tool === 'cursor' ? 'none' : 'auto',
                        cursor: tool === 'laser' ? 'none' : 'default'
                    }}
                    onPointerDown={startDrawing}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrawing}
                    onPointerLeave={handlePointerLeave}
                />

                {/* Laser Pointer Preview */}
                {tool === 'laser' && localMousePos && (
                    <div
                        className="absolute pointer-events-none rounded-full z-[100] animate-pulse"
                        style={{
                            left: localMousePos.x,
                            top: localMousePos.y,
                            width: 12,
                            height: 12,
                            backgroundColor: color,
                            boxShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                )}

                {/* Eraser Cursor Preview */}
                {tool === 'eraser' && localMousePos && (
                    <div
                        className="absolute pointer-events-none rounded-full border border-gray-400 bg-white/30 z-[100]"
                        style={{
                            left: localMousePos.x,
                            top: localMousePos.y,
                            width: width * 15,
                            height: width * 15,
                            transform: 'translate(-50%, -50%)'
                        }}
                    />
                )}

                <div
                    style={{ zIndex: 10 }}
                    className="absolute inset-0 pointer-events-auto"
                    onPointerDown={(e) => {
                        // Background дээр дарахад сонголтыг цуцлах
                        if (e.target === e.currentTarget) {
                            setSelectedElement(null);
                        }
                    }}
                >
                    <ElementLayer
                        sessionId={sessionId}
                        currentPage={currentPage}
                        isTeacher={isTeacher}
                        isAllowedToWrite={canDraw}
                        containerRef={containerRef}
                        selectedElement={selectedElement}
                        onSelect={setSelectedElement}
                        userName={userName}
                        collectionName={collectionName}
                    />
                </div>
            </div>
        </div>
    );
}

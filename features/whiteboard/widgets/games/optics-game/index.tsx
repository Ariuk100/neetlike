'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Play, Trophy, ArrowRight, Pause, RotateCw, Lightbulb, LightbulbOff, Users, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { WhiteboardElement } from '../../../types';

// Types
interface Point {
    x: number;
    y: number;
}

interface OpticalTool {
    id: string;
    type: 'mirror' | 'lens' | 'prism' | 'block' | 'wall';
    x: number;
    y: number;
    rotation: number; // in degrees
    width: number;
    height: number;
    params?: {
        focalLength?: number; // for lenses
        refractiveIndex?: number; // for blocks/prisms
    };
    isLocked?: boolean; // if true, cannot be moved (part of level design)
}

interface LevelConfig {
    id: number;
    name: string;
    source: { x: number; y: number; angle: number };
    target: { x: number; y: number; radius: number };
    obstacles: OpticalTool[]; // Static walls/barriers
    availableTools: { type: OpticalTool['type']; count: number; name: string }[];
    description: string;
}

interface OpticsGameElement extends WhiteboardElement {
    gameStatus?: 'playing' | 'completed';
    currentLevel?: number;
    bestTimes?: Record<string, number>; // playerId -> time in ms
    studentProgress?: Record<string, {
        name: string;
        level: number;
        time: number; // total elapsed time
        lastUpdated: string;
    }>;
}

interface OpticsGameWidgetProps {
    element: WhiteboardElement;
    isTeacher: boolean;
    updateElement: (id: string, data: Partial<WhiteboardElement>) => void;
    sessionId: string;
    currentPage: number;
    userName: string;
    collectionName?: string;
}

export default function OpticsGameWidget({
    element: baseElement,
    isTeacher,
    updateElement, // We can use this for simple updates
    sessionId,
    currentPage,
    userName,
    collectionName = 'whiteboard_sessions'
}: OpticsGameWidgetProps) {
    const element = baseElement as OpticsGameElement;
    const [level, setLevel] = useState<number>(element.currentLevel || 1);
    const [maxUnlockedLevel, setMaxUnlockedLevel] = useState<number>(element.currentLevel || 1); // Track progress
    const [tools, setTools] = useState<OpticalTool[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLaserOn, setIsLaserOn] = useState(true);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isLevelComplete, setIsLevelComplete] = useState(false);

    // Multiplayer State
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);

    // Levels Configuration (Mongolian)
    const levels: LevelConfig[] = [
        {
            id: 1,
            name: "1. Гэрлийн ойлтоо (Reflection)",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 700, y: 300, radius: 25 },
            obstacles: [{ id: 'w1', type: 'wall', x: 400, y: 300, width: 20, height: 200, rotation: 0, isLocked: true }],
            availableTools: [],
            description: "Толийг ашиглан лазерыг бай руу тусга."
        },
        {
            id: 2,
            name: "2. Булан тойрох",
            source: { x: 50, y: 100, angle: 0 },
            target: { x: 100, y: 500, radius: 25 },
            obstacles: [
                { id: 'w1', type: 'wall', x: 200, y: 200, width: 300, height: 20, rotation: 0, isLocked: true }
            ],
            availableTools: [],
            description: "Гэрлийг хана тойруулж чиглүүл."
        },
        {
            id: 3,
            name: "3. Гэрлийн хугарал (Refraction)",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 700, y: 350, radius: 25 },
            obstacles: [],
            availableTools: [],
            description: "Шилэн блок ашиглан гэрлийг хугалж байг оно."
        },
        {
            id: 4,
            name: "4. Зиг Заг",
            source: { x: 50, y: 50, angle: 45 },
            target: { x: 700, y: 50, radius: 25 },
            obstacles: [],
            availableTools: [],
            description: "Лазерыг олон удаа ойлгож байг оно."
        },
        {
            id: 5,
            name: "5. Дотоод бүрэн ойлтоо",
            source: { x: 50, y: 400, angle: -30 },
            target: { x: 450, y: 400, radius: 25 },
            obstacles: [],
            availableTools: [],
            description: "Шилэн дотор гэрлийг бүрэн ойлгож үз. (Oрчин: Агаар -> Шил -> Агаар)"
        },
        {
            id: 6,
            name: "6. Линзний эффект",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 700, y: 300, radius: 20 },
            obstacles: [
                { id: 'w1', type: 'wall', x: 300, y: 150, width: 20, height: 300, rotation: 0, isLocked: true },
                { id: 'w2', type: 'wall', x: 300, y: 550, width: 20, height: 300, rotation: 0, isLocked: true }
            ],
            availableTools: [],
            description: "Нарийн завсраар гэрлийг гарга."
        },
        {
            id: 7,
            name: "7. Холимог оптик",
            source: { x: 50, y: 100, angle: 20 },
            target: { x: 700, y: 500, radius: 25 },
            obstacles: [
                { id: 'm1', type: 'wall', x: 375, y: 300, width: 20, height: 200, rotation: 0, isLocked: true }
            ],
            availableTools: [],
            description: "Толь болон шилийг хослуулан ашигла."
        },
        {
            id: 8,
            name: "8. Лабиринт",
            source: { x: 400, y: 50, angle: 90 },
            target: { x: 400, y: 550, radius: 20 },
            obstacles: [
                { id: 'o1', type: 'wall', x: 250, y: 250, width: 300, height: 20, rotation: 0, isLocked: true },
                { id: 'o2', type: 'wall', x: 550, y: 350, width: 300, height: 20, rotation: 0, isLocked: true },
            ],
            availableTools: [],
            description: "Саадыг тойрч гарах замыг ол."
        },
        {
            id: 9,
            name: "9. Нарийвчлал",
            source: { x: 50, y: 300, angle: 0 },
            target: { x: 750, y: 300, radius: 15 },
            obstacles: [
                { id: 'b1', type: 'wall', x: 200, y: 300, width: 30, height: 100, rotation: 0, isLocked: true },
                { id: 'b2', type: 'wall', x: 400, y: 300, width: 30, height: 100, rotation: 0, isLocked: true },
                { id: 'b3', type: 'wall', x: 600, y: 300, width: 30, height: 100, rotation: 0, isLocked: true },
            ],
            availableTools: [],
            description: "Гэрлийн хугарлыг нарийн тооцоол."
        },
        {
            id: 10,
            name: "10. Мастер түвшин",
            source: { x: 100, y: 100, angle: 45 },
            target: { x: 200, y: 100, radius: 20 },
            obstacles: [
                { id: 'c1', type: 'wall', x: 400, y: 300, width: 100, height: 100, rotation: 45, isLocked: true }
            ],
            availableTools: [],
            description: "Бүх мэдлэгээ ашиглан саадыг даван туул."
        }
    ];

    const currentLevelConfig = levels.find(l => l.id === level) || levels[0];

    // Sync progress to Firestore (Throttled)
    const syncProgress = async (newLevel: number, newTime: number) => {
        if (isTeacher) return;
        try {
            // Using direct updateDoc for nested field update
            const elRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', element.id);
            await updateDoc(elRef, {
                [`studentProgress.${userName}`]: {
                    name: userName,
                    level: newLevel,
                    time: newTime,
                    lastUpdated: new Date().toISOString()
                }
            });
        } catch (e) {
            console.error("Error syncing progress", e);
        }
    };

    // Teacher Global Start
    const handleGlobalStart = async () => {
        try {
            // Removed mobile fullscreen logic for widget version to keep it contained

            // Use updateElement if possible, or direct doc for consistency
            // updateElement(element.id, { gameStatus: 'playing' }); // This updates local state + firestore
            // But let's stick to updateDoc if we want to be sure about Firestore field rules or if updateElement is delayed

            const elRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', element.id);
            await updateDoc(elRef, { gameStatus: 'playing' });

            setIsPlaying(true);
            toast.success("Тоглоом эхэллээ!");
        } catch {
            toast.error("Эхлүүлэхэд алдаа гарлаа");
        }
    };

    // Listen to Global Game Status
    useEffect(() => {
        if (element.gameStatus === 'playing' && !isPlaying) {
            setIsPlaying(true);
        }
    }, [element.gameStatus, isPlaying]);

    useEffect(() => {
        if (isPlaying && !isTeacher) {
            const timer = setTimeout(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (syncProgress as any)(level, elapsedTime);
            }, 2000); // Sync every 2 seconds to avoid spam
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, elapsedTime, isPlaying, isTeacher]);

    // --- HELPER FUNCTIONS ---
    // Ray State (Vector based)
    const [isTargetHit, setIsTargetHit] = useState(false);

    // Target Hit Timer (3 seconds delay before win)
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isTargetHit && !isLevelComplete) {
            timeout = setTimeout(() => {
                setIsLevelComplete(true);
            }, 3000); // 3 seconds delay
        }
        return () => clearTimeout(timeout);
    }, [isTargetHit, isLevelComplete]);

    // Auto-advance timer (After level complete)
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isLevelComplete) {
            // Unlock next level
            if (level < 10) {
                setMaxUnlockedLevel(prev => Math.max(prev, level + 1));
            }

            // Quick transition after the "Level Complete" overlay appears
            timeout = setTimeout(() => {
                if (level < 10) {
                    setLevel(l => l + 1);
                    setIsLevelComplete(false);
                    setTools([]);
                    setElapsedTime(0);
                    setIsPlaying(true);
                    toast.success(`Түвшин ${level + 1} эхэллээ!`);
                } else {
                    toast.success("Бүх үеийг амжилттай давлаа!");
                }
            }, 1000); // 1 second delay
        }
        return () => clearTimeout(timeout);
    }, [isLevelComplete, level]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [dragState, setDragState] = useState<{
        type: 'move' | 'rotate' | null,
        toolId: string | null,
        startX: number,
        startY: number,
        startValueX: number,
        startValueY: number
    }>({ type: null, toolId: null, startX: 0, startY: 0, startValueX: 0, startValueY: 0 });



    const handleSelectLevel = (lvlId: number) => {
        if (lvlId <= maxUnlockedLevel) {
            setLevel(lvlId);
            setTools([]);
            setElapsedTime(0);
            setIsLevelComplete(false);
            setIsPlaying(false);
            toast.info(`Түвшин ${lvlId} сонгогдлоо.`);
        } else {
            toast.error("Энэ үе хараахан нээгдээгүй байна/Өмнөх үеийг давах шаардлагатай!");
        }
    };

    const addTool = (type: OpticalTool['type']) => {
        if (!isPlaying) {
            toast.error("Эхлээд 'Эхлэх' товчийг дарж тоглоомыг эхлүүлнэ үү!");
            return;
        }
        if (tools.length >= 20) {
            toast.error("Багажны тоо хэтэрсэн байна.");
            return;
        }

        const id = Math.random().toString(36).substr(2, 9);
        const canvas = canvasRef.current;
        const x = canvas ? canvas.width / 2 : 400;
        const y = canvas ? canvas.height / 2 : 300;

        const newTool: OpticalTool = {
            id,
            type,
            x,
            y,
            rotation: type === 'mirror' ? 45 : 0,
            width: type === 'mirror' ? 60 : (type === 'lens' ? 20 : 60),
            height: type === 'block' ? 60 : (type === 'lens' ? 100 : 15),
            isLocked: false,
            params: { refractiveIndex: 1.5 }
        };
        setTools(prev => [...prev, newTool]);
        toast.success(type === 'mirror' ? 'Толь нэмэгдлээ' : (type === 'lens' ? 'Линз нэмэгдлээ' : 'Шил нэмэгдлээ'));
    };

    // Resize Canvas
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                const minWidth = 800;
                const minHeight = 600;
                // Just ensure min size, let CSS handle actual sizing if different
                canvasRef.current.width = minWidth;
                canvasRef.current.height = minHeight;
            }
        };
        handleResize();
        // Since it's a widget, window resize might not track element resize. 
        // Ideally we use ResizeObserver on containerRef.
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // Game Loop (Timer)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && !isLevelComplete) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 100);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isLevelComplete]);

    // Handle Global Drag Events
    useEffect(() => {
        const handleMove = (e: PointerEvent) => {
            if (!dragState.type || !dragState.toolId) return;
            // Since we are checking global Move, we rely on clientX/Y.

            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;

            setTools(prev => prev.map(t => {
                if (t.id !== dragState.toolId) return t;

                if (dragState.type === 'move') {
                    return {
                        ...t,
                        x: dragState.startValueX + dx,
                        y: dragState.startValueY + dy
                    };
                } else if (dragState.type === 'rotate') {
                    return {
                        ...t,
                        rotation: (dragState.startValueX + dx) % 360
                    };
                }
                return t;
            }));
        };

        const handleUp = () => {
            setDragState({ type: null, toolId: null, startX: 0, startY: 0, startValueX: 0, startValueY: 0 });
        };

        if (dragState.type) {
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp);
        }

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [dragState]);

    // Render Loop (Updated Physics)
    useEffect(() => {
        const render = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const scrollWidth = Math.max(container.scrollWidth, 800);
            const scrollHeight = Math.max(container.scrollHeight, 600);
            if (canvas.width !== scrollWidth || canvas.height !== scrollHeight) {
                canvas.width = scrollWidth;
                canvas.height = scrollHeight;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const { source, target, obstacles } = currentLevelConfig;

            // Clear Background
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // --- DRAW GRID ---
            ctx.save();
            ctx.strokeStyle = '#334155'; // Slate-700
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
            for (let y = 0; y <= canvas.height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
            ctx.stroke();
            ctx.restore();


            // --- PHYSICS ENGINE: Ray Tracing ---
            const maxBounces = 200;
            const newRays: Point[][] = [];

            // Debug data to render after rays
            const debugVisuals: { x: number, y: number, normal: number, type: 'reflection' | 'refraction', angleIn: number, angleOut?: number }[] = [];

            let hitTarget = false;

            if (isLaserOn) {
                let rOrigin = { x: source.x, y: source.y };
                const rAngle = source.angle * (Math.PI / 180);
                let rDir = { x: Math.cos(rAngle), y: Math.sin(rAngle) };

                const currentPath: Point[] = [rOrigin];

                for (let i = 0; i < maxBounces; i++) {
                    let closestDist = Infinity;
                    let closestPoint: Point | null = null;
                    let hitObject: OpticalTool | null = null;
                    let hitNormalAngle = 0;
                    let hitNormalVec = { x: 0, y: 0 };

                    // 1. Check Intersection with Bounds (Screen edges)
                    if (rDir.x < 0) {
                        const dx = rOrigin.x;
                        const dist = Math.abs(dx / rDir.x);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPoint = { x: 0, y: rOrigin.y + rDir.y * dist };
                            hitObject = null;
                        }
                    }
                    if (rDir.x > 0) {
                        const dx = canvas.width - rOrigin.x;
                        const dist = Math.abs(dx / rDir.x);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPoint = { x: canvas.width, y: rOrigin.y + rDir.y * dist };
                            hitObject = null;
                        }
                    }
                    if (rDir.y < 0) {
                        const dy = rOrigin.y;
                        const dist = Math.abs(dy / rDir.y);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPoint = { x: rOrigin.x + rDir.x * dist, y: 0 };
                            hitObject = null;
                        }
                    }
                    if (rDir.y > 0) {
                        const dy = canvas.height - rOrigin.y;
                        const dist = Math.abs(dy / rDir.y);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPoint = { x: rOrigin.x + rDir.x * dist, y: canvas.height };
                            hitObject = null;
                        }
                    }

                    // 2. Check Intersection with Tools and Obstacles
                    const allObjects = [...obstacles, ...tools];

                    for (const obj of allObjects) {
                        if (obj.type === 'mirror' || obj.type === 'block' || obj.type === 'wall') {
                            const rad = obj.rotation * (Math.PI / 180);
                            const cos = Math.cos(rad);
                            const sin = Math.sin(rad);
                            const w2 = obj.width / 2;
                            const h2 = (obj.height || 10) / 2;

                            const corners = [
                                { x: -w2, y: -h2 },
                                { x: w2, y: -h2 },
                                { x: w2, y: h2 },
                                { x: -w2, y: h2 }
                            ].map(p => ({
                                x: obj.x + (p.x * cos - p.y * sin),
                                y: obj.y + (p.x * sin + p.y * cos)
                            }));

                            for (let k = 0; k < 4; k++) {
                                const p1 = corners[k];
                                const p2 = corners[(k + 1) % 4];

                                const x1 = rOrigin.x; const y1 = rOrigin.y;
                                const x2 = x1 + rDir.x * 10000; const y2 = y1 + rDir.y * 10000;
                                const x3 = p1.x; const y3 = p1.y;
                                const x4 = p2.x; const y4 = p2.y;

                                const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                                if (den === 0) continue;

                                const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
                                const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

                                if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                                    const px = x1 + t * (x2 - x1);
                                    const py = y1 + t * (y2 - y1);
                                    const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

                                    if (dist < closestDist && dist > 1e-6) {
                                        closestDist = dist;
                                        closestPoint = { x: px, y: py };
                                        hitObject = obj;
                                        const edgeAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                                        hitNormalAngle = edgeAngle - Math.PI / 2;
                                        hitNormalVec = { x: Math.cos(hitNormalAngle), y: Math.sin(hitNormalAngle) };
                                    }
                                }
                            }
                        } else if (obj.type === 'lens') {
                            const rad = -obj.rotation * (Math.PI / 180);
                            const termX = rOrigin.x - obj.x;
                            const termY = rOrigin.y - obj.y;
                            const localOriginX = termX * Math.cos(rad) - termY * Math.sin(rad);
                            const localOriginY = termX * Math.sin(rad) + termY * Math.cos(rad);

                            const rAngle = Math.atan2(rDir.y, rDir.x);
                            const localRayAngle = rAngle + rad;
                            const localDirX = Math.cos(localRayAngle);
                            const localDirY = Math.sin(localRayAngle);

                            const w = obj.width;
                            const h = obj.height;
                            const s = w / 2;
                            const cLen = h;
                            const R = (s * s + (cLen / 2) * (cLen / 2)) / (2 * s);
                            const c1x = R - w / 2;
                            const c2x = -(R - w / 2);

                            const checkCircle = (cx: number, cy: number, r: number) => {
                                const Lx = localOriginX - cx;
                                const Ly = localOriginY - cy;
                                const A = localDirX * localDirX + localDirY * localDirY;
                                const B = 2 * (Lx * localDirX + Ly * localDirY);
                                const C = Lx * Lx + Ly * Ly - r * r;
                                const det = B * B - 4 * A * C;
                                if (det < 0) return null;
                                return [(-B - Math.sqrt(det)) / (2 * A), (-B + Math.sqrt(det)) / (2 * A)].filter(t => t > 1e-4);
                            };

                            const hits1 = checkCircle(c1x, 0, R);
                            const hits2 = checkCircle(c2x, 0, R);

                            const allHits: { t: number, surface: number, cx: number }[] = [];
                            if (hits1) allHits.push(...hits1.map(t => ({ t, surface: 1, cx: c1x })));
                            if (hits2) allHits.push(...hits2.map(t => ({ t, surface: 2, cx: c2x })));

                            allHits.sort((a, b) => a.t - b.t);

                            for (const hit of allHits) {
                                const hx = localOriginX + hit.t * localDirX;
                                const hy = localOriginY + hit.t * localDirY;

                                if (Math.abs(hy) > h / 2) continue;

                                const distToC1Sq = (hx - c1x) ** 2 + (hy - 0) ** 2;
                                const distToC2Sq = (hx - c2x) ** 2 + (hy - 0) ** 2;
                                const RSq = R * R;
                                const eps = 1.0;

                                if (hit.surface === 1) {
                                    if (distToC2Sq > RSq + eps) continue;
                                } else {
                                    if (distToC1Sq > RSq + eps) continue;
                                }

                                if (hit.t < closestDist) {
                                    closestDist = hit.t;
                                    closestPoint = {
                                        x: rOrigin.x + hit.t * rDir.x,
                                        y: rOrigin.y + hit.t * rDir.y
                                    };
                                    hitObject = obj;
                                    let nx = hx - hit.cx;
                                    let ny = hy - 0;
                                    const len = Math.sqrt(nx * nx + ny * ny);
                                    nx /= len; ny /= len;

                                    const worldRad = obj.rotation * (Math.PI / 180);
                                    const wnx = nx * Math.cos(worldRad) - ny * Math.sin(worldRad);
                                    const wny = nx * Math.sin(worldRad) + ny * Math.cos(worldRad);
                                    hitNormalAngle = Math.atan2(wny, wnx);
                                    hitNormalVec = { x: wnx, y: wny };
                                }
                                break;
                            }
                        }
                    }

                    if (closestPoint) {
                        currentPath.push(closestPoint);
                        if (hitObject) {
                            if (hitObject.type === 'mirror') {
                                const dot = rDir.x * hitNormalVec.x + rDir.y * hitNormalVec.y;
                                if (dot > 0) {
                                    hitNormalVec.x = -hitNormalVec.x;
                                    hitNormalVec.y = -hitNormalVec.y;
                                    hitNormalAngle += Math.PI;
                                }
                                const dotR = rDir.x * hitNormalVec.x + rDir.y * hitNormalVec.y;
                                rDir = {
                                    x: rDir.x - 2 * dotR * hitNormalVec.x,
                                    y: rDir.y - 2 * dotR * hitNormalVec.y
                                };
                                rOrigin = closestPoint;
                                debugVisuals.push({
                                    x: closestPoint.x, y: closestPoint.y, normal: hitNormalAngle, type: 'reflection',
                                    angleIn: parseFloat(((Math.acos(Math.abs(dot)) * 180 / Math.PI)).toFixed(1))
                                });
                            } else if (hitObject.type === 'wall') {
                                break;
                            } else if (hitObject.type === 'block' || hitObject.type === 'lens') {
                                const nGlass = hitObject.params?.refractiveIndex || 1.5;
                                const nAir = 1.0;
                                const dot = rDir.x * hitNormalVec.x + rDir.y * hitNormalVec.y;
                                let n1 = nAir, n2 = nGlass, physNormalX = hitNormalVec.x, physNormalY = hitNormalVec.y;
                                const visualNormal = hitNormalAngle;

                                if (dot > 0) {
                                    n1 = nGlass; n2 = nAir;
                                    physNormalX = -hitNormalVec.x; physNormalY = -hitNormalVec.y;
                                }

                                const ratio = n1 / n2;
                                const dotPhys = rDir.x * physNormalX + rDir.y * physNormalY;
                                const c = Math.max(-1, Math.min(1, -dotPhys));
                                let discriminat = 1.0 - ratio * ratio * (1.0 - c * c);
                                if (discriminat < 0 && discriminat > -1e-5) discriminat = 0;

                                const incidenceAngleDeg = (Math.acos(c) * 180 / Math.PI).toFixed(1);

                                if (discriminat < 0) {
                                    const rOutX = rDir.x - 2 * dotPhys * physNormalX;
                                    const rOutY = rDir.y - 2 * dotPhys * physNormalY;
                                    rDir = { x: rOutX, y: rOutY };
                                    debugVisuals.push({
                                        x: closestPoint.x, y: closestPoint.y, normal: visualNormal, type: 'reflection',
                                        angleIn: parseFloat(incidenceAngleDeg)
                                    });
                                } else {
                                    const term2 = ratio * c - Math.sqrt(discriminat);
                                    const rOutX = ratio * rDir.x + term2 * physNormalX;
                                    const rOutY = ratio * rDir.y + term2 * physNormalY;
                                    rDir = { x: rOutX, y: rOutY };
                                    const dotRef = rOutX * (-physNormalX) + rOutY * (-physNormalY);
                                    const refractionAngleDeg = (Math.acos(Math.max(-1, Math.min(1, dotRef))) * 180 / Math.PI).toFixed(1);
                                    debugVisuals.push({
                                        x: closestPoint.x, y: closestPoint.y, normal: visualNormal, type: 'refraction',
                                        angleIn: parseFloat(incidenceAngleDeg), angleOut: parseFloat(refractionAngleDeg)
                                    });
                                }
                                rOrigin = closestPoint;
                            }
                        } else {
                            break;
                        }
                    } else {
                        currentPath.push({ x: rOrigin.x + rDir.x * 10000, y: rOrigin.y + rDir.y * 10000 });
                        break;
                    }
                }
                newRays.push(currentPath);
            }

            // --- DRAWING ---
            ctx.save();
            ctx.translate(source.x, source.y);
            ctx.rotate(source.angle * Math.PI / 180);
            ctx.fillStyle = '#64748b'; ctx.fillRect(-15, -10, 30, 20);
            ctx.fillStyle = '#334155'; ctx.fillRect(5, -5, 10, 10);
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = isLaserOn ? '#ef4444' : '#475569'; ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.translate(target.x, target.y);
            [1, 0.7, 0.4].forEach((scale, idx) => {
                ctx.beginPath(); ctx.arc(0, 0, target.radius * scale, 0, Math.PI * 2);
                ctx.fillStyle = idx % 2 === 0 ? (isLevelComplete ? '#22c55e' : '#ef4444') : '#ffffff'; ctx.fill();
            });
            ctx.restore();

            if (isLaserOn) {
                newRays.forEach(path => {
                    if (path.length < 2) return;
                    ctx.shadowBlur = 10; ctx.shadowColor = '#ef4444'; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
                    for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
                    ctx.stroke();

                    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
                    for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
                    ctx.stroke();
                });

                debugVisuals.forEach(vis => {
                    ctx.save(); ctx.translate(vis.x, vis.y);
                    ctx.rotate(vis.normal);
                    ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 1; ctx.moveTo(0, 0); ctx.lineTo(40, 0); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(35, -3); ctx.lineTo(35, 3); ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#0ff'; ctx.fill();
                    ctx.setLineDash([]);
                    ctx.rotate(-vis.normal);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.font = '10px monospace';
                    ctx.shadowColor = 'black'; ctx.shadowBlur = 2;
                    if (vis.type === 'reflection') {
                        ctx.fillText(`∠i=${vis.angleIn}°`, 10, -10); ctx.fillText(`∠r=${vis.angleIn}°`, 10, 10);
                    } else if (vis.type === 'refraction') {
                        ctx.fillText(`∠i=${vis.angleIn}°`, 10, -10);
                        if (vis.angleOut !== undefined) ctx.fillText(`∠r=${vis.angleOut}°`, 10, 10);
                    }
                    ctx.restore();
                });
            }

            if (isLaserOn && newRays.length > 0) {
                const path = newRays[0];
                for (let i = 0; i < path.length - 1; i++) {
                    const p1 = path[i], p2 = path[i + 1], C = target;
                    const dx = p2.x - p1.x, dy = p2.y - p1.y, lenSq = dx * dx + dy * dy;
                    let t = ((C.x - p1.x) * dx + (C.y - p1.y) * dy) / lenSq;
                    t = Math.max(0, Math.min(1, t));
                    const closestX = p1.x + t * dx, closestY = p1.y + t * dy;
                    if ((closestX - C.x) ** 2 + (closestY - C.y) ** 2 < target.radius ** 2) {
                        hitTarget = true; break;
                    }
                }
            }
            setIsTargetHit(hitTarget);
        };
        render();
    }, [currentLevelConfig, tools, isLevelComplete, isLaserOn, isPlaying]);



    return (
        <div className="flex flex-col w-full h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative">

            {/* 1. Level Selector Bar */}
            <div className="bg-slate-800 p-1 sm:p-2 border-b border-slate-700 hidden md:flex items-center justify-between">
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide px-1 sm:px-2">
                    {levels.map(l => {
                        const isUnlocked = l.id <= maxUnlockedLevel;
                        const isCurrent = l.id === level;
                        let bgClass = "bg-slate-700 text-slate-400";
                        if (isCurrent) bgClass = "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400";
                        else if (isUnlocked) bgClass = "bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600/30";
                        else bgClass = "bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-50";

                        return (
                            <button
                                key={l.id}
                                onClick={() => handleSelectLevel(l.id)}
                                disabled={!isUnlocked}
                                className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-all min-w-[24px] sm:min-w-[32px] ${bgClass}`}
                            >
                                {l.id}
                            </button>
                        )
                    })}
                </div>
                <div className="text-xs text-slate-400 font-mono px-2 hidden sm:block">
                    Levels: {maxUnlockedLevel}/10
                </div>
            </div>

            {/* 2. Main Game Header */}
            <div className="bg-slate-800/90 p-1 sm:p-3 flex flex-wrap items-center justify-between gap-1 sm:gap-3 z-10 backdrop-blur-sm border-b border-white/5 relative">
                <div className="flex-1 min-w-[60px]">
                    <h2 className="text-xs sm:text-lg font-bold text-white flex items-center gap-1 truncate">
                        <span className="text-blue-400">L{level}</span>
                        <span className="hidden md:inline text-xs">: {currentLevelConfig.name}</span>
                    </h2>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => setLeaderboardOpen(!leaderboardOpen)}
                        className={`p-1 sm:p-2 rounded transition-colors ${leaderboardOpen ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}
                        title="Тэргүүлэгчид"
                    >
                        <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>

                    <button
                        onClick={() => setIsLaserOn(!isLaserOn)}
                        className={`flex items-center justify-center p-1 sm:p-2 rounded text-xs sm:text-sm font-medium transition-colors ${isLaserOn
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-slate-700 text-slate-400'
                            }`}
                        title="Лазер"
                    >
                        {isLaserOn ? <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" /> : <LightbulbOff className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </button>

                    <div className="font-mono text-xs sm:text-lg text-yellow-500 bg-black/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-yellow-500/20 tabular-nums min-w-[40px] sm:min-w-[70px] text-center hidden sm:block">
                        {(elapsedTime / 1000).toFixed(1)}s
                    </div>

                    {isTeacher ? (
                        isPlaying || element.gameStatus === 'playing' ? (
                            <Button variant="destructive" size="sm" onClick={() => { setIsPlaying(false); }} className="h-6 px-2 sm:h-8 sm:px-3">
                                <Pause className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                <span className="hidden md:inline text-xs">Stop</span>
                            </Button>
                        ) : (
                            <Button size="sm" onClick={handleGlobalStart} className="bg-green-600 hover:bg-green-500 h-6 px-2 sm:h-8 sm:px-3 shadow-lg shadow-green-500/20 animate-pulse">
                                <Play className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                <span className="hidden md:inline text-xs">Start</span>
                            </Button>
                        )
                    ) : (
                        isPlaying ? (
                            <div className="text-xs text-green-400 font-medium px-2 py-1 bg-green-500/10 rounded flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Playing
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-800 rounded">
                                Waiting
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Canvas + Toolbar Container */}
            <div className="flex flex-row md:flex-col flex-1 min-h-0">
                <div
                    ref={containerRef}
                    className="flex-1 relative bg-slate-900 overflow-auto touch-pan-x touch-pan-y"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0) 0%, rgba(2, 6, 23, 1) 100%)'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        className="cursor-crosshair shadow-2xl mx-auto my-auto relative z-0"
                    />

                    <div className="absolute inset-0 pointer-events-none">
                        {[...currentLevelConfig.obstacles, ...tools].map(tool => (
                            <div
                                key={tool.id}
                                className={`absolute ${tool.isLocked ? '' : 'cursor-move pointer-events-auto touch-none'} z-10`}
                                style={{
                                    left: tool.x,
                                    top: tool.y,
                                    width: tool.width,
                                    height: tool.height || 10,
                                    transform: `translate(-50%, -50%) rotate(${tool.rotation}deg)`
                                }}
                                onPointerDown={(e) => {
                                    if (tool.isLocked) return;
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDragState({
                                        type: 'move', toolId: tool.id,
                                        startX: e.clientX, startY: e.clientY,
                                        startValueX: tool.x, startValueY: tool.y
                                    });
                                }}
                            >
                                {tool.type === 'mirror' && (
                                    <div className={`w-full h-full bg-slate-300 border-b-4 ${tool.isLocked ? 'border-slate-600 bg-slate-500' : 'border-slate-500'} rounded-sm shadow-md overflow-hidden relative`}>
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent opacity-50" />
                                    </div>
                                )}
                                {tool.type === 'block' && (
                                    <div className={`w-full h-full ${tool.isLocked ? 'bg-slate-700 border-slate-500' : 'bg-blue-100/30 border-blue-300/50'} border backdrop-blur-[2px] rounded-sm shadow-inner relative overflow-hidden`} />
                                )}
                                {tool.type === 'wall' && (
                                    <div className="w-full h-full bg-stone-800 border-2 border-stone-600 rounded-sm shadow-lg pattern-diagonal-lines pattern-stone-900 pattern-bg-stone-800 pattern-opacity-20 pattern-size-2" />
                                )}
                                {tool.type === 'lens' && (
                                    <div className="w-full h-full relative flex items-center justify-center">
                                        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
                                            <path d="M 50 0 Q 100 50 50 100 Q 0 50 50 0 Z" className="fill-blue-400/30 stroke-blue-400 stroke-[2px]" vectorEffect="non-scaling-stroke" />
                                        </svg>
                                    </div>
                                )}

                                {!tool.isLocked && (
                                    <div
                                        className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center cursor-ew-resize hover:bg-slate-600 transition-colors pointer-events-auto border border-white/20 shadow-lg z-50"
                                        title="Эргүүлэх"
                                        onPointerDown={(e) => {
                                            e.stopPropagation(); e.preventDefault();
                                            setDragState({
                                                type: 'rotate', toolId: tool.id,
                                                startX: e.clientX, startY: e.clientY,
                                                startValueX: tool.rotation, startValueY: 0
                                            });
                                        }}
                                    >
                                        <RotateCw className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Global Toolbar */}
                <div className="bg-slate-800 p-1 md:p-3 border-l md:border-l-0 md:border-t border-slate-700 flex flex-col md:flex-row justify-center items-center gap-1 md:gap-4 z-20 w-12 md:w-auto">
                    <p className="text-white text-xs font-medium self-center hidden lg:block rotate-0">Багаж:</p>
                    <button onClick={() => addTool('mirror')} className="flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white w-10 h-16 md:w-16 md:h-16 rounded border border-slate-600 transition-all active:scale-95 group">
                        <div className="w-5 h-0.5 md:w-7 md:h-1 bg-slate-300 rotate-[-45deg] mb-0.5 group-hover:shadow-[0_0_10px_white]"></div>
                        <span className="text-[7px] md:text-[10px]">Толь</span>
                    </button>
                    <button onClick={() => addTool('block')} className="flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white w-10 h-16 md:w-16 md:h-16 rounded border border-slate-600 transition-all active:scale-95 group">
                        <div className="w-4 h-4 md:w-6 md:h-6 bg-blue-400/30 border border-blue-400 mb-0.5 group-hover:shadow-[0_0_15px_blue]"></div>
                        <span className="text-[7px] md:text-[10px]">Шил</span>
                    </button>
                    <button onClick={() => addTool('lens')} className="flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 text-white w-10 h-16 md:w-16 md:h-16 rounded border border-slate-600 transition-all active:scale-95 group">
                        <div className="w-5 h-2.5 md:w-7 md:h-4 rounded-[100%] bg-blue-400/30 border border-blue-400 mb-0.5 group-hover:shadow-[0_0_15px_blue] transform rotate-90"></div>
                        <span className="text-[7px] md:text-[10px]">Линз</span>
                    </button>
                </div>
            </div>

            {/* Waiting for Teacher Overlay */}
            {!isTeacher && !isPlaying && element.gameStatus !== 'playing' && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-40 p-6 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <Play className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Багш эхлүүлэхийг хүлээж байна...</h3>
                    <p className="text-slate-400">Багш &quot;Эхлэх&quot; товчийг дарснаар тоглоом эхэлнэ.</p>
                </div>
            )}

            {/* Leaderboard Sidebar */}
            <div className={`absolute top-[60px] bottom-0 right-0 w-64 bg-slate-900/95 border-l border-slate-700 backdrop-blur-xl transition-transform duration-300 z-30 transform ${leaderboardOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        Тэргүүлэгчид
                    </h3>
                    <button onClick={() => setLeaderboardOpen(false)} className="text-slate-400 hover:text-white">
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-y-auto h-[calc(100%-60px)] p-2">
                    {Object.values(element.studentProgress || {})
                        .sort((a, b) => {
                            if (b.level !== a.level) return b.level - a.level;
                            return a.time - b.time;
                        })
                        .map((p, idx) => (
                            <div key={p.name} className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${idx === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800/50'}`}>
                                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{p.name}</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Lvl {p.level}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(p.time / 1000).toFixed(0)}s</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                    {Object.keys(element.studentProgress || {}).length === 0 && (
                        <div className="text-center text-slate-500 py-8 text-sm">
                            Хараахан үр дүн алга...
                        </div>
                    )}
                </div>
            </div>

            {/* Level Complete Overlay */}
            {isLevelComplete && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 p-8 rounded-2xl border border-green-500/50 text-center shadow-2xl animate-in fade-in zoom-in duration-300 max-w-sm w-full mx-4">
                        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
                        <h2 className="text-2xl font-bold text-white mb-2">Баяр хүргэе!</h2>
                        <p className="text-slate-300 mb-6">Даалгавар биеллээ! Дараагийн үе 3 секундын дараа...</p>
                        <div className="text-4xl font-mono text-green-400 mb-6 font-bold">
                            {(elapsedTime / 1000).toFixed(2)}s
                        </div>
                        <Button
                            className="bg-green-600 hover:bg-green-500 w-full"
                            onClick={() => {
                                if (level < 10) {
                                    setLevel(level + 1); setTools([]); setElapsedTime(0);
                                    setIsLevelComplete(false); setIsPlaying(true);
                                } else {
                                    toast.success("Та бүх үеийг давлаа!");
                                    setIsLevelComplete(false);
                                }
                            }}
                        >
                            <ArrowRight className="w-4 h-4 mr-2" />
                            {level < 10 ? 'Дараагийн үе' : 'Дуусгах'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

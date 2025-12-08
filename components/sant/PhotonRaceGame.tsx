'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw, Trophy, Flag, RotateCcw, Timer, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Slider } from "@/components/ui/slider";

// Environments
const ENVIRONMENTS = [
    { id: 'air', name: 'Агаар', n: 1.00, color: '#f0f9ff' },
    { id: 'water', name: 'Ус', n: 1.33, color: '#cffafe' },
    { id: 'glass', name: 'Шил', n: 1.50, color: '#dbeafe' },
    { id: 'diamond', name: 'Алмаз', n: 2.42, color: '#e0e7ff' },
];

interface PlayerStats {
    name: string;
    time: number | null;
    rank: number | null;
    finishedAt: string;
    path: { x: number, y: number }[];
}

interface PhotonRaceProps {
    isTeacher: boolean;
    isAllowedDraw: boolean;
    element: {
        id: string;
        gameStatus?: string;
        players?: Record<string, PlayerStats>;
        envs?: { id: string; name: string; n: number; color: string }[];
        raceStartedAt?: any; // Timestamp or number
        duration?: number;
        pointA?: { x: number; y: number };
        pointB?: { x: number; y: number };
        optimalPath?: { x: number; y: number }[];
        optimalTime?: number;
    };
    sessionId: string;
    currentPage: number;
    userName: string;
}

export default function PhotonRaceGame(props: PhotonRaceProps) {
    const { isTeacher, isAllowedDraw, element, sessionId, userName } = props;
    const [pathPoints, setPathPoints] = useState<{ x: number, y: number }[]>([]);
    const [timeLeft, setTimeLeft] = useState(10.0);

    // Mobile Tab State
    const [activeTab, setActiveTab] = useState<'race' | 'leaderboard'>('race');

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const draggingPoint = useRef<'A' | 'B' | null>(null);

    // Game State from Element Data
    const gameStatus = element.gameStatus || 'waiting';
    const players = element.players || {};
    const envs = element.envs || ENVIRONMENTS;
    const myId = userName.replace(/\s+/g, '_');

    // Helper to safely get millis
    const getSafeMillis = (val: any): number => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (val.toMillis) return val.toMillis();
        if (val.seconds) return val.seconds * 1000;
        return 0;
    };

    const raceStartedAt = getSafeMillis(element.raceStartedAt);
    const raceDuration = element.duration || 10; // Seconds

    // Points A and B (Percent coordinates 0-1)
    const pointA = useMemo(() => element.pointA || { x: 0.1, y: 0.1 }, [element.pointA]);
    const pointB = useMemo(() => element.pointB || { x: 0.9, y: 0.9 }, [element.pointB]);

    // My Stats
    const myStats: PlayerStats | undefined = players[myId];
    const hasSubmitted = !!myStats?.time;

    // Calculate my rank based on times
    const sortedPlayers = Object.values(players)
        .filter((p: PlayerStats) => p.time && p.time < 99990)
        .sort((a: PlayerStats, b: PlayerStats) => (a.time || 9999) - (b.time || 9999));
    const myRank = sortedPlayers.findIndex((p: PlayerStats) => p.name === userName) + 1;

    const submittedRef = useRef(false); // Prevent duplicate submissions

    // --------------------------------------------------------------------------------
    // Helper Functions (defined early to use in useEffect)
    // --------------------------------------------------------------------------------
    const updateGameElement = useCallback(async (updates: Record<string, unknown>) => {
        try {
            const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(props.currentPage), 'elements', element.id);
            await updateDoc(elementRef, updates);
        } catch (e) {
            console.error('❌ Firestore error:', e);
        }
    }, [sessionId, props.currentPage, element.id]);

    const submitResult = useCallback(async (points: { x: number, y: number }[], forced = false) => {
        // Prevent duplicate submissions
        if (hasSubmitted || submittedRef.current) return;

        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;

        // Convert path points to relative coordinates (0-1)
        const relPoints = points.map(p => ({ x: p.x / w, y: p.y / h }));

        const lastP = relPoints[relPoints.length - 1];
        const finished = lastP && Math.hypot(lastP.x - pointB.x, lastP.y - pointB.y) < 0.15; // 15% threshold

        if (finished || forced) {
            let totalTime = 99999;
            if (finished) {
                // Calculate time using relative coordinates (consistent across devices)
                const c = 1; // Normalized speed constant
                let t = 0;
                for (let i = 0; i < relPoints.length - 1; i++) {
                    const p1 = relPoints[i];
                    const p2 = relPoints[i + 1];
                    // Use normalized distance (relative coords)
                    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

                    // Determine environment by midpoint (relative coords)
                    const mx = (p1.x + p2.x) / 2;
                    const my = (p1.y + p2.y) / 2;
                    let ei = 0;
                    if (mx < 0.5 && my < 0.5) ei = 0;
                    else if (mx >= 0.5 && my < 0.5) ei = 1;
                    else if (mx < 0.5 && my >= 0.5) ei = 2;
                    else ei = 3;

                    // Time = distance / velocity, velocity = c / n
                    t += dist / (c / envs[ei].n);
                }
                totalTime = t;
            }

            const newStats = {
                name: userName,
                time: finished ? totalTime : 99999,
                rank: 0,
                finishedAt: new Date().toISOString(),
                path: relPoints // Store relative points
            };

            // Mark as submitted before async call to prevent duplicates
            submittedRef.current = true;

            await updateGameElement({ [`players.${myId}`]: newStats });
            if (finished) toast.success(`Барианд орлоо! ${totalTime.toFixed(2)}`);
            else if (forced) toast.warning("Хугацаа дууссан.");
        }
    }, [hasSubmitted, pointB, envs, userName, myId, updateGameElement]);

    const handleAutoSubmit = useCallback(() => submitResult(pathPoints, true), [submitResult, pathPoints]);

    // --------------------------------------------------------------------------------
    // 1. TIMER & LOOP
    // --------------------------------------------------------------------------------
    useEffect(() => {
        if (gameStatus !== 'racing' || !raceStartedAt) {
            if (gameStatus === 'waiting') setTimeLeft(raceDuration);
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.max(0, Date.now() - raceStartedAt);
            const remaining = Math.max(0, raceDuration - (elapsed / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                clearInterval(interval);

                // Student: Auto Submit
                if (!isTeacher && !hasSubmitted) {
                    handleAutoSubmit();
                }

                // Teacher: Close Race
                if (isTeacher) {
                    // Update status to finished if not already
                    updateGameElement({ gameStatus: 'finished' });
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [gameStatus, raceStartedAt, hasSubmitted, isTeacher, raceDuration, handleAutoSubmit, updateGameElement]);



    // --------------------------------------------------------------------------------
    // 3. ACTIONS
    // --------------------------------------------------------------------------------
    const handleStartRace = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await updateGameElement({
            gameStatus: 'racing',
            players: {},
            raceStartedAt: serverTimestamp()
        });
        toast.success(`Уралдаан эхэллээ! ${raceDuration} секунд!`);
    };

    const handleStopRace = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await updateGameElement({ gameStatus: 'finished' });
    };

    const handleResetPath = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPathPoints([]);
    };

    const handleShuffle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newEnvs = [...envs];
        newEnvs.push(newEnvs.shift()!);
        await updateGameElement({ envs: newEnvs });
    };

    const calculateAndSubmit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pathPoints.length < 2) return;
        await submitResult(pathPoints);
    };



    // --------------------------------------------------------------------------------
    // 4. DRAWING & DRAGGING
    // --------------------------------------------------------------------------------
    const startInteraction = (e: React.PointerEvent) => {
        e.stopPropagation(); // CRITICAL FIX: Prevent main canvas from reacting

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        // Check if Teacher Dragging Points
        if (isTeacher) {
            const Ax = pointA.x * w; const Ay = pointA.y * h;
            const Bx = pointB.x * w; const By = pointB.y * h;
            if (Math.hypot(x - Ax, y - Ay) < 20) { draggingPoint.current = 'A'; return; }
            if (Math.hypot(x - Bx, y - By) < 20) { draggingPoint.current = 'B'; return; }
        }

        // Else Start Drawing (If allowed)
        if ((isAllowedDraw || isTeacher) && gameStatus === 'racing' && !hasSubmitted && timeLeft > 0) {
            draggingPoint.current = null;
            isDrawing.current = true;
            setPathPoints([{ x, y }]);
        }
    };

    const interact = (e: React.PointerEvent) => {
        // Only stop prop if interacting with THIS canvas
        // (Pointer events on canvas usually imply this, but failsafe)
        e.stopPropagation();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (draggingPoint.current) {
            updateGameElement({
                [draggingPoint.current === 'A' ? 'pointA' : 'pointB']: { x: x / rect.width, y: y / rect.height }
            });
            return;
        }

        if (isDrawing.current) {
            setPathPoints(prev => [...prev, { x, y }]);
        }
    };

    const endInteraction = (e: React.PointerEvent) => {
        e.stopPropagation();
        const canvas = canvasRef.current;
        if (canvas) canvas.releasePointerCapture(e.pointerId);
        isDrawing.current = false;
        draggingPoint.current = null;
    };

    // --------------------------------------------------------------------------------
    // 5. RENDER
    // --------------------------------------------------------------------------------
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        // Use container dimensions if available for full responsiveness
        if (!canvas || !container) return;

        const resizeObserver = new ResizeObserver(() => {
            const rect = container.getBoundingClientRect();
            // Set canvas logic dimensions matching CSS dimensions
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Re-render
            renderCanvas();
        });

        resizeObserver.observe(container);

        const renderCanvas = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Grid Lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

            const Ax = pointA.x * w; const Ay = pointA.y * h;
            const Bx = pointB.x * w; const By = pointB.y * h;

            // Draw My Path
            if (pathPoints.length > 0) {
                ctx.beginPath();
                ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
                for (let i = 1; i < pathPoints.length; i++) ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();
            }

            // Points
            const drawPoint = (x: number, y: number, label: string, color: string) => {
                // Outer glow/stroke
                ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
                ctx.fillStyle = color; ctx.fill();
                ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();

                // Label
                ctx.fillStyle = 'white'; ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(label, x, y);
            };
            drawPoint(Ax, Ay, 'A', '#16A34A'); // Green
            drawPoint(Bx, By, 'B', '#DC2626'); // Red
        };

        // Initial paint
        renderCanvas();

        return () => resizeObserver.disconnect();
    }, [pathPoints, envs, timeLeft, pointA, pointB, gameStatus]);

    const Leaderboard = () => (
        <div className="h-full border-l bg-stone-50 overflow-y-auto p-2 custom-scrollbar touch-pan-y">
            <div className="text-xs font-bold uppercase text-stone-500 mb-2 sticky top-0 bg-stone-50 py-1 z-10">Leaderboard</div>
            {Object.values(players)
                .filter((p: PlayerStats) => p.time && p.time < 99990)
                .sort((a: PlayerStats, b: PlayerStats) => (a.time || 9999) - (b.time || 9999))
                .map((p: PlayerStats, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs p-2 rounded mb-1 ${p.name === userName ? 'bg-blue-100 ring-1 ring-blue-300' : 'bg-white border'} `}>
                        <div className="flex items-center gap-2">
                            <span className={`font-mono w-4 text-center ${i === 0 ? 'text-yellow-600 font-bold' : 'text-stone-400'} `}>{i + 1}</span>
                            <span className="truncate max-w-[80px]">{p.name}</span>
                        </div>
                        <span className="font-mono font-semibold">{p.time?.toFixed(1)}</span>
                    </div>
                ))}
            {Object.keys(players).length === 0 && (
                <div className="text-xs text-stone-400 p-2 text-center">No results yet</div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row w-full h-full bg-white relative overflow-hidden select-none">
            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex border-b bg-stone-100">
                <button
                    onClick={() => setActiveTab('race')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 ${activeTab === 'race' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-stone-500'}`}
                >
                    <Flag className="w-4 h-4" /> Race
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 ${activeTab === 'leaderboard' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-stone-500'}`}
                >
                    <Trophy className="w-4 h-4" /> Leaderboard
                </button>
            </div>

            {/* Main Game Area (Visible if Desktop OR ActiveTab is Race) */}
            <div className={`flex-1 flex flex-col relative ${activeTab === 'race' ? 'flex' : 'hidden lg:flex'}`}>
                {/* Header Controls */}
                <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-stone-50 border-b z-20 gap-2">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-sm hidden sm:inline">Photon</span>
                        <div className="flex items-center gap-1 bg-stone-200 rounded px-2 py-0.5 ml-1">
                            <Timer className="w-3 h-3" />
                            <span className={`text-xs font-mono font-bold ${timeLeft < 3 && gameStatus === 'racing' ? 'text-red-600 animate-pulse' : 'text-stone-700'} `}>
                                {timeLeft.toFixed(1)}s
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 ml-auto">
                        {/* Teacher Controls */}
                        {isTeacher && (
                            <>
                                <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-2">
                                    <span className="text-[10px] text-stone-500 font-bold uppercase hidden sm:inline">Time:</span>
                                    <Slider
                                        className="w-16 sm:w-20"
                                        min={5} max={60} step={5}
                                        value={[raceDuration]}
                                        onValueChange={([v]) => updateGameElement({ duration: v })}
                                        disabled={gameStatus === 'racing'}
                                    />
                                    <span className="text-xs w-5 text-center">{raceDuration}</span>
                                </div>

                                {gameStatus === 'racing' ? (
                                    <Button size="sm" variant="destructive" onClick={handleStopRace} className="h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm">
                                        <StopCircle className="w-3 h-3 mr-1" /> <span className="hidden sm:inline">Stop</span>
                                    </Button>
                                ) : (
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="outline" onClick={handleShuffle} className="h-7 w-7 p-0 sm:h-8 sm:w-auto sm:px-3">
                                            <RefreshCw className="w-3 h-3 sm:mr-1" />
                                        </Button>
                                        <Button size="sm" onClick={handleStartRace} className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs sm:h-8 sm:px-3 sm:text-sm">
                                            <Play className="w-3 h-3 mr-1" /> Start
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Student Reset */}
                        {!isTeacher && gameStatus === 'racing' && !hasSubmitted && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleResetPath}>
                                <RotateCcw className="w-3 h-3 mr-1" /> Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Canvas Container */}
                <div className="flex-1 relative w-full h-full overflow-hidden" ref={containerRef}>
                    {/* Environment Layer */}
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 w-full h-full pointer-events-none">
                        {envs.map((env: { id: string; name: string; n: number; color: string }, i: number) => (
                            <div key={i} style={{ backgroundColor: env.color }} className="flex items-center justify-center opacity-80 border border-white/50">
                                <div className="text-center select-none"><div className="text-xs font-bold">{env.name}</div><div className="text-[10px]">n={env.n}</div></div>
                            </div>
                        ))}
                    </div>

                    {/* Interactive Layer (Canvas) */}
                    <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 w-full h-full z-10 touch-none outline-none ${isTeacher ? 'cursor-move' : (gameStatus === 'racing' && !hasSubmitted ? 'cursor-crosshair' : 'cursor-default')} `}
                        onPointerDown={startInteraction}
                        onPointerMove={interact}
                        onPointerUp={endInteraction}
                        onPointerLeave={endInteraction}
                    />

                    {/* Rank Display for all players when game is finished */}
                    {gameStatus === 'finished' && hasSubmitted && myRank > 0 && (
                        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center flex-col animate-in zoom-in duration-500 bg-white/30 backdrop-blur-[1px]">
                            {myRank === 1 && (
                                <>
                                    <div className="text-5xl sm:text-6xl mb-2">🎉</div>
                                    <div className="bg-yellow-400 text-black px-4 sm:px-6 py-2 rounded-full font-bold shadow-xl border-4 border-white text-lg sm:text-xl">ТҮРҮҮЛЛЭЭ!</div>
                                </>
                            )}
                            {myRank === 2 && (
                                <>
                                    <div className="text-5xl sm:text-6xl mb-2">🥈</div>
                                    <div className="bg-gray-300 text-black px-4 sm:px-6 py-2 rounded-full font-bold shadow-xl border-4 border-white text-lg sm:text-xl">2-р байр!</div>
                                </>
                            )}
                            {myRank === 3 && (
                                <>
                                    <div className="text-5xl sm:text-6xl mb-2">🥉</div>
                                    <div className="bg-amber-600 text-white px-4 sm:px-6 py-2 rounded-full font-bold shadow-xl border-4 border-white text-lg sm:text-xl">3-р байр!</div>
                                </>
                            )}
                            {myRank > 3 && (
                                <>
                                    <div className="text-4xl sm:text-5xl mb-2">🏁</div>
                                    <div className="bg-blue-500 text-white px-4 sm:px-6 py-2 rounded-full font-bold shadow-xl border-4 border-white text-lg sm:text-xl">{myRank}-р байр</div>
                                </>
                            )}
                            <div className="mt-2 text-sm bg-white/80 px-3 py-1 rounded-full shadow">
                                Хугацаа: {myStats?.time?.toFixed(2)}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    {!isTeacher && gameStatus === 'racing' && !hasSubmitted && pathPoints.length > 2 && (
                        <Button onClick={calculateAndSubmit} className="absolute bottom-4 right-4 z-30 shadow-xl animate-in fade-in slide-in-from-bottom-5">
                            Submit <Flag className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Sidebar (Leaderboard) - Conditionally rendered */}
            <div className={`w-full lg:w-48 lg:border-l bg-stone-50 flex-shrink-0 ${activeTab === 'leaderboard' ? 'flex-1 overflow-hidden' : 'hidden lg:block'}`}>
                <Leaderboard />
            </div>
        </div>
    );
}

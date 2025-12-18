'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Target, Zap,
    Settings, Trophy, RotateCcw, Clock, Footprints, ListOrdered,
    UserX, Map as MapIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

// --- TYPES ---

interface Magnet {
    x: number;
    y: number;
    power: number;
}

interface GameResult {
    userName: string;
    moves: number;
    time: number;
    status: 'won' | 'lost';
    caughtAt?: { x: number; y: number };
    timestamp: number;
}

interface MagneticMinesweeperElement {
    id: string;
    type: 'magnetic_minesweeper';
    gameStatus: 'setup' | 'playing' | 'won' | 'lost';
    gridSize: number;
    magnets: Magnet[];
    discoveredMagnets: number[];
    startPos: { x: number; y: number };
    targetPos: { x: number; y: number };
    results: GameResult[];
    gameStartTime?: number;
}

interface MagneticMinesweeperProps {
    isTeacher: boolean;
    element: MagneticMinesweeperElement;
    sessionId: string;
    currentPage: number;
    userName: string;
}

export default function MagneticMinesweeper({ isTeacher, element, sessionId, currentPage, userName }: MagneticMinesweeperProps) {
    const GRID_SIZE = element.gridSize || 10;
    const magnets = useMemo(() => element.magnets || [], [element.magnets]);
    const discoveredMagnets = useMemo(() => element.discoveredMagnets || [], [element.discoveredMagnets]);
    const startPos = useMemo(() => element.startPos || { x: 0, y: 0 }, [element.startPos]);
    const targetPos = useMemo(() => element.targetPos || { x: GRID_SIZE - 1, y: GRID_SIZE - 1 }, [element.targetPos, GRID_SIZE]);
    const gameStatus = element.gameStatus || 'setup';
    const allResults = useMemo(() => element.results || [], [element.results]);

    // Local state for current session (to avoid too many Firestore writes)
    const [ballPos, setBallPos] = useState(startPos);
    const [moveCount, setMoveCount] = useState(0);
    const [timer, setTimer] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [shortestPath, setShortestPath] = useState<{ x: number, y: number }[]>([]);

    // Reset local ball when startPos or status changes (sync from Firestore)
    useEffect(() => {
        if (gameStatus === 'setup') {
            setBallPos(startPos);
            setMoveCount(0);
            setTimer(0);
            setShortestPath([]);
        } else {
            // Ensure ball is at least initialized if sync happens late
            setBallPos(prev => (prev.x === -1 ? startPos : prev));
        }
    }, [startPos, gameStatus]);

    // Timer Logic
    useEffect(() => {
        if (gameStatus === 'playing') {
            timerRef.current = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameStatus]);

    const updateElement = useCallback(async (updates: Partial<MagneticMinesweeperElement>) => {
        try {
            // Remove undefined values to avoid Firebase errors
            const cleanUpdates = Object.fromEntries(
                Object.entries(updates).filter(([, v]) => v !== undefined)
            );
            if (Object.keys(cleanUpdates).length === 0) return;

            const elRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', element.id);
            await updateDoc(elRef, cleanUpdates);
        } catch (e) {
            console.error("Firebase update error:", e);
        }
    }, [sessionId, currentPage, element.id]);

    // --- PHYSICS / LOGIC ---

    // BFS to find shortest path avoiding magnet influence
    const findShortestPath = useCallback(() => {
        const queue: { x: number, y: number, path: { x: number, y: number }[] }[] = [{ ...startPos, path: [startPos] }];
        const visited = new Set<string>();
        visited.add(`${startPos.x},${startPos.y}`);

        while (queue.length > 0) {
            const { x, y, path } = queue.shift()!;
            if (x === targetPos.x && y === targetPos.y) return path;

            const neighbors = [
                { nx: x + 1, ny: y }, { nx: x - 1, ny: y }, { nx: x, ny: y + 1 }, { nx: x, ny: y - 1 }
            ];

            for (const { nx, ny } of neighbors) {
                if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !visited.has(`${nx},${ny}`)) {
                    // Check magnet influence
                    let isSafe = true;
                    for (const m of magnets) {
                        const d = Math.sqrt(Math.pow(nx - m.x, 2) + Math.pow(ny - m.y, 2));
                        if (d < m.power) { isSafe = false; break; }
                    }
                    if (isSafe) {
                        visited.add(`${nx},${ny}`);
                        queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
                    }
                }
            }
        }
        return [];
    }, [startPos, targetPos, magnets, GRID_SIZE]);

    // Intensity of magnetic field at (x,y) - 0 to 9
    const getIntensity = (x: number, y: number) => {
        let maxIntensity = 0;
        magnets.forEach(m => {
            const d = Math.sqrt(Math.pow(x - m.x, 2) + Math.pow(y - m.y, 2));
            // Power of 1.5. If d=1.0, power/d = 1.5. Let's scale it.
            const intensity = Math.max(0, Math.min(9, Math.floor((m.power / d) * 5)));
            if (intensity > maxIntensity) maxIntensity = intensity;
        });
        return maxIntensity;
    };

    // --- HANDLERS ---

    const handleGameOver = useCallback(async (status: 'won' | 'lost', hitIdx?: number) => {
        const result: GameResult = {
            userName: userName || 'Оюутан',
            moves: moveCount + 1,
            time: timer,
            status,
            timestamp: Date.now()
        };

        if (hitIdx !== undefined && magnets[hitIdx]) {
            result.caughtAt = { x: magnets[hitIdx].x, y: magnets[hitIdx].y };
        }

        const newResults = [...allResults, result];
        const newDiscovered = hitIdx !== undefined ? Array.from(new Set([...discoveredMagnets, hitIdx])) : discoveredMagnets;

        // Show shortest path at the end
        setShortestPath(findShortestPath());

        // Update Firestore
        if (status === 'won') {
            await updateDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', element.id), {
                results: newResults,
                gameStatus: 'won'
            });
            toast.success("БАЯР ХҮРГЭЕ! Барианд орлоо.");
        } else {
            // "Lost" just resets the player for now, but records the result
            await updateDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', element.id), {
                results: newResults,
                discoveredMagnets: newDiscovered
            });
            setBallPos(startPos);
            toast.error("Соронзонд баригдлаа! Эхнээс нь...");
        }
    }, [userName, moveCount, timer, magnets, allResults, discoveredMagnets, findShortestPath, sessionId, currentPage, element.id, startPos]);

    const moveBall = useCallback((dx: number, dy: number) => {
        if (gameStatus !== 'playing') return;

        const newX = Math.max(0, Math.min(GRID_SIZE - 1, ballPos.x + dx));
        const newY = Math.max(0, Math.min(GRID_SIZE - 1, ballPos.y + dy));

        if (newX === ballPos.x && newY === ballPos.y) return;

        setMoveCount(m => m + 1);
        setBallPos({ x: newX, y: newY });

        // Check for Magnet Collisions
        let hitIdx = -1;
        magnets.forEach((m, idx) => {
            const dist = Math.sqrt(Math.pow(newX - m.x, 2) + Math.pow(newY - m.y, 2));
            if (dist < m.power) hitIdx = idx;
        });

        if (hitIdx >= 0) {
            handleGameOver('lost', hitIdx);
        } else if (newX === targetPos.x && newY === targetPos.y) {
            handleGameOver('won');
        }
    }, [gameStatus, GRID_SIZE, ballPos.x, ballPos.y, magnets, targetPos, handleGameOver]);

    // --- TEACHER ACTIONS ---
    const toggleMagnet = (x: number, y: number) => {
        if (!isTeacher || gameStatus !== 'setup') return;
        const exists = magnets.findIndex(m => m.x === x && m.y === y);
        const newMagnets = [...magnets];
        if (exists >= 0) newMagnets.splice(exists, 1);
        else newMagnets.push({ x, y, power: 1.5 });
        updateElement({ magnets: newMagnets });
    };


    const startGame = () => {
        updateElement({ gameStatus: 'playing', discoveredMagnets: [], results: [] });
    };

    const resetGame = () => {
        updateElement({ gameStatus: 'setup', results: [], discoveredMagnets: [] });
    };

    // --- KEYBOARD ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameStatus !== 'playing') return;
            if (e.key === 'ArrowUp') moveBall(0, -1);
            if (e.key === 'ArrowDown') moveBall(0, 1);
            if (e.key === 'ArrowLeft') moveBall(-1, 0);
            if (e.key === 'ArrowRight') moveBall(1, 0);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameStatus, ballPos.x, ballPos.y, magnets.length, moveCount, moveBall]);

    // --- LEADERBOARD SORTING ---
    const sortedLeaderboard = useMemo(() => {
        return allResults
            .filter(r => r.status === 'won')
            .sort((a, b) => {
                if (a.moves !== b.moves) return a.moves - b.moves;
                return a.time - b.time;
            })
            .slice(0, 10);
    }, [allResults]);

    // --- RENDER ---

    const renderCell = (x: number, y: number) => {
        const isBall = ballPos.x === x && ballPos.y === y;
        const isTarget = targetPos.x === x && targetPos.y === y;
        const isStart = startPos.x === x && startPos.y === y;
        const magnetIdx = magnets.findIndex(m => m.x === x && m.y === y);
        const isMagnet = magnetIdx >= 0;
        const isDISCOVERED = discoveredMagnets.includes(magnetIdx);
        const isPath = shortestPath.some(p => p.x === x && p.y === y);

        const isAdjacent = gameStatus === 'playing' && (
            Math.abs(x - ballPos.x) + Math.abs(y - ballPos.y) === 1
        );

        return (
            <div
                key={`${x}-${y}`}
                onClick={() => {
                    if (gameStatus === 'setup') toggleMagnet(x, y);
                    else if (isAdjacent) moveBall(x - ballPos.x, y - ballPos.y);
                }}
                className={`relative w-full aspect-square border border-white/5 flex items-center justify-center transition-all duration-200 cursor-pointer
                    ${isTarget ? 'bg-emerald-500/10' : ''}
                    ${isAdjacent ? 'hover:bg-blue-500/20' : ''}
                `}
            >
                {/* Shortest Path Overlay */}
                {isPath && (gameStatus === 'won' || isTeacher) && (
                    <div className="absolute w-2 h-2 bg-yellow-400/30 rounded-full" />
                )}

                {/* Aura Overlay (Conceptual Thinking) - Removed numeric indicators */}

                {/* Icons */}
                {isStart && <div className="absolute inset-0 border-2 border-blue-500/30 rounded-lg pointer-events-none" />}
                {isTarget && <Target className="w-1/2 h-1/2 text-emerald-400 opacity-40" />}

                {isMagnet && (isTeacher || isDISCOVERED || gameStatus === 'won') && (
                    <div className={`w-3/4 h-3/4 rounded-full flex items-center justify-center shadow-lg ${isDISCOVERED ? 'bg-red-600' : 'bg-slate-800'}`}>
                        <Zap className="w-1/2 h-1/2 text-white" />
                    </div>
                )}

                {isBall && (() => {
                    const bIntensity = getIntensity(ballPos.x, ballPos.y);
                    const auraColor = bIntensity > 7 ? 'rgba(239, 68, 68, 0.7)' :
                        bIntensity > 4 ? 'rgba(245, 158, 11, 0.6)' :
                            bIntensity > 0 ? 'rgba(59, 130, 246, 0.5)' : 'transparent';

                    return (
                        <div
                            className="absolute inset-0 p-1 z-10 animate-in fade-in zoom-in duration-300 transition-all flex items-center justify-center"
                            style={{ transform: `scale(${1 + bIntensity * 0.08})` }}
                        >
                            <div
                                className="w-4/5 h-4/5 bg-white rounded-full transition-all duration-300 relative shadow-2xl"
                                style={{
                                    boxShadow: `0 0 ${15 + bIntensity * 20}px ${auraColor}`,
                                    backgroundColor: bIntensity > 7 ? '#ef4444' : bIntensity > 4 ? '#f59e0b' : '#3b82f6'
                                }}
                            >
                                <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse" />
                            </div>
                        </div>
                    );
                })()}
            </div>
        );
    };

    return (
        <div className="w-full h-full relative bg-slate-900 text-white flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4 rounded-xl border-2 border-slate-700 select-none">

            {/* HUD */}
            <div className="w-full max-w-[600px] mb-4 flex justify-between items-center bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-black">Time</span>
                        <div className="flex items-center gap-1.5 text-blue-400 font-mono text-lg">
                            <Clock className="w-4 h-4" /> {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-black">Moves</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-lg">
                            <Footprints className="w-4 h-4" /> {moveCount}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => setShowLeaderboard(true)} variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10">
                        <ListOrdered className="w-5 h-5 text-yellow-400" />
                    </Button>
                    {isTeacher && (
                        <>
                            <Button onClick={() => setShowSettings(true)} variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10">
                                <Settings className="w-5 h-5" />
                            </Button>
                            {gameStatus === 'setup' ? (
                                <Button onClick={startGame} className="bg-emerald-600 hover:bg-emerald-700 h-10 px-6 font-black rounded-xl">START</Button>
                            ) : (
                                <Button onClick={resetGame} variant="destructive" className="h-10 px-3 rounded-xl"><RotateCcw className="w-4 h-4" /></Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="relative w-full max-w-[500px] aspect-square bg-slate-950 rounded-2xl border-4 border-slate-800 overflow-hidden shadow-2xl">
                <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => renderCell(i % GRID_SIZE, Math.floor(i / GRID_SIZE)))}
                </div>

                {/* End Game Overlays */}
                {gameStatus === 'won' && (
                    <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in duration-700 text-center">
                        <Trophy className="w-24 h-24 text-yellow-400 mb-2 animate-bounce" />
                        <h2 className="text-4xl font-black mb-2">WINNER!</h2>
                        <div className="flex gap-4 mb-8">
                            <div className="text-center"><p className="text-[10px] opacity-50 uppercase">Moves</p><p className="text-2xl font-mono">{moveCount}</p></div>
                            <div className="text-center"><p className="text-[10px] opacity-50 uppercase">Time</p><p className="text-2xl font-mono">{timer}s</p></div>
                        </div>
                        {isTeacher && <Button onClick={resetGame} className="bg-white text-slate-900 hover:bg-emerald-100 font-black px-10 py-6 text-xl rounded-2xl">RESTART</Button>}
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}

            {/* Leaderboard Modal */}
            <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
                <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                            <ListOrdered className="text-yellow-400" /> LEADERBOARD
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">Шилдэг 10 сурагч (Нүүдэл + Хугацаа)</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-2">
                        {sortedLeaderboard.length === 0 ? (
                            <div className="text-center py-10 opacity-30 italic">Мэдээлэл алга...</div>
                        ) : sortedLeaderboard.map((res, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5 hover:border-white/20 transition-all">
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="font-bold">{res.userName}</span>
                                </div>
                                <div className="flex gap-4 text-sm font-mono">
                                    <span className="text-emerald-400">{res.moves} нүүдэл</span>
                                    <span className="text-blue-400">{res.time}с</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {isTeacher && allResults.some(r => r.status === 'lost') && (
                        <div className="mt-8 border-t border-slate-800 pt-6">
                            <h3 className="text-sm font-black text-red-400 flex items-center gap-2 mb-4">
                                <UserX className="w-4 h-4" /> БАРИГДСАН СУРАГЧИД
                            </h3>
                            <div className="space-y-2">
                                {allResults.filter(r => r.status === 'lost').slice(-5).reverse().map((res, i) => (
                                    <div key={i} className="flex justify-between text-xs opacity-60">
                                        <span>{res.userName}</span>
                                        <span className="text-red-500 font-mono">({res.caughtAt?.x}, {res.caughtAt?.y}) дээр</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Teacher Settings Modal */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black">
                            <Settings className="w-5 h-5" /> ТОХИРГОО
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase">Field Size ({GRID_SIZE}x{GRID_SIZE})</label>
                            <div className="flex gap-2">
                                {[10, 12, 15].map(s => (
                                    <Button key={s} onClick={() => updateElement({ gridSize: s })} variant={GRID_SIZE === s ? 'default' : 'outline'} className="flex-1 h-10 border-slate-700">
                                        {s}x{s}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase">Start Pos ({startPos.x}, {startPos.y})</label>
                                <Button variant="outline" className="w-full h-10 border-slate-700" onClick={() => toast.info("Талбар дээр 'S' гэж тэмдэглэгдсэн цэг")}>
                                    <MapIcon className="w-4 h-4 mr-2" /> Сэлгэх (Auto)
                                </Button>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase">Target Pos ({targetPos.x}, {targetPos.y})</label>
                                <Button variant="outline" className="w-full h-10 border-slate-700" onClick={() => updateElement({ targetPos: { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) } })}>
                                    <Target className="w-4 h-4 mr-2" /> Санамсаргүй
                                </Button>
                            </div>
                        </div>

                        <Button onClick={resetGame} variant="destructive" className="w-full h-12 font-black rounded-xl shadow-lg shadow-red-950/20">
                            БҮХ ҮР ДҮНГ УСТГАЖ ШИНЭЭР ЭХЛЭХ
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

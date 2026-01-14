import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Play, Trophy, Timer, Eye, ArrowRightLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhiteboardElement } from './ElementLayer';

interface SortingGameProps {
    isTeacher: boolean;
    userName: string;
    sessionId: string;
    currentPage: number;
    element: WhiteboardElement & {
        gameStatus?: 'waiting' | 'playing' | 'finished';
        numbers?: number[];
        startTime?: number;
    };
    collectionName?: string;
}

interface PlayerScore {
    name: string;
    correctCount: number;
    time: number;
    status: 'playing' | 'finished';
    numbers?: number[];
}

const BOX_COUNT = 12;

export default function SortingGame({
    isTeacher,
    userName,
    sessionId,
    currentPage,
    element,
    collectionName = 'whiteboard_sessions'
}: SortingGameProps) {
    // Synced Game State from Element
    const gameStatus = element.gameStatus || 'waiting';
    const sharedNumbers = element.numbers || [];
    const gameStartTime = element.startTime || 0;

    // Local Player State
    const [myNumbers, setMyNumbers] = useState<number[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Leaderboard State
    const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([]);

    // Initialize my numbers when game starts
    useEffect(() => {
        if (gameStatus === 'playing' && sharedNumbers.length > 0 && myNumbers.length === 0) {
            setMyNumbers([...sharedNumbers]);
            setSelectedIndices([]);
        } else if (gameStatus === 'waiting') {
            // Reset when game goes back to waiting
            setMyNumbers([]);
            setSelectedIndices([]);
        }
    }, [gameStatus, sharedNumbers, myNumbers.length]);

    // Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameStatus === 'playing' && gameStartTime) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameStatus, gameStartTime]);

    // Update score helper
    const updateScore = async (numbers: number[], status: 'playing' | 'finished') => {
        if (isTeacher) return;

        const sorted = [...numbers].sort((a, b) => a - b);
        let correctCount = 0;
        for (let i = 0; i < BOX_COUNT; i++) {
            if (numbers[i] === sorted[i]) correctCount++;
        }

        try {
            await setDoc(doc(db, 'cpp', sessionId, 'sorting_game', userName), {
                name: userName,
                correctCount,
                time: elapsedTime,
                status,
                numbers,
                lastUpdated: Date.now()
            });
        } catch (e) {
            console.error("Score update failed", e);
        }
    };

    // Check win condition
    useEffect(() => {
        if (gameStatus === 'playing' && myNumbers.length > 0 && !isTeacher) {
            const sorted = [...myNumbers].sort((a, b) => a - b);
            const isComplete = myNumbers.every((num, i) => num === sorted[i]);

            if (isComplete) {
                updateScore(myNumbers, 'finished');
            } else {
                updateScore(myNumbers, 'playing');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myNumbers, gameStatus]);

    // Subscribe to Leaderboard
    useEffect(() => {
        const q = query(
            collection(db, 'cpp', sessionId, 'sorting_game'),
            orderBy('correctCount', 'desc'),
            orderBy('time', 'asc'),
            limit(50)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const list: PlayerScore[] = [];
            snapshot.forEach(doc => {
                list.push(doc.data() as PlayerScore);
            });
            setLeaderboard(list);
        });
        return () => unsub();
    }, [sessionId]);

    // Teacher Controls
    const handleStartGame = async () => {
        if (!isTeacher) return;

        const nums = Array.from({ length: BOX_COUNT }, () => Math.floor(Math.random() * 99) + 1);

        const elementRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', element.id);
        await updateDoc(elementRef, {
            gameStatus: 'playing',
            numbers: nums,
            startTime: Date.now()
        });
    };

    const handleResetGame = async () => {
        if (!isTeacher) return;

        const elementRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', element.id);
        await updateDoc(elementRef, {
            gameStatus: 'waiting',
            numbers: [],
            startTime: 0
        });

        // Clear all player scores
        try {
            const scoresRef = collection(db, 'cpp', sessionId, 'sorting_game');
            const snapshot = await getDocs(scoresRef);
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
        } catch (e) {
            console.error("Failed to clear leaderboard", e);
        }
    };

    // Student Interaction
    const handleBoxClick = (index: number) => {
        if (gameStatus !== 'playing' || isTeacher) return;

        if (selectedIndices.includes(index)) {
            setSelectedIndices(prev => prev.filter(i => i !== index));
        } else {
            if (selectedIndices.length < 2) {
                setSelectedIndices(prev => [...prev, index]);
            }
        }
    };

    const handleSwap = () => {
        if (selectedIndices.length !== 2 || isTeacher) return;

        const [i, j] = selectedIndices;
        const newNums = [...myNumbers];
        [newNums[i], newNums[j]] = [newNums[j], newNums[i]];

        setMyNumbers(newNums);
        setSelectedIndices([]);
    };

    // Check if student finished
    const myScore = leaderboard.find(p => p.name === userName);
    const isFinished = myScore?.status === 'finished';

    return (
        <div className="w-full h-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex shadow-2xl">
            {/* Main Game Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Header */}
                <div className="h-14 bg-slate-950 flex items-center justify-between px-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <ArrowRightLeft className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white leading-none">Sorting Race</h3>
                            <p className="text-[10px] text-slate-400">Sort {BOX_COUNT} numbers!</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {gameStatus === 'playing' && (
                            <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono font-bold text-sm min-w-[3ch] text-center">{elapsedTime}s</span>
                            </div>
                        )}

                        {isTeacher && (
                            <div className="flex gap-2">
                                {gameStatus === 'waiting' && (
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500" onClick={handleStartGame}>
                                        <Play className="w-4 h-4 mr-1 fill-current" />
                                        Эхлүүлэх
                                    </Button>
                                )}
                                {gameStatus !== 'waiting' && (
                                    <Button size="sm" variant="outline" onClick={handleResetGame}>
                                        <RotateCcw className="w-4 h-4 mr-1" />
                                        Дахин
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Game Area */}
                <div className="flex-1 p-6 relative" onClick={() => setSelectedIndices([])}>
                    {gameStatus === 'waiting' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className="bg-slate-800/80 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 text-center max-w-sm">
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    {isTeacher ? 'Тоглоом эхлүүлэх бэлэн үү?' : 'Багшийг хүлээж байна...'}
                                </h2>
                                <p className="text-slate-400 mb-6">
                                    {isTeacher
                                        ? 'Дээрх "Эхлүүлэх" товчийг дарж тоглоом эхлүүлнэ үү.'
                                        : 'Багш тоглоом эхлүүлэх хүртэл хүлээнэ үү.'}
                                </p>
                            </div>
                        </div>
                    ) : isFinished && !isTeacher ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-950/80 backdrop-blur-sm">
                            <div className="text-center animate-in zoom-in duration-300">
                                <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                <h2 className="text-3xl font-bold text-white mb-2">Баяр хүргэе!</h2>
                                <p className="text-slate-300 mb-2 text-lg">Та {elapsedTime} секундын дотор дуусгалаа.</p>
                                <p className="text-slate-400 text-sm">Leaderboard-оос байрлалаа харна уу →</p>
                            </div>
                        </div>
                    ) : null}

                    {/* Boxes Grid */}
                    <div className="grid grid-cols-12 gap-3 h-full content-center w-full px-4">
                        {gameStatus === 'playing' || gameStatus === 'finished' ? (
                            isTeacher ? (
                                // Teacher sees the ORIGINAL shared numbers (what students started with)
                                <>
                                    <div className="col-span-12 text-center mb-2">
                                        <p className="text-xs text-slate-400">Эхлэлийн тоонууд (бүх сурагч ижил эхэлсэн)</p>
                                    </div>
                                    {sharedNumbers.map((num, i) => (
                                        <div
                                            key={i}
                                            className="aspect-square rounded-xl flex items-center justify-center text-2xl font-bold bg-slate-800 border-2 border-slate-700 text-white"
                                        >
                                            {num}
                                        </div>
                                    ))}
                                </>
                            ) : (
                                // Students see their own numbers
                                myNumbers.map((num, i) => {
                                    const isSelected = selectedIndices.includes(i);
                                    const isVisible = isSelected || isFinished;

                                    return (
                                        <button
                                            key={i}
                                            className={cn(
                                                "aspect-square rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-300 border-2",
                                                isSelected
                                                    ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-105"
                                                    : "bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750",
                                                isFinished && "bg-green-600/20 border-green-500/50 text-green-100"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBoxClick(i);
                                            }}
                                            disabled={isFinished}
                                        >
                                            <span className={cn(
                                                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50",
                                                "transition-all duration-300",
                                                !isVisible && "text-transparent"
                                            )}>
                                                {num}
                                            </span>
                                        </button>
                                    );
                                })
                            )
                        ) : (
                            Array.from({ length: BOX_COUNT }).map((_, i) => (
                                <div key={i} className="aspect-square bg-slate-800/50 rounded-xl border border-slate-800/50" />
                            ))
                        )}
                    </div>

                    {/* Swap Button */}
                    {gameStatus === 'playing' && !isTeacher && !isFinished && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                            <Button
                                size="lg"
                                className={cn(
                                    "rounded-full px-8 shadow-xl transition-all duration-300 transform",
                                    selectedIndices.length === 2
                                        ? "bg-indigo-500 hover:bg-indigo-400 translate-y-0 opacity-100"
                                        : "bg-slate-700 text-slate-500 translate-y-8 opacity-0 pointer-events-none"
                                )}
                                onClick={handleSwap}
                            >
                                <ArrowRightLeft className="w-5 h-5 mr-2" />
                                Солих (Swap)
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard Sidebar */}
            <div className="w-64 bg-slate-950 border-l border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        Leaderboard
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {leaderboard.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center mt-8">Хүлээж байна...</p>
                    ) : (
                        leaderboard.map((player, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border",
                                    player.name === userName
                                        ? "bg-indigo-500/10 border-indigo-500/30"
                                        : "bg-slate-800/50 border-slate-800"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                        index === 0 ? "bg-yellow-500 text-black" :
                                            index === 1 ? "bg-slate-300 text-black" :
                                                index === 2 ? "bg-amber-700 text-white" :
                                                    "bg-slate-700 text-slate-400"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <span className={cn(
                                        "text-sm font-medium truncate max-w-[100px]",
                                        player.name === userName ? "text-indigo-300" : "text-slate-300"
                                    )}>
                                        {player.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1 text-green-400">
                                        <Eye className="w-3 h-3" />
                                        {player.correctCount}/{BOX_COUNT}
                                    </div>
                                    {player.status === 'finished' && (
                                        <div className="flex items-center gap-1 text-slate-400 font-mono">
                                            <Timer className="w-3 h-3" />
                                            {player.time}s
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

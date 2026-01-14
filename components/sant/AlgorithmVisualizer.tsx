'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, RotateCcw, Zap, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

import {
    VisualizerState,
    AlgoType,
    Language,
    ArrayElement,
    GRID_ROWS,
    GRID_COLS,
    BAR_COLORS,
    ALGO_CODE,
    ALGO_PROBLEMS,
    ALGO_EXAMPLES
} from './visualizer/types';
import { ArrayView, DijkstraView, SudokuView } from './visualizer/views';
import * as Logic from './visualizer/logic';

interface AlgorithmVisualizerProps {
    isTeacher: boolean;
    element: {
        id: string;
        type: 'algorithm_visualizer';
        x: number;
        y: number;
        width: number;
        height: number;
        collectionName?: string;
    };
    sessionId: string;
    currentPage: number;
    userName: string;
    collectionName?: string;
}

export default function AlgorithmVisualizer({
    isTeacher,
    element,
    sessionId,
    currentPage,
    collectionName: propCollectionName
}: AlgorithmVisualizerProps) {
    const collectionName = propCollectionName || element.collectionName || 'whiteboard_sessions';

    const [state, setState] = useState<VisualizerState>({
        array: [],
        algoType: 'bubble_sort',
        cursor: -1,
        secondaryCursor: -1,
        comparing: [],
        sorted: [],
        pivot: null,
        isPaused: true,
        step: 0,
        targetValue: null,
        foundIndex: null,
        stack: [],
        activeRange: null,
        grid: Array(GRID_ROWS * GRID_COLS).fill(0),
        startNode: { r: 1, c: 1 },
        endNode: { r: GRID_ROWS - 2, c: GRID_COLS - 2 },
        dijkstraQueue: [],
        distances: {},
        parents: {},
        sudokuBoard: Array(81).fill(0),
        sudokuOriginal: Array(81).fill(false),
        sudokuCurrent: null,
        sudokuBacktracking: false,
        speed: 800
    });

    const [swapping, setSwapping] = useState<number[]>([]);
    const [showStatus, setShowStatus] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [showProblem, setShowProblem] = useState(true);
    const [selectedLang, setSelectedLang] = useState<Language>('cpp');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const resetCountRef = useRef(0);

    useEffect(() => {
        const docRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', element.id, 'algo_state', 'current');
        return onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setState(snap.data() as VisualizerState);
            }
        });
    }, [sessionId, currentPage, element.id, collectionName]);

    const updateRemoteState = async (updates: Partial<VisualizerState>) => {
        if (!isTeacher) return;
        const docRef = doc(db, collectionName, sessionId, 'pages', String(currentPage), 'elements', element.id, 'algo_state', 'current');
        try {
            await updateDoc(docRef, updates);
        } catch {
            try {
                await setDoc(docRef, { ...state, ...updates }, { merge: true });
            } catch (err) {
                console.error("Firestore update error:", err);
            }
        }
    };

    const initAlgo = (type: AlgoType) => {
        resetCountRef.current++;
        const newArray: ArrayElement[] = Array.from({ length: 14 }, (_, i) => ({
            id: `bar-${Math.random().toString(36).substr(2, 9)}`,
            val: Math.floor(Math.random() * 80) + 10,
            colorIdx: i % BAR_COLORS.length
        }));

        if (type === 'binary_search') newArray.sort((a, b) => a.val - b.val);

        const newGrid = Array(GRID_ROWS * GRID_COLS).fill(0);
        const start = { r: 2, c: 4 };
        const end = { r: GRID_ROWS - 3, c: GRID_COLS - 5 };
        newGrid[start.r * GRID_COLS + start.c] = 2;
        newGrid[end.r * GRID_COLS + end.c] = 3;

        let newState: VisualizerState = {
            ...state,
            algoType: type,
            array: newArray,
            cursor: -1,
            secondaryCursor: -1,
            comparing: [],
            sorted: [],
            pivot: null,
            isPaused: true,
            step: 0,
            targetValue: (type === 'linear_search' || type === 'binary_search') ? newArray[Math.floor(Math.random() * newArray.length)].val : null,
            foundIndex: null,
            stack: type === 'quick_sort' ? [{ low: 0, high: newArray.length - 1 }] : [],
            activeRange: null,
            grid: newGrid,
            startNode: start,
            endNode: end,
            dijkstraQueue: type === 'dijkstra' ? [{ ...start, dist: 0, parent: null }] : [],
            distances: type === 'dijkstra' ? { [`${start.r},${start.c}`]: 0 } : {},
            parents: {},
            speed: state.speed || 800
        };

        if (type === 'sudoku') {
            const board = [
                0, 0, 0, 2, 6, 0, 7, 0, 1,
                6, 8, 0, 0, 7, 0, 0, 9, 0,
                1, 9, 0, 0, 0, 4, 5, 0, 0,
                8, 2, 0, 1, 0, 0, 0, 4, 0,
                0, 0, 4, 6, 0, 2, 9, 0, 0,
                0, 5, 0, 0, 0, 3, 0, 2, 8,
                0, 0, 9, 3, 0, 0, 0, 7, 4,
                0, 4, 0, 0, 5, 0, 0, 3, 6,
                7, 0, 3, 0, 1, 8, 0, 0, 0
            ];
            newState = {
                ...newState,
                sudokuBoard: board,
                sudokuOriginal: board.map(v => v !== 0),
                sudokuCurrent: null,
                sudokuBacktracking: false
            };
        }

        updateRemoteState(newState);
        setShowProblem(true);
    };

    const logicCallbacks: Logic.LogicCallbacks = {
        updateRemoteState,
        setSwapping,
        resetCount: resetCountRef.current,
        toast
    };

    const nextStep = () => {
        if (!isTeacher) return;
        switch (state.algoType) {
            case 'bubble_sort': Logic.bubbleSortStep(state, logicCallbacks); break;
            case 'linear_search': Logic.linearSearchStep(state, logicCallbacks); break;
            case 'binary_search': Logic.binarySearchStep(state, logicCallbacks); break;
            case 'quick_sort': Logic.quickSortStep(state, logicCallbacks); break;
            case 'dijkstra': Logic.dijkstraStep(state, logicCallbacks); break;
            case 'sudoku': Logic.sudokuStep(state, logicCallbacks); break;
        }
    };

    const nextStepRef = useRef(nextStep);
    useEffect(() => { nextStepRef.current = nextStep; }, [nextStep]);

    useEffect(() => {
        if (!state.isPaused && isTeacher) {
            timerRef.current = setInterval(() => { nextStepRef.current(); }, state.speed);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [state.isPaused, state.algoType, state.speed, isTeacher]);

    const handleGridClick = (r: number, c: number) => {
        if (!isTeacher || state.algoType !== 'dijkstra') return;
        const nextGrid = [...state.grid];
        const idx = r * GRID_COLS + c;
        if (nextGrid[idx] === 0) nextGrid[idx] = 1;
        else if (nextGrid[idx] === 1) nextGrid[idx] = 0;
        updateRemoteState({ grid: nextGrid });
    };

    return (
        <div className="w-full h-full bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden font-sans">
            <div className="bg-slate-900/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                            <Zap className="w-5 h-5 text-blue-400 fill-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">ALGO<span className="text-blue-500">LAB</span></h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Algorithm Visualizer Pro</p>
                        </div>
                    </div>

                    {isTeacher && (
                        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/5 ml-4">
                            {[
                                { label: '0.5x', val: 1600 },
                                { label: '1x', val: 800 },
                                { label: '2x', val: 400 },
                                { label: '4x', val: 100 },
                                { label: 'TURBO', val: 10 }
                            ].map((spd) => (
                                <Button
                                    key={spd.label}
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 text-[10px] px-3 font-black transition-all",
                                        state.speed === spd.val ? "bg-amber-500 text-black shadow-lg" : "text-slate-400 hover:text-white"
                                    )}
                                    onClick={() => updateRemoteState({ speed: spd.val })}
                                >
                                    {spd.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {isTeacher && (
                    <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-white/5">
                        {(['bubble_sort', 'linear_search', 'binary_search', 'quick_sort', 'dijkstra', 'sudoku'] as AlgoType[]).map((type) => (
                            <Button
                                key={type}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-8 text-[11px] font-bold px-3 transition-all",
                                    state.algoType === type ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                                )}
                                onClick={() => initAlgo(type)}
                            >
                                {type.replace('_', ' ').toUpperCase()}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 w-full flex items-center justify-center p-8 overflow-hidden relative">
                {state.algoType === 'dijkstra' ? (
                    <DijkstraView state={state} handleGridClick={handleGridClick} />
                ) : state.algoType === 'sudoku' ? (
                    <SudokuView state={state} />
                ) : (
                    <ArrayView state={state} swapping={swapping} />
                )}

                <AnimatePresence>
                    {(showStatus || showCode || showProblem) && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="absolute right-8 bottom-8 w-96 max-h-[80%] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50"
                        >
                            <div className={cn(
                                "px-6 py-4 flex items-center justify-between border-b border-white/5",
                                showCode ? "bg-purple-600/10" : showProblem ? "bg-emerald-600/10" : "bg-blue-600/10"
                            )}>
                                <div className="flex items-center gap-2">
                                    {showCode ? <Zap className="w-4 h-4 text-purple-400" /> :
                                        showProblem ? <Info className="w-4 h-4 text-emerald-400" /> :
                                            <Info className="w-4 h-4 text-blue-400" />}
                                    <span className="text-xs font-black text-white uppercase tracking-widest">
                                        {showCode ? "Implementation" : showProblem ? "Бодлогын өгүүлбэр" : "Хэрэглээний жишээ"}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => { setShowStatus(false); setShowCode(false); setShowProblem(false); }}>
                                    <RotateCcw className="w-4 h-4 text-slate-400 rotate-45" />
                                </Button>
                            </div>

                            <div className="p-6 overflow-y-auto font-mono text-xs leading-relaxed">
                                {showCode ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg self-start">
                                            {(['cpp', 'python', 'java'] as Language[]).map((lang) => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setSelectedLang(lang)}
                                                    className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", selectedLang === lang ? "bg-purple-600 text-white" : "text-slate-500")}
                                                >
                                                    {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                        <pre className="text-purple-300 whitespace-pre-wrap"><code>{ALGO_CODE[state.algoType][selectedLang]}</code></pre>
                                    </div>
                                ) : showProblem ? (
                                    <div className="flex flex-col gap-4">
                                        <p className="text-emerald-50 font-sans text-base font-bold leading-relaxed mb-4">
                                            {ALGO_PROBLEMS[state.algoType]}
                                        </p>
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl"
                                            onClick={() => setShowProblem(false)}
                                        >
                                            ОЙЛГОЛОО, ЭХЭЛЬЕ!
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-slate-300 font-sans text-sm font-medium leading-relaxed">
                                        <span className="text-blue-400 font-black block mb-2 uppercase text-[10px] tracking-widest">Амьдрал дээрх жишээ:</span>
                                        {ALGO_EXAMPLES[state.algoType]}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {(state.algoType === 'linear_search' || state.algoType === 'binary_search') && state.targetValue !== null && (
                    <div className="absolute top-8 right-8 bg-blue-600/10 border border-blue-500/20 px-6 py-4 rounded-3xl flex flex-col items-center gap-1 shadow-2xl">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Target Value</span>
                        <div className="flex items-center gap-2">
                            {isTeacher ? (
                                <input
                                    className="w-16 bg-transparent text-4xl font-black text-white text-center border-b-2 border-blue-500 outline-none"
                                    type="number"
                                    value={state.targetValue}
                                    onChange={(e) => updateRemoteState({ targetValue: parseInt(e.target.value) || 0, foundIndex: null })}
                                />
                            ) : (
                                <span className="text-4xl font-black text-white">{state.targetValue}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 border-t border-white/5 p-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Algorithm</span>
                        <span className="text-sm font-black text-white">{state.algoType.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Delay</span>
                        <span className="text-sm font-black text-blue-400">{state.speed}ms</span>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Steps</span>
                        <span className="text-sm font-black text-amber-400">{state.step}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-9 px-4 gap-2 font-black text-[11px] rounded-xl border border-white/5", showProblem ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400")}
                        onClick={() => { setShowProblem(!showProblem); setShowCode(false); setShowStatus(false); }}
                    >
                        <Info className="w-4 h-4" /> {showProblem ? 'HIDE PROBLEM' : 'SHOW PROBLEM'}
                    </Button>
                    <Button variant="ghost" size="sm" className={cn("h-9 px-4 gap-2 font-black text-[11px] rounded-xl border border-white/5", showStatus ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400")} onClick={() => { setShowStatus(!showStatus); setShowCode(false); setShowProblem(false); }}>
                        <Info className="w-4 h-4" /> {showStatus ? 'HIDE USAGE' : 'SHOW USAGE'}
                    </Button>
                    <Button variant="ghost" size="sm" className={cn("h-9 px-4 gap-2 font-black text-[11px] rounded-xl border border-white/5", showCode ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400")} onClick={() => { setShowCode(!showCode); setShowStatus(false); setShowProblem(false); }}>
                        <Zap className="w-4 h-4" /> {showCode ? 'HIDE CODE' : 'SHOW CODE'}
                    </Button>
                    <div className="h-8 w-px bg-white/5 mx-2" />
                    {isTeacher ? (
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="rounded-xl w-12 h-12 bg-slate-800 border-white/5 text-slate-400" onClick={() => initAlgo(state.algoType)}>
                                <RotateCcw className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center bg-slate-800 p-1 rounded-2xl border border-white/5">
                                <Button variant="ghost" className={cn("rounded-xl h-12 w-24 flex items-center justify-center gap-2 font-bold", state.isPaused ? "text-slate-400" : "bg-red-500/20 text-red-400")} onClick={() => updateRemoteState({ isPaused: !state.isPaused })}>
                                    {state.isPaused ? <><Play className="w-5 h-5 fill-current" /> PLAY</> : <><Pause className="w-5 h-5 fill-current" /> PAUSE</>}
                                </Button>
                                <Button variant="ghost" className="rounded-xl h-12 w-32 flex items-center justify-center gap-2 font-bold text-blue-400" onClick={nextStep} disabled={!state.isPaused}>
                                    <SkipForward className="w-5 h-5" /> NEXT STEP
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Watching Live Session</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

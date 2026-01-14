import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BAR_COLORS, GRID_ROWS, GRID_COLS, VisualizerState, ArrayElement } from './types';

interface ViewProps {
    state: VisualizerState;
    swapping?: number[];
    handleGridClick?: (r: number, c: number) => void;
}

export const ArrayView = ({ state, swapping = [] }: ViewProps) => {
    return (
        <div className="flex items-end gap-3 h-64 w-full max-w-5xl justify-center px-4">
            <AnimatePresence mode="popLayout">
                {state.array.map((element, idx) => {
                    const elementData = typeof element === 'number'
                        ? { id: `legacy-${idx}-${element}`, val: element, colorIdx: idx % BAR_COLORS.length }
                        : (element as ArrayElement);

                    const { id, val, colorIdx } = elementData;
                    const isComparing = state.comparing.includes(idx);
                    const isCurrent = state.cursor === idx;
                    const isSecondary = state.secondaryCursor === idx;
                    const isSorted = state.sorted.includes(idx);
                    const isFound = state.foundIndex === idx;
                    const isSwapping = swapping.includes(idx);
                    const inRange = state.activeRange ? (idx >= state.activeRange[0] && idx <= state.activeRange[1]) : true;
                    const isPivot = state.pivot === idx;
                    const colorClass = BAR_COLORS[colorIdx % BAR_COLORS.length];

                    return (
                        <motion.div
                            key={id}
                            layout
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            transition={{
                                layout: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className={cn(
                                "flex flex-col items-center flex-1 h-full justify-end relative",
                                !inRange && state.algoType === 'quick_sort' && "opacity-20 grayscale",
                                isSwapping && "z-20"
                            )}
                        >
                            <div className={cn(
                                "absolute rounded-2xl border-2 transition-all duration-300 pointer-events-none z-10",
                                isComparing ? "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-110" :
                                    isPivot ? "border-rose-400 bg-rose-400/10 shadow-[0_0_20px_rgba(251,113,133,0.4)] scale-110" :
                                        isCurrent ? "border-blue-400 bg-blue-400/10 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-110" :
                                            isSecondary ? "border-purple-400 bg-purple-400/10 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-110" :
                                                "border-transparent opacity-0"
                            )}
                                style={{
                                    height: `calc(${val}% + 40px)`,
                                    bottom: '24px',
                                    width: '120%'
                                }} />

                            <div
                                className={cn(
                                    "w-full rounded-xl transition-all duration-500 relative group border-t border-white/20 shadow-lg",
                                    isFound ? "bg-gradient-to-t from-emerald-600 to-emerald-400 border-emerald-300" :
                                        isPivot ? "bg-gradient-to-t from-rose-600 to-rose-400 border-rose-300" :
                                            isComparing ? "bg-gradient-to-t from-amber-600 to-amber-300 border-amber-200" :
                                                isCurrent ? "bg-gradient-to-t from-blue-600 to-blue-400 border-blue-300 shadow-blue-500/40" :
                                                    isSecondary ? "bg-gradient-to-t from-purple-600 to-purple-400 border-purple-300" :
                                                        isSorted ? "bg-gradient-to-t from-slate-700 to-slate-800 opacity-60" :
                                                            `bg-gradient-to-t ${colorClass}`
                                )}
                                style={{ height: `${val}%` }}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] whitespace-nowrap">
                                    {val}
                                </div>

                                {isPivot && (
                                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] px-1 font-bold rounded-bl shadow-md">PIVOT</div>
                                )}

                                {(isCurrent || isComparing || isFound || isPivot || isSecondary) && (
                                    <div className="absolute inset-0 blur-xl opacity-30 bg-inherit rounded-full" />
                                )}
                            </div>
                            <div className="mt-4 text-[10px] text-slate-500 font-mono font-bold shrink-0">
                                [{idx}]
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export const DijkstraView = ({ state, handleGridClick }: ViewProps) => {
    return (
        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 w-full max-w-5xl aspect-[20/12] bg-slate-900/50 p-2 rounded-xl border border-slate-800 shadow-2xl">
            {Array.from({ length: GRID_ROWS }).map((_, r) =>
                Array.from({ length: GRID_COLS }).map((_, c) => {
                    const idx = r * GRID_COLS + c;
                    const cell = state.grid[idx];
                    return (
                        <div
                            key={`${r}-${c}`}
                            onClick={() => handleGridClick?.(r, c)}
                            className={cn(
                                "aspect-square rounded-sm transition-all duration-200 cursor-pointer border border-white/5",
                                cell === 0 && "bg-slate-800/50 hover:bg-slate-700",
                                cell === 1 && "bg-slate-300 shadow-inner scale-95",
                                cell === 2 && "bg-blue-500 shadow-[0_0_10px_#3b82f6]",
                                cell === 3 && "bg-rose-500 shadow-[0_0_10px_#f43f5e]",
                                cell === 4 && "bg-blue-400/30 animate-pulse",
                                cell === 5 && "bg-blue-600/20",
                                cell === 6 && "bg-amber-400 scale-90 rounded-full shadow-[0_0_15px_#fbbf24]"
                            )}
                        />
                    );
                })
            )}
        </div>
    );
};

export const SudokuView = ({ state }: ViewProps) => {
    return (
        <div className="grid grid-cols-9 gap-1 bg-slate-800 p-2 rounded-xl shadow-2xl border-4 border-slate-700">
            {state.sudokuBoard.map((val, idx) => {
                const r = Math.floor(idx / 9);
                const c = idx % 9;
                const isOriginal = state.sudokuOriginal[idx];
                const isCurrent = state.sudokuCurrent && state.sudokuCurrent[0] === r && state.sudokuCurrent[1] === c;
                const isBacktracking = state.sudokuBacktracking && isCurrent;

                // Visual grouping
                const borderRight = (c === 2 || c === 5) ? "border-r-4 border-slate-700" : "border-r border-slate-700/50";
                const borderBottom = (r === 2 || r === 5) ? "border-b-4 border-slate-700" : "border-b border-slate-700/50";

                return (
                    <div
                        key={idx}
                        className={cn(
                            "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl font-black transition-all duration-200",
                            borderRight, borderBottom,
                            isOriginal ? "text-slate-400 bg-slate-900/50" : "text-blue-400 bg-slate-900",
                            isCurrent && !isBacktracking && "bg-blue-500/20 text-blue-200 ring-2 ring-blue-500 z-10 scale-105",
                            isBacktracking && "bg-rose-500/20 text-rose-300 ring-2 ring-rose-500 z-10 scale-105"
                        )}
                    >
                        {val !== 0 ? val : ""}
                    </div>
                );
            })}
        </div>
    );
};

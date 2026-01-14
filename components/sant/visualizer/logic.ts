import { VisualizerState, Point, GRID_ROWS, GRID_COLS } from './types';

export interface LogicCallbacks {
    updateRemoteState: (updates: Partial<VisualizerState>) => void;
    setSwapping: (indices: number[]) => void;
    resetCount: number;
    toast: { success: (msg: string) => void; error: (msg: string) => void; };
}

export const bubbleSortStep = (state: VisualizerState, cb: LogicCallbacks) => {
    const { array, cursor, sorted, step, speed } = state;
    const nextArray = [...array];
    let nextCursor = cursor;
    const nextSorted = [...sorted];

    if (nextSorted.length >= array.length - 1) {
        cb.updateRemoteState({
            isPaused: true,
            comparing: [],
            cursor: -1,
            pivot: null
        });
        cb.toast.success("Эрэмбэлж дууслаа!");
        return;
    }

    if (nextCursor === -1 || nextCursor >= array.length - nextSorted.length - 2) {
        if (nextCursor !== -1) nextSorted.push(array.length - nextSorted.length - 1);
        nextCursor = 0;
    } else {
        nextCursor++;
    }

    const i = nextCursor;
    const j = i + 1;
    const swapDuration = Math.min(300, speed * 0.8);

    if (nextArray[i].val > nextArray[j].val) {
        if (speed < 50) {
            const temp = nextArray[i];
            nextArray[i] = nextArray[j];
            nextArray[j] = temp;
            cb.updateRemoteState({
                array: nextArray,
                cursor: nextCursor,
                comparing: [i, j],
                sorted: nextSorted,
                step: step + 1
            });
        } else {
            cb.setSwapping([i, j]);
            const startResetId = cb.resetCount;
            setTimeout(() => {
                // This timeout logic needs to be careful about closure
                // In the main component, we'll check the current resetCount
                cb.updateRemoteState({
                    array: (function () {
                        const arr = [...nextArray];
                        const temp = arr[i];
                        arr[i] = arr[j];
                        arr[j] = temp;
                        return arr;
                    })(),
                    cursor: nextCursor,
                    comparing: [i, j],
                    sorted: nextSorted,
                    step: step + 1,
                    _internalResetId: startResetId // Pass this to check in the component
                });
                cb.setSwapping([]);
            }, swapDuration);
        }
    } else {
        cb.updateRemoteState({
            cursor: nextCursor,
            comparing: [i, j],
            sorted: nextSorted,
            step: step + 1
        });
    }
};

export const linearSearchStep = (state: VisualizerState, cb: LogicCallbacks) => {
    const { array, cursor, targetValue, step } = state;
    const nextCursor = cursor + 1;

    if (nextCursor >= array.length) {
        cb.updateRemoteState({ isPaused: true, cursor: -1 });
        cb.toast.error("Олдсонгүй!");
        return;
    }

    if (array[nextCursor].val === targetValue) {
        cb.updateRemoteState({ foundIndex: nextCursor, isPaused: true, cursor: nextCursor, step: step + 1 });
        cb.toast.success("Олдлоо!");
        return;
    }

    cb.updateRemoteState({ cursor: nextCursor, step: step + 1 });
};

export const binarySearchStep = (state: VisualizerState, cb: LogicCallbacks) => {
    const { array, targetValue, step, activeRange } = state;
    const [low, high] = activeRange || [0, array.length - 1];

    if (low > high) {
        cb.updateRemoteState({ isPaused: true, cursor: -1 });
        cb.toast.error("Олдсонгүй!");
        return;
    }

    const mid = Math.floor((low + high) / 2);

    if (array[mid].val === targetValue) {
        cb.updateRemoteState({ foundIndex: mid, isPaused: true, cursor: mid, step: step + 1 });
        cb.toast.success("Олдлоо!");
    } else if (array[mid].val < (targetValue ?? 0)) {
        cb.updateRemoteState({ activeRange: [mid + 1, high], cursor: mid, step: step + 1 });
    } else {
        cb.updateRemoteState({ activeRange: [low, mid - 1], cursor: mid, step: step + 1 });
    }
};

export const quickSortStep = (state: VisualizerState, cb: LogicCallbacks) => {
    const { array, stack, step, speed, cursor, secondaryCursor } = state;
    if (stack.length === 0) {
        cb.updateRemoteState({ isPaused: true, comparing: [], pivot: null, activeRange: null });
        cb.toast.success("Quick Sort дууслаа!");
        return;
    }

    const nextArray = [...array];
    const nextStack = [...stack];
    const { low, high } = nextStack[nextStack.length - 1];

    if (low >= high) {
        nextStack.pop();
        cb.updateRemoteState({ stack: nextStack, step: step + 1 });
        return;
    }

    const pivotVal = nextArray[high].val;
    const j = cursor === -1 ? low : cursor;
    const swapDuration = Math.min(300, speed * 0.8);

    if (j < high) {
        if (nextArray[j].val < pivotVal) {
            const partitionIdx = secondaryCursor === -1 ? low : secondaryCursor;

            if (partitionIdx !== j) {
                if (speed < 50) {
                    const temp = nextArray[partitionIdx];
                    nextArray[partitionIdx] = nextArray[j];
                    nextArray[j] = temp;
                    cb.updateRemoteState({
                        array: nextArray,
                        cursor: j + 1,
                        secondaryCursor: partitionIdx + 1,
                        comparing: [j, high],
                        pivot: high,
                        activeRange: [low, high],
                        step: step + 1
                    });
                } else {
                    cb.setSwapping([partitionIdx, j]);
                    const startResetId = cb.resetCount;
                    setTimeout(() => {
                        cb.updateRemoteState({
                            array: (function () {
                                const arr = [...nextArray];
                                const temp = arr[partitionIdx];
                                arr[partitionIdx] = arr[j];
                                arr[j] = temp;
                                return arr;
                            })(),
                            cursor: j + 1,
                            secondaryCursor: partitionIdx + 1,
                            comparing: [j, high],
                            pivot: high,
                            activeRange: [low, high],
                            step: step + 1,
                            _internalResetId: startResetId
                        });
                        cb.setSwapping([]);
                    }, swapDuration);
                }
            } else {
                cb.updateRemoteState({
                    cursor: j + 1,
                    secondaryCursor: partitionIdx + 1,
                    comparing: [j, high],
                    pivot: high,
                    activeRange: [low, high],
                    step: step + 1
                });
            }
        } else {
            cb.updateRemoteState({
                cursor: j + 1,
                secondaryCursor: secondaryCursor === -1 ? low : secondaryCursor,
                comparing: [j, high],
                pivot: high,
                activeRange: [low, high],
                step: step + 1
            });
        }
    } else {
        const partitionIdx = secondaryCursor === -1 ? low : secondaryCursor;
        if (speed < 50) {
            const temp = nextArray[partitionIdx];
            nextArray[partitionIdx] = nextArray[high];
            nextArray[high] = temp;
            nextStack.pop();
            if (partitionIdx + 1 < high) nextStack.push({ low: partitionIdx + 1, high });
            if (low < partitionIdx - 1) nextStack.push({ low, high: partitionIdx - 1 });

            cb.updateRemoteState({
                array: nextArray,
                stack: nextStack,
                cursor: -1,
                secondaryCursor: -1,
                comparing: [],
                pivot: null,
                activeRange: null,
                step: step + 1
            });
        } else {
            cb.setSwapping([partitionIdx, high]);
            const startResetId = cb.resetCount;
            setTimeout(() => {
                nextStack.pop();
                if (partitionIdx + 1 < high) nextStack.push({ low: partitionIdx + 1, high });
                if (low < partitionIdx - 1) nextStack.push({ low, high: partitionIdx - 1 });

                cb.updateRemoteState({
                    array: (function () {
                        const arr = [...nextArray];
                        const temp = arr[partitionIdx];
                        arr[partitionIdx] = arr[high];
                        arr[high] = temp;
                        return arr;
                    })(),
                    stack: nextStack,
                    cursor: -1,
                    secondaryCursor: -1,
                    comparing: [],
                    pivot: null,
                    activeRange: null,
                    step: step + 1,
                    _internalResetId: startResetId
                });
                cb.setSwapping([]);
            }, swapDuration);
        }
    }
};

export const dijkstraStep = (state: VisualizerState, cb: LogicCallbacks) => {
    const { grid, dijkstraQueue, distances, parents, endNode, step } = state;
    if (dijkstraQueue.length === 0) {
        cb.updateRemoteState({ isPaused: true });
        return;
    }

    const nextQueue = [...dijkstraQueue].sort((a, b) => a.dist - b.dist);
    const current = nextQueue.shift()!;

    if (current.r === endNode?.r && current.c === endNode?.c) {
        const path: Point[] = [];
        let currStr = `${current.r},${current.c}`;
        while (currStr) {
            const [r, c] = currStr.split(',').map(Number);
            path.push({ r, c });
            currStr = parents[currStr] || '';
        }

        const nextGrid = [...grid];
        path.forEach(p => {
            const idx = p.r * GRID_COLS + p.c;
            if (nextGrid[idx] !== 2 && nextGrid[idx] !== 3) {
                nextGrid[idx] = 6;
            }
        });

        cb.updateRemoteState({
            grid: nextGrid,
            isPaused: true,
            dijkstraQueue: [],
            step: step + 1,
            cursor: -1,
            comparing: [],
            pivot: null
        });
        cb.toast.success("Зам олдлоо!");
        return;
    }

    const nextGrid = [...grid];
    const currentIdx = current.r * GRID_COLS + current.c;
    if (nextGrid[currentIdx] === 0 || nextGrid[currentIdx] === 4) {
        nextGrid[currentIdx] = 5; // Visited
    }

    const neighbors = [
        { r: current.r - 1, c: current.c }, { r: current.r + 1, c: current.c },
        { r: current.r, c: current.c - 1 }, { r: current.r, c: current.c + 1 }
    ].filter(n => n.r >= 0 && n.r < GRID_ROWS && n.c >= 0 && n.c < GRID_COLS && grid[n.r * GRID_COLS + n.c] !== 1);

    neighbors.forEach(n => {
        const key = `${n.r},${n.c}`;
        const newDist = current.dist + 1;
        if (distances[key] === undefined || newDist < distances[key]) {
            distances[key] = newDist;
            parents[key] = `${current.r},${current.c}`;
            nextQueue.push({ ...n, dist: newDist, parent: `${current.r},${current.c}` });
            if (nextGrid[n.r * GRID_COLS + n.c] === 0) nextGrid[n.r * GRID_COLS + n.c] = 4; // Visiting
        }
    });

    cb.updateRemoteState({
        grid: nextGrid,
        dijkstraQueue: nextQueue,
        distances,
        parents,
        step: step + 1,
        cursor: -1
    });
};

export const sudokuStep = (state: VisualizerState, cb: LogicCallbacks) => {
    const { sudokuBoard, sudokuOriginal, sudokuCurrent, step } = state;
    const board = [...sudokuBoard];

    const isSafe = (b: number[], r: number, c: number, n: number) => {
        for (let i = 0; i < 9; i++) if (b[r * 9 + i] === n) return false;
        for (let i = 0; i < 9; i++) if (b[i * 9 + c] === n) return false;
        const startRow = Math.floor(r / 3) * 3;
        const startCol = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (b[(startRow + i) * 9 + (startCol + j)] === n) return false;
            }
        }
        return true;
    };

    const findNext = (r: number, c: number): [number, number] | null => {
        const idx = r * 9 + c;
        for (let i = idx; i < 81; i++) {
            if (!sudokuOriginal[i]) return [Math.floor(i / 9), i % 9];
        }
        return null;
    };

    const findPrev = (r: number, c: number): [number, number] | null => {
        const idx = r * 9 + c;
        for (let i = idx - 1; i >= 0; i--) {
            if (!sudokuOriginal[i]) return [Math.floor(i / 9), i % 9];
        }
        return null;
    };

    const curr = sudokuCurrent || findNext(0, 0);
    if (!curr) {
        cb.updateRemoteState({ isPaused: true });
        cb.toast.success("Судокуг шийдлээ!");
        return;
    }

    const [r, c] = curr;
    const currentVal = board[r * 9 + c];
    let found = false;

    for (let num = currentVal + 1; num <= 9; num++) {
        if (isSafe(board, r, c, num)) {
            board[r * 9 + c] = num;
            const next = findNext(r, c + 1);
            cb.updateRemoteState({
                sudokuBoard: board,
                sudokuCurrent: next || [r, c],
                sudokuBacktracking: false,
                step: step + 1
            });
            if (!next) {
                cb.updateRemoteState({ isPaused: true });
                cb.toast.success("Судокуг шийдлээ!");
            }
            found = true;
            break;
        }
    }

    if (!found) {
        board[r * 9 + c] = 0;
        const prev = findPrev(r, c);
        if (!prev) {
            cb.updateRemoteState({ isPaused: true });
            cb.toast.error("Шийдэх боломжгүй!");
            return;
        }
        cb.updateRemoteState({
            sudokuBoard: board,
            sudokuCurrent: prev,
            sudokuBacktracking: true,
            step: step + 1
        });
    }
};

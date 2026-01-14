export type AlgoType = 'bubble_sort' | 'linear_search' | 'binary_search' | 'quick_sort' | 'dijkstra' | 'sudoku';
export type Language = 'cpp' | 'python' | 'java';

export interface Point {
    r: number;
    c: number;
}

export interface ArrayElement {
    id: string;
    val: number;
    colorIdx: number;
}

export interface VisualizerState {
    array: ArrayElement[];
    algoType: AlgoType;
    cursor: number;
    secondaryCursor: number; // For ranges or second comparisons
    comparing: number[];
    sorted: number[];
    pivot: number | null;
    isPaused: boolean;
    step: number;
    targetValue: number | null;
    foundIndex: number | null;

    // Quick Sort Stack (for manual steps)
    stack: { low: number, high: number }[];
    activeRange: [number, number] | null;

    // Dijkstra Grid
    grid: number[]; // Flattened array: 0: empty, 1: wall, 2: start, 3: end, 4: visiting, 5: visited, 6: path
    startNode: Point | null;
    endNode: Point | null;
    dijkstraQueue: { r: number, c: number, dist: number, parent: string | null }[];
    distances: Record<string, number>;
    parents: Record<string, string | null>;

    // Sudoku State
    sudokuBoard: number[]; // 81 elements (9x9)
    sudokuOriginal: boolean[]; // Which cells are fixed
    sudokuCurrent: [number, number] | null; // Currently trying [row, col]
    sudokuBacktracking: boolean; // Is it currently going back?

    speed: number; // Delay in ms
}

export const GRID_ROWS = 12;
export const GRID_COLS = 20;

export const BAR_COLORS = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-cyan-500 to-cyan-600',
    'from-indigo-500 to-indigo-600',
    'from-violet-500 to-violet-600',
    'from-pink-500 to-pink-600',
    'from-rose-500 to-rose-600',
    'from-orange-500 to-orange-600',
    'from-amber-500 to-amber-600',
    'from-emerald-500 to-emerald-600',
    'from-teal-500 to-teal-600',
    'from-sky-500 to-sky-600',
];

export const ALGO_CODE: Record<AlgoType, Record<Language, string>> = {
    bubble_sort: {
        cpp: `void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
}`,
        python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]`,
        java: `void bubbleSort(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}`
    },
    linear_search: {
        cpp: `int linearSearch(int arr[], int n, int x) {
    for (int i = 0; i < n; i++) {
        if (arr[i] == x) return i;
    }
    return -1;
}`,
        python: `def linear_search(arr, x):
    for i in range(len(arr)):
        if arr[i] == x:
            return i
    return -1`,
        java: `int linearSearch(int[] arr, int x) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == x) return i;
    }
    return -1;
}`
    },
    binary_search: {
        cpp: `int binarySearch(int arr[], int n, int x) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == x) return mid;
        if (arr[mid] < x) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`,
        python: `def binary_search(arr, x):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == x: return mid
        elif arr[mid] < x: low = mid + 1
        else: high = mid - 1
    return -1`,
        java: `int binarySearch(int[] arr, int x) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == x) return mid;
        if (arr[mid] < x) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}`
    },
    quick_sort: {
        cpp: `int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return (i + 1);
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`,
        python: `def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] < pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i+1], arr[high] = arr[high], arr[i+1]
    return i + 1

def quick_sort(arr, low, high):
    if low < high:
        pi = partition(arr, low, high)
        quick_sort(arr, low, pi - 1)
        quick_sort(arr, pi + 1, high)`,
        java: `int partition(int[] arr, int low, int high) {
    int pivot = arr[high], i = (low - 1);
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            int temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
        }
    }
    int temp = arr[i+1]; arr[i+1] = arr[high]; arr[high] = temp;
    return (i + 1);
}

void quickSort(int[] arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`
    },
    dijkstra: {
        cpp: `void dijkstra(int start) {
    priority_queue<pair<int, int>, vector<pair<int, int>>, 
                   greater<pair<int, int>>> pq;
    pq.push({0, start}); dist[start] = 0;
    while (!pq.empty()) {
        int u = pq.top().second; pq.pop();
        for (auto v : adj[u]) {
            if (dist[v.first] > dist[u] + v.second) {
                dist[v.first] = dist[u] + v.second;
                pq.push({dist[v.first], v.first});
            }
        }
    }
}`,
        python: `import heapq
def dijkstra(adj, start):
    dist = {node: float('inf') for node in adj}
    dist[start] = 0
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]: continue
        for v, w in adj[u]:
            if dist[v] > d + w:
                dist[v] = d + w
                heapq.heappush(pq, (dist[v], v))`,
        java: `void dijkstra(int start) {
    PriorityQueue<Node> pq = new PriorityQueue<>((a, b) -> a.dist - b.dist);
    pq.add(new Node(start, 0)); dist[start] = 0;
    while (!pq.isEmpty()) {
        int u = pq.poll().id;
        for (Edge e : adj[u]) {
            if (dist[e.to] > dist[u] + e.weight) {
                dist[e.to] = dist[u] + e.weight;
                pq.add(new Node(e.to, dist[e.to]));
            }
        }
    }
}`
    },
    sudoku: {
        cpp: `bool solveSudoku(int grid[9][9]) {
    int row, col;
    if (!findEmpty(grid, row, col)) return true;
    for (int num = 1; num <= 9; num++) {
        if (isSafe(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveSudoku(grid)) return true;
            grid[row][col] = 0; // Backtrack
        }
    }
    return false;
}`,
        python: `def solve_sudoku(grid):
    empty = find_empty(grid)
    if not empty: return True
    r, c = empty
    for num in range(1, 10):
        if is_safe(grid, r, c, num):
            grid[r][c] = num
            if solve_sudoku(grid): return True
            grid[r][c] = 0 # Backtrack
    return False`,
        java: `boolean solveSudoku(int[][] grid) {
    int[] empty = findEmpty(grid);
    if (empty == null) return true;
    int r = empty[0], c = empty[1];
    for (int num = 1; num <= 9; num++) {
        if (isSafe(grid, r, c, num)) {
            grid[r][c] = num;
            if (solveSudoku(grid)) return true;
            grid[r][c] = 0; // Backtrack
        }
    }
    return false;
}`
    }
};

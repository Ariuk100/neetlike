'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Trophy, Clock, HelpCircle, Check, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Textarea } from '@/components/ui/textarea';
import { WhiteboardElement } from '../../../types';

// Types
interface Question {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    timeLimit?: number;
}

interface PlayerScore {
    name: string;
    totalScore: number;
    correctCount: number;
    answers: {
        questionId: string;
        answerIndex: number;
        isCorrect: boolean;
        responseTime: number;
        score: number;
    }[];
    // NEW: Self-paced progress
    currentQuestionIndex: number;
    lastAnsweredAt: number; // Timestamp of last answer (or game start) to calc time for next Q
}

// Extend WhiteboardElement for Quiz specifics
// Note: WhiteboardElement has [key: string]: any, so this is just for type safety within this file
interface QuizGameElement extends WhiteboardElement {
    questions?: Question[];
    // gameStatus is already optional in WhiteboardElement (via flexible index signature or mapped type), 
    // but good to be explicit for this component if needed. 
    // However, index signature '[key: string]: any' usually covers it. 
    // WhiteboardElement definition in types/index.ts usually has id, type, x, y, width, height, etc.
    gameStatus?: 'editing' | 'waiting' | 'playing' | 'showing_answer' | 'finished';
    questionStartedAt?: any; // Timestamp or number
    players?: Record<string, PlayerScore>;
    defaultTimeLimit?: number;
}

interface QuizGameProps {
    element: WhiteboardElement; // Use generic type from prop
    isTeacher: boolean;
    isAllowedToWrite?: boolean;
    updateElement: (id: string, data: Partial<WhiteboardElement>) => void | Promise<void>;
    sessionId: string;
    currentPage: number;
    userName: string;
    collectionName?: string;
}

const OPTION_COLORS = [
    { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white' },
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white' },
    { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-black' },
    { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white' },
];

const DEFAULT_TIME_LIMIT = 5; // seconds

// --- SUB-COMPONENTS ---

interface LeaderboardPanelProps {
    leaderboard: PlayerScore[];
    userName: string;
    questions: Question[];
}

const LeaderboardPanel = ({ leaderboard, userName, questions }: LeaderboardPanelProps) => (
    <div className="h-full bg-black/30 lg:border-l border-white/10 flex flex-col min-h-0">
        <div className="p-3 border-b border-white/10 font-bold bg-black/20 flex items-center gap-2 flex-shrink-0">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Leaderboard
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar touch-pan-y min-h-0">
            {leaderboard.map((player, i) => (
                <div
                    key={player.name}
                    className={`
                        flex flex-col p-2 rounded 
                        ${player.name === userName ? 'bg-white/20 ring-1 ring-white/50' : 'bg-white/5'}
                        transition-all hover:bg-white/10
                    `}
                >
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`
                                w-5 h-5 flex items-center justify-center rounded text-xs font-bold
                                ${i === 0 ? 'bg-yellow-400 text-black' :
                                    i === 1 ? 'bg-gray-300 text-black' :
                                        i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/70'}
                            `}>
                                {i + 1}
                            </span>
                            <span className="truncate text-sm font-medium max-w-[80px] sm:max-w-[120px]">{player.name || 'Unknown'}</span>
                        </div>
                        <span className="text-xs font-bold text-yellow-300">{player.totalScore || 0}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (player.currentQuestionIndex / (questions.length || 1)) * 100)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default function QuizGame(props: QuizGameProps) {
    const { isTeacher, element: baseElement, sessionId, userName, collectionName = 'whiteboard_sessions', updateElement } = props;

    // Cast element to our specific type locally
    const element = baseElement as QuizGameElement;

    // Local state
    // Re-added timeLeft state that was accidentally removed
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LIMIT);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showWrongFeedback, setShowWrongFeedback] = useState(false); // Local feedback for wrong answer

    // Mobile View State
    const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');

    // Element data
    const questions = element.questions || [];
    const gameStatus = element.gameStatus || 'editing';


    // Helper to safely get millis from potential Timestamp or number
    const getSafeMillis = (val: unknown): number => {
        if (!val) return 0;
        if (typeof val === 'number') return val;

        // Firestore Timestamp
        if (val && typeof (val as Timestamp).toMillis === 'function') {
            return (val as Timestamp).toMillis();
        }

        // Raw object sometimes
        const tVal = val as { seconds?: number };
        if (typeof tVal.seconds === 'number') return tVal.seconds * 1000;

        return 0;
    };

    const gameStartedAt = getSafeMillis(element.questionStartedAt);
    const players = useMemo(() => element.players || {}, [element.players]);
    const defaultTimeLimit = element.defaultTimeLimit || DEFAULT_TIME_LIMIT;

    // My player ID
    const myId = userName.replace(/\s+/g, '_');
    const myScore = players[myId];

    // My current progress
    const myQuestionIndex = myScore?.currentQuestionIndex ?? 0;
    const isFinished = myQuestionIndex >= questions.length;
    const currentQuestion = !isFinished ? questions[myQuestionIndex] : null;

    // Time limit for CURRENT player's question
    const timeLimit = currentQuestion?.timeLimit ?? defaultTimeLimit;

    // Timer logic depends on when *I* started this question
    // If it's Q1, start time is game start.
    // If Q>1, start time is lastAnsweredAt.
    const myQuestionStartTime = myQuestionIndex === 0 ? gameStartedAt : (myScore?.lastAnsweredAt ?? gameStartedAt);

    // --------------------------------------------------------------------------------
    // Firestore update helper
    // --------------------------------------------------------------------------------
    const updateQuizElement = useCallback(async (updates: Record<string, unknown>) => {
        try {
            // Use props.updateElement instead of direct firestore call where possible, 
            // BUT props.updateElement accepts Partial<WhiteboardElement>.
            // Complex nested updates like `players.${myId}` might not work well with simple partial update
            // if the parent component's updateElement implementation handles merging or is just a setDoc.
            // Looking at previous games (PhotonRace), it used direct updateDoc for complex paths.
            // Let's stick to direct updateDoc if we need nested field updates (dot notation),
            // OR check if updateElement supports it. 
            // Usually updateElement (from useWhiteboard) might just be doing updateDoc(ref, data).
            // If so, passing { [`players.${myId}`]: ... } works.

            // However, the previous game used separate updateGameElement with direct updateDoc call.
            // Let's try to use props.updateElement if it's robust, otherwise fallback.
            // Given registry type fix, updateElement returns Promise<void>.

            // Let's try using the prop first for cleaner code, assuming it passes 'data' to updateDoc.
            // If the key is "players.someID", it works in Firestore updateDoc.
            // BUT props.updateElement expects Partial<WhiteboardElement>, and { "players.myId": ... } 
            // might trigger TS error if not casted.

            await updateElement(element.id, updates as Partial<WhiteboardElement>);

        } catch (e) {
            console.error('Quiz update error:', e);
        }
    }, [updateElement, element.id]);


    // Initial join/setup for player
    useEffect(() => {
        if (gameStatus === 'playing' && !myScore && !isTeacher) {
            // Auto join if game is playing and I'm not in it
            const newPlayer: PlayerScore = {
                name: userName,
                totalScore: 0,
                correctCount: 0,
                answers: [],
                currentQuestionIndex: 0,
                lastAnsweredAt: Date.now()
            };
            updateQuizElement({
                [`players.${myId}`]: newPlayer
            });
        }
    }, [gameStatus, myScore, isTeacher, userName, myId, updateQuizElement]);


    // Timer Update
    useEffect(() => {
        if (gameStatus !== 'playing' || isFinished || isTeacher) {
            return;
        }

        const interval = setInterval(() => {
            if (showWrongFeedback) return;

            const elapsed = (Date.now() - myQuestionStartTime) / 1000;
            const remaining = Math.max(0, timeLimit - elapsed);
            setTimeLeft(remaining);

            // Auto-advance when time runs out
            if (remaining <= 0 && currentQuestion) {
                // Time's up! Move to next question without scoring
                const currentPlayerData = players[myId] || {
                    name: userName,
                    totalScore: 0,
                    correctCount: 0,
                    answers: [],
                    currentQuestionIndex: 0,
                    lastAnsweredAt: Date.now()
                };

                const updatedPlayer: PlayerScore = {
                    ...currentPlayerData,
                    currentQuestionIndex: (currentPlayerData.currentQuestionIndex || 0) + 1,
                    lastAnsweredAt: Date.now()
                };

                updateQuizElement({
                    [`players.${myId}`]: updatedPlayer
                });

                toast.warning('Цаг дууслаа! Дараагийн асуулт');
            }
        }, 100);

        return () => clearInterval(interval);
    }, [gameStatus, isFinished, myQuestionStartTime, timeLimit, showWrongFeedback, isTeacher, updateQuizElement, currentQuestion, players, myId, userName]);


    // Sorted leaderboard
    const leaderboard = useMemo(() => {
        return Object.values(players)
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    }, [players]);

    // My rank
    const myRank = useMemo(() => {
        const idx = leaderboard.findIndex(p => p.name === userName);
        return idx >= 0 ? idx + 1 : 0;
    }, [leaderboard, userName]);

    // (Duplicate definition removed)

    // --------------------------------------------------------------------------------
    // Actions
    // --------------------------------------------------------------------------------
    const handleParseJSON = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                toast.error('JSON-д "questions" массив байх ёстой');
                return;
            }

            // Shuffle helper
            const shuffleArray = (array: string[]) => {
                const arr = [...array];
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            };

            const formattedQuestions: Question[] = [];

            // Validate each question structure
            for (let i = 0; i < parsed.questions.length; i++) {
                const q = parsed.questions[i];

                // Allow string "correctAnswer" OR index "correctIndex" (backward compat if needed, but we focus on new req)
                // User requirement: "correctAnswer" string.
                if (!q.question || !Array.isArray(q.options)) {
                    toast.error(`Асуулт ${i + 1} бүтэц буруу байна (question, options)`);
                    return;
                }

                let finalOptions = q.options;
                let finalCorrectIndex = -1;

                if (typeof q.correctAnswer === 'string') {
                    // Normalize check
                    const answerText = q.correctAnswer.trim();
                    if (!q.options.includes(answerText)) {
                        toast.error(`"${q.question}" асуултын зөв хариулт сонголтууд дунд байхгүй байна:\n"${answerText}"`);
                        return;
                    }

                    // SHUFFLE
                    finalOptions = shuffleArray(q.options);
                    finalCorrectIndex = finalOptions.indexOf(answerText);
                } else if (typeof q.correctIndex === 'number') {
                    // Fallback to old index way (but no shuffle to be safe unless we want to shuffle and track index map, which is complex. Let's just keep old behavior for index)
                    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
                        toast.error(`"${q.question}" index буруу байна`);
                        return;
                    }
                    finalCorrectIndex = q.correctIndex;
                    // We don't shuffle if using strict index to avoid confusion unless explicitly requested.
                    // User asked to shuffle. If user provides index, shuffling breaks it unless we know WHICH option was correct before shuffle.
                    // Let's assume shuffling ONLY happens when correctAnswer string is provided.
                } else {
                    toast.error(`"${q.question}" зөв хариулт (correctAnswer) байхгүй байна`);
                    return;
                }

                formattedQuestions.push({
                    id: `q_${i}_${Date.now()}`,
                    question: q.question,
                    options: finalOptions,
                    correctIndex: finalCorrectIndex,
                    timeLimit: q.timeLimit || DEFAULT_TIME_LIMIT
                });
            }

            updateQuizElement({
                questions: formattedQuestions,
                gameStatus: 'waiting'
            });
            toast.success(`${formattedQuestions.length} асуулт амжилттай нэмэгдлээ! (Shuffled)`);
        } catch {
            toast.error('JSON формат буруу байна');
        }
    };

    const handleStartQuiz = async () => {
        if (questions.length === 0) {
            toast.error('Асуулт нэмнэ үү');
            return;
        }

        // Mobile fullscreen + landscape
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                try {
                    await elem.requestFullscreen();
                } catch (err) {
                    console.log('Fullscreen error:', err);
                }
            }
            if (screen.orientation) {
                try {
                    // @ts-expect-error - orientation.lock is experimental API
                    await screen.orientation.lock('landscape');
                } catch (err) {
                    console.log('Orientation lock error:', err);
                }
            }
        }

        await updateQuizElement({
            gameStatus: 'playing',
            questionStartedAt: serverTimestamp(),
            players: {} // Reset players
        });
        toast.success('Quiz эхэллээ! (Race Mode)');
    };

    const handleAnswer = async (optionIndex: number) => {
        // Prevent double clicks or answering if finished
        if (showWrongFeedback || !currentQuestion || gameStatus !== 'playing') return;

        setSelectedOption(optionIndex);

        const now = Date.now();
        const elapsedRaw = now - myQuestionStartTime;
        const responseTime = Math.min(Math.max(0, elapsedRaw), timeLimit * 1000);

        const isCorrect = optionIndex === currentQuestion.correctIndex;

        // Current player state
        const currentPlayerData = players[myId] || {
            name: userName,
            totalScore: 0,
            correctCount: 0,
            answers: [],
            currentQuestionIndex: 0,
            lastAnsweredAt: now
        };

        if (isCorrect) {
            // --- CORRECT ANSWER ---
            // Calculate score: Max 1000, decays over time
            // Guard against division by zero
            const safeTimeLimit = timeLimit > 0 ? timeLimit : 5;
            const ratio = responseTime / (safeTimeLimit * 1000);
            const timeFactor = 1 - (ratio / 2); // 1.0 to 0.5
            const earnedScore = Math.max(0, Math.round(1000 * timeFactor)) || 0; // Guard NaN

            const newAnswer = {
                questionId: currentQuestion.id,
                answerIndex: optionIndex,
                isCorrect: true,
                responseTime,
                score: earnedScore
            };

            const updatedPlayer: PlayerScore = {
                ...currentPlayerData,
                totalScore: (currentPlayerData.totalScore || 0) + earnedScore,
                correctCount: (currentPlayerData.correctCount || 0) + 1,
                answers: [...(currentPlayerData.answers || []), newAnswer],
                currentQuestionIndex: (currentPlayerData.currentQuestionIndex || 0) + 1, // Advance!
                lastAnsweredAt: now // Reset timer for next Q (Local assumption ok for own progress)
            };

            await updateQuizElement({
                [`players.${myId}`]: updatedPlayer
            });

            toast.success(`Зөв! +${earnedScore} оноо`);
            setSelectedOption(null); // Reset selection for next Q
        } else {
            // --- WRONG ANSWER ---
            // Penalty: -200 points
            // Do NOT advance index.
            const penalty = 200;
            const newScore = (currentPlayerData.totalScore || 0) - penalty;

            const updatedPlayer: PlayerScore = {
                ...currentPlayerData,
                totalScore: newScore,
                // Do not add to "answers" array unless we want to track failed attempts history? 
                // Maintaining simple history: maybe just deduct score. 
                // Let's NOT update lastAnsweredAt so timer keeps running? Or reset it? 
                // Usually in race mode, timer just keeps ticking for that question until solved.
            };

            await updateQuizElement({
                [`players.${myId}`]: updatedPlayer
            });

            // Local UI feedback
            setShowWrongFeedback(true);
            toast.error(`Буруу! -${penalty} оноо`);

            // Allow retry after short delay
            setTimeout(() => {
                setShowWrongFeedback(false);
                setSelectedOption(null);
            }, 1000);
        }
    };

    const handleReset = async () => {
        await updateQuizElement({
            gameStatus: 'editing',
            questions: [],
            players: {},
            questionStartedAt: 0
        });
        setJsonInput('');
    };

    // --------------------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------------------

    // Editing mode - Teacher enters JSON
    if (gameStatus === 'editing' && isTeacher) {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 p-2 sm:p-4 text-white">
                <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <HelpCircle className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-sm sm:text-base">Quiz Game - Асуулт оруулах</span>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <Textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={`{
  "questions": [
    {
      "question": "Асуулт текст?",
      "options": ["Paris", "London", "Berlin", "Tokyo"],
      "correctAnswer": "Paris",
      "timeLimit": 10
    }
  ]
}`}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono text-xs sm:text-sm"
                    />

                    <Button onClick={handleParseJSON} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto self-end">
                        <Check className="w-4 h-4 mr-2" />
                        JSON шалгах
                    </Button>
                </div>
            </div>
        );
    }

    // Waiting mode - Ready to start
    if (gameStatus === 'waiting') {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 p-4 text-white text-center">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-yellow-400" />
                        <span className="font-bold">Quiz Game</span>
                    </div>
                    <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        {questions.length} асуулт
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="text-4xl sm:text-6xl">🎯</div>
                    <div className="text-lg sm:text-xl font-bold">Quiz бэлэн боллоо!</div>

                    {isTeacher ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto px-4">
                            <Button onClick={handleStartQuiz} size="lg" className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                                <Play className="w-5 h-5 mr-2" />
                                <span className="text-white">Эхлүүлэх</span>
                            </Button>
                            <Button onClick={handleReset} variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                <span className="text-white">Дахин</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="text-white/70 animate-pulse">Багш эхлүүлэхийг хүлээж байна...</div>
                    )}
                </div>
            </div>
        );
    }

    // Playing mode (includes showing "Finished" state for individual player)
    if (gameStatus === 'playing') {
        return (
            <div className="flex flex-col lg:flex-row w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 text-white min-h-0">

                {/* Mobile Tab Switcher */}
                <div className="lg:hidden flex border-b border-white/10 bg-black/20 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('game')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'game' ? 'bg-white/10 text-white' : 'text-white/50'}`}
                    >
                        <Play className="w-4 h-4" /> Game
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'leaderboard' ? 'bg-white/10 text-white' : 'text-white/50'}`}
                    >
                        <Trophy className="w-4 h-4" /> Leaderboard
                    </button>
                </div>

                {/* Main Game Area (Visible if Desktop OR ActiveTab is Game) */}
                <div className={`flex-1 flex flex-col min-h-0 relative ${activeTab === 'game' ? 'flex' : 'hidden lg:flex'}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 sm:px-4 py-1 sm:py-3 bg-black/20 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            {/* Only show title on desktop to save space on mobile */}
                            <span className="font-bold hidden sm:inline">Quiz Race</span>
                            <span className="font-bold sm:hidden">Quiz</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {!isFinished && !isTeacher && (
                                <>
                                    <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full ${timeLeft < 2 ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`}>
                                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span className="font-mono font-bold text-sm sm:text-base">
                                            {timeLeft.toFixed(1)}s
                                        </span>
                                    </div>
                                    <div className="text-xs sm:text-sm bg-white/20 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                                        {Math.min(myQuestionIndex + 1, questions.length)} / {questions.length}
                                    </div>
                                </>
                            )}
                            {isTeacher && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={handleReset}
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-xs px-2 hover:bg-red-600"
                                    >
                                        <RotateCcw className="w-3 h-3 sm:mr-1" />
                                        <span className="hidden sm:inline">Дуусгах</span>
                                    </Button>
                                    <div className="bg-white/20 text-white h-7 px-2 sm:px-3 flex items-center rounded text-xs pointer-events-none whitespace-nowrap">
                                        Live View
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col items-center justify-start p-1 sm:p-4 relative overflow-y-auto overflow-x-hidden touch-pan-y min-h-0">
                        {isTeacher ? (
                            <div className="text-center opacity-70">
                                <div className="text-4xl sm:text-6xl mb-4">👀</div>
                                <div className="text-base sm:text-xl px-4">Сурагчдын явцыг {activeTab === 'game' ? 'Leaderboard хэсгээс' : 'баруун талын самбараас'} харна уу.</div>
                            </div>
                        ) : isFinished ? (
                            <div className="text-center animate-zoom-in p-4">
                                <div className="text-4xl sm:text-6xl mb-4">🏆</div>
                                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Баяр хүргэе!</h2>
                                <p className="text-base sm:text-xl opacity-80 mb-4">Та бүх асуултанд хариуллаа.</p>
                                <div className="bg-white/10 p-4 rounded-xl inline-block min-w-[200px]">
                                    <div className="text-sm uppercase tracking-wider opacity-60">Нийт оноо</div>
                                    <div className="text-3xl sm:text-4xl font-bold text-yellow-400">{myScore?.totalScore || 0}</div>
                                </div>
                            </div>
                        ) : currentQuestion ? (
                            <div className="w-full max-w-3xl flex flex-col items-center gap-1 sm:gap-6 pt-1 pb-2 max-h-full">
                                <h2 className="text-xs sm:text-3xl font-bold text-center leading-tight px-2 mb-0.5">
                                    {currentQuestion.question}
                                </h2>

                                {/* Mobile & Desktop: 2x2 Grid */}
                                <div className="w-full grid grid-cols-2 gap-1.5 sm:gap-4 px-2">
                                    {currentQuestion.options.map((option, idx) => {
                                        const colors = OPTION_COLORS[idx % OPTION_COLORS.length];
                                        const isSelected = selectedOption === idx;

                                        // Feedback styles
                                        let btnStyle = `${colors.bg} ${colors.hover} ${colors.text}`;
                                        if (showWrongFeedback && isSelected) {
                                            btnStyle = 'bg-red-600 animate-shake ring-4 ring-red-400';
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                disabled={selectedOption !== null}
                                                className={`
                                                    ${btnStyle} 
                                                    relative rounded-lg sm:rounded-xl px-1 py-3 sm:p-4 font-bold 
                                                    transition-transform active:scale-95 shadow-lg
                                                    flex items-center justify-center text-center
                                                    disabled:opacity-80 disabled:cursor-not-allowed
                                                    break-words leading-tight
                                                    h-auto sm:h-32
                                                    text-[10px] sm:text-xl
                                                `}
                                            >
                                                {showWrongFeedback && isSelected && (
                                                    <X className="absolute top-0.5 right-0.5 w-3 h-3 sm:w-6 sm:h-6 text-white" />
                                                )}
                                                <span className="line-clamp-2 sm:line-clamp-3 px-0.5 sm:px-2">{option}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin text-4xl mb-2">⏳</div>
                                <div>Ачаалж байна...</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Leaderboard Sidebar (Fixed Right on Desktop, Toggle on Mobile) */}
                <div className={`w-full lg:w-64 flex-shrink-0 min-h-0 ${activeTab === 'leaderboard' ? 'flex-1' : 'hidden lg:flex'}`}>
                    <LeaderboardPanel
                        leaderboard={leaderboard}
                        userName={userName}
                        questions={questions}
                    />
                </div>
            </div>
        );
    }

    // Finished mode
    if (gameStatus === 'finished') {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-4">
                <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <span className="font-bold text-xl">Quiz дууслаа!</span>
                </div>

                {/* My Result */}
                {myRank > 0 && (
                    <div className="text-center mb-4 p-4 bg-white/10 rounded-xl flex-shrink-0">
                        <div className="text-4xl mb-2">
                            {myRank === 1 && '🥇'}
                            {myRank === 2 && '🥈'}
                            {myRank === 3 && '🥉'}
                            {myRank > 3 && '🏁'}
                        </div>
                        <div className="text-2xl font-bold">{myRank}-р байр</div>
                        <div className="text-white/70">{myScore?.totalScore || 0} оноо</div>
                        <div className="text-sm text-white/50">
                            {myScore?.correctCount || 0}/{questions.length} зөв
                        </div>
                    </div>
                )}

                {/* Full Leaderboard */}
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar touch-pan-y">
                    {leaderboard.map((player, i) => (
                        <div
                            key={player.name}
                            className={`flex items-center justify-between p-3 rounded-lg ${player.name === userName ? 'bg-yellow-500/30 ring-2 ring-yellow-400' : 'bg-white/10'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-amber-600 text-white' : 'bg-white/20'}`}>
                                    {i + 1}
                                </span>
                                <span className="font-medium truncate max-w-[120px] sm:max-w-xs">{player.name}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="font-bold">{player.totalScore}</div>
                                <div className="text-xs text-white/60">{player.correctCount}/{questions.length}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Teacher Reset Button */}
                {isTeacher && (
                    <Button onClick={handleReset} className="mt-4 bg-white/20 hover:bg-white/30 flex-shrink-0">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Дахин тоглох
                    </Button>
                )}
            </div>
        );
    }

    // Default fallback (student waiting for teacher to set up)
    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
            <HelpCircle className="w-12 h-12 text-yellow-400 mb-4" />
            <div className="text-lg font-bold">Quiz Game</div>
            <div className="text-white/60 text-sm">Багш асуултуудыг оруулж байна...</div>
        </div>
    );
}

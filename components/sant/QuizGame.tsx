'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Trophy, Clock, HelpCircle, Check, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Textarea } from '@/components/ui/textarea';

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
}

interface QuizGameElement {
    id: string;
    type: string; // Flexible to work with ElementLayer
    questions?: Question[];
    gameStatus?: 'editing' | 'waiting' | 'playing' | 'showing_answer' | 'finished';
    currentQuestionIndex?: number;
    questionStartedAt?: number;
    players?: Record<string, PlayerScore>;
    defaultTimeLimit?: number;
}

interface QuizGameProps {
    isTeacher: boolean;
    isAllowedDraw: boolean;
    element: QuizGameElement;
    sessionId: string;
    currentPage: number;
    userName: string;
}

const OPTION_COLORS = [
    { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white' },
    { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white' },
    { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-black' },
    { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white' },
];

const DEFAULT_TIME_LIMIT = 5; // seconds

export default function QuizGame(props: QuizGameProps) {
    const { isTeacher, element, sessionId, userName } = props;

    // Local state
    const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_LIMIT);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const answeredRef = useRef(false);
    const answerStartTime = useRef<number>(0);

    // Element data
    const questions = element.questions || [];
    const gameStatus = element.gameStatus || 'editing';
    const currentQuestionIndex = element.currentQuestionIndex || 0;
    const questionStartedAt = element.questionStartedAt || 0;
    const players = useMemo(() => element.players || {}, [element.players]);
    const defaultTimeLimit = element.defaultTimeLimit || DEFAULT_TIME_LIMIT;

    const currentQuestion = questions[currentQuestionIndex];
    const timeLimit = currentQuestion?.timeLimit || defaultTimeLimit;

    // My player ID
    const myId = userName.replace(/\s+/g, '_');
    const myScore = players[myId];

    // Check if I already answered current question
    const hasAnsweredCurrent = useMemo(() => {
        if (!myScore || !currentQuestion) return false;
        return myScore.answers.some(a => a.questionId === currentQuestion.id);
    }, [myScore, currentQuestion]);

    // Sorted leaderboard
    const leaderboard = useMemo(() => {
        return Object.values(players)
            .sort((a, b) => b.totalScore - a.totalScore);
    }, [players]);

    // My rank
    const myRank = useMemo(() => {
        const idx = leaderboard.findIndex(p => p.name === userName);
        return idx >= 0 ? idx + 1 : 0;
    }, [leaderboard, userName]);

    // --------------------------------------------------------------------------------
    // Firestore update helper
    // --------------------------------------------------------------------------------
    const updateQuizElement = useCallback(async (updates: Record<string, unknown>) => {
        try {
            const elementRef = doc(db, 'whiteboard_sessions', sessionId, 'pages', String(props.currentPage), 'elements', element.id);
            await updateDoc(elementRef, updates);
        } catch (e) {
            console.error('Quiz update error:', e);
        }
    }, [sessionId, props.currentPage, element.id]);

    // --------------------------------------------------------------------------------
    // Timer
    // --------------------------------------------------------------------------------
    useEffect(() => {
        if (gameStatus !== 'playing' || !questionStartedAt) {
            setTimeLeft(timeLimit);
            return;
        }

        // Reset answer state for new question
        answeredRef.current = hasAnsweredCurrent;
        answerStartTime.current = questionStartedAt;
        setSelectedOption(null);

        const interval = setInterval(() => {
            const elapsed = (Date.now() - questionStartedAt) / 1000;
            const remaining = Math.max(0, timeLimit - elapsed);
            setTimeLeft(remaining);

            // Time's up - auto advance (teacher only)
            if (remaining <= 0 && isTeacher) {
                clearInterval(interval);
                updateQuizElement({ gameStatus: 'showing_answer' });
            }
        }, 100);

        return () => clearInterval(interval);
    }, [gameStatus, questionStartedAt, timeLimit, isTeacher, hasAnsweredCurrent, updateQuizElement]);

    // --------------------------------------------------------------------------------
    // Show answer phase timer (2 seconds then next question)
    // --------------------------------------------------------------------------------
    useEffect(() => {
        if (gameStatus !== 'showing_answer' || !isTeacher) return;

        const timeout = setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                // Next question
                updateQuizElement({
                    currentQuestionIndex: currentQuestionIndex + 1,
                    questionStartedAt: Date.now(),
                    gameStatus: 'playing'
                });
            } else {
                // Game finished
                updateQuizElement({ gameStatus: 'finished' });
            }
        }, 2000);

        return () => clearTimeout(timeout);
    }, [gameStatus, isTeacher, currentQuestionIndex, questions.length, updateQuizElement]);

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

            const formattedQuestions: Question[] = parsed.questions.map((q: { question: string; options: string[]; correctIndex: number; timeLimit?: number }, i: number) => ({
                id: `q_${i}_${Date.now()}`,
                question: q.question,
                options: q.options,
                correctIndex: q.correctIndex,
                timeLimit: q.timeLimit || DEFAULT_TIME_LIMIT
            }));

            updateQuizElement({
                questions: formattedQuestions,
                gameStatus: 'waiting'
            });
            toast.success(`${formattedQuestions.length} асуулт амжилттай нэмэгдлээ!`);
        } catch {
            toast.error('JSON формат буруу байна');
        }
    };

    const handleStartQuiz = async () => {
        if (questions.length === 0) {
            toast.error('Асуулт нэмнэ үү');
            return;
        }

        await updateQuizElement({
            gameStatus: 'playing',
            currentQuestionIndex: 0,
            questionStartedAt: Date.now(),
            players: {}
        });
        toast.success('Quiz эхэллээ!');
    };

    const handleAnswer = async (optionIndex: number) => {
        if (answeredRef.current || !currentQuestion || gameStatus !== 'playing') return;

        answeredRef.current = true;
        setSelectedOption(optionIndex);

        const responseTime = Date.now() - questionStartedAt;
        const isCorrect = optionIndex === currentQuestion.correctIndex;

        // Calculate score (max 1000, decreases with time)
        let score = 0;
        if (isCorrect) {
            const timeFraction = Math.max(0, 1 - (responseTime / (timeLimit * 1000)));
            score = Math.round(1000 * timeFraction);
        }

        const newAnswer = {
            questionId: currentQuestion.id,
            answerIndex: optionIndex,
            isCorrect,
            responseTime,
            score
        };

        const currentPlayerData = players[myId] || {
            name: userName,
            totalScore: 0,
            correctCount: 0,
            answers: []
        };

        const updatedPlayer: PlayerScore = {
            ...currentPlayerData,
            totalScore: currentPlayerData.totalScore + score,
            correctCount: currentPlayerData.correctCount + (isCorrect ? 1 : 0),
            answers: [...currentPlayerData.answers, newAnswer]
        };

        await updateQuizElement({
            [`players.${myId}`]: updatedPlayer
        });

        if (isCorrect) {
            toast.success(`Зөв! +${score} оноо`);
        } else {
            toast.error('Буруу!');
        }
    };

    const handleReset = async () => {
        await updateQuizElement({
            gameStatus: 'editing',
            questions: [],
            currentQuestionIndex: 0,
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
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 p-4 text-white">
                <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold">Quiz Game - Асуулт оруулах</span>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <Textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={`{
  "questions": [
    {
      "question": "Асуулт текст?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    }
  ]
}`}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono text-sm"
                    />

                    <Button onClick={handleParseJSON} className="bg-green-500 hover:bg-green-600">
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
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 p-4 text-white">
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
                    <div className="text-6xl">🎯</div>
                    <div className="text-xl font-bold">Quiz бэлэн боллоо!</div>

                    {isTeacher ? (
                        <div className="flex gap-2">
                            <Button onClick={handleStartQuiz} size="lg" className="bg-green-500 hover:bg-green-600">
                                <Play className="w-5 h-5 mr-2" />
                                Эхлүүлэх
                            </Button>
                            <Button onClick={handleReset} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Дахин
                            </Button>
                        </div>
                    ) : (
                        <div className="text-white/70">Багш эхлүүлэхийг хүлээж байна...</div>
                    )}
                </div>
            </div>
        );
    }

    // Playing or Showing Answer mode
    if ((gameStatus === 'playing' || gameStatus === 'showing_answer') && currentQuestion) {
        const isShowingAnswer = gameStatus === 'showing_answer';

        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-black/20">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-yellow-400" />
                        <span className="font-bold text-sm">Quiz</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${timeLeft < 2 ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`}>
                            <Clock className="w-4 h-4" />
                            <span className="font-mono font-bold">{timeLeft.toFixed(1)}s</span>
                        </div>
                        <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                            {currentQuestionIndex + 1}/{questions.length}
                        </div>
                    </div>
                </div>

                {/* Question */}
                <div className="px-4 py-6 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold">{currentQuestion.question}</h2>
                </div>

                {/* Options */}
                <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-4">
                    {currentQuestion.options.map((option, idx) => {
                        const colors = OPTION_COLORS[idx];
                        const isCorrect = idx === currentQuestion.correctIndex;
                        const isSelected = selectedOption === idx;

                        let buttonClass = `${colors.bg} ${colors.hover} ${colors.text}`;
                        if (isShowingAnswer) {
                            if (isCorrect) {
                                buttonClass = 'bg-green-500 ring-4 ring-green-300';
                            } else if (isSelected && !isCorrect) {
                                buttonClass = 'bg-red-800 opacity-50';
                            } else {
                                buttonClass = `${colors.bg} opacity-30`;
                            }
                        } else if (isSelected) {
                            buttonClass = `${colors.bg} ring-4 ring-white`;
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                disabled={hasAnsweredCurrent || isShowingAnswer}
                                className={`${buttonClass} rounded-xl p-4 text-lg font-bold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed`}
                            >
                                {isShowingAnswer && isCorrect && <Check className="w-6 h-6" />}
                                {isShowingAnswer && isSelected && !isCorrect && <X className="w-6 h-6" />}
                                {option}
                            </button>
                        );
                    })}
                </div>

                {/* Leaderboard Sidebar */}
                <div className="bg-black/30 px-4 py-2 max-h-32 overflow-y-auto">
                    <div className="text-xs font-bold uppercase text-white/60 mb-1">Leaderboard</div>
                    <div className="space-y-1">
                        {leaderboard.slice(0, 5).map((player, i) => (
                            <div
                                key={player.name}
                                className={`flex items-center justify-between text-sm ${player.name === userName ? 'bg-white/20 rounded px-2' : ''}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 text-center ${i === 0 ? 'text-yellow-400 font-bold' : 'text-white/60'}`}>
                                        {i + 1}
                                    </span>
                                    <span className="truncate max-w-[100px]">{player.name}</span>
                                </div>
                                <span className="font-mono font-bold">{player.totalScore}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Finished mode
    if (gameStatus === 'finished') {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <span className="font-bold text-xl">Quiz дууслаа!</span>
                </div>

                {/* My Result */}
                {myRank > 0 && (
                    <div className="text-center mb-4 p-4 bg-white/10 rounded-xl">
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
                <div className="flex-1 overflow-y-auto space-y-2">
                    {leaderboard.map((player, i) => (
                        <div
                            key={player.name}
                            className={`flex items-center justify-between p-3 rounded-lg ${player.name === userName ? 'bg-yellow-500/30 ring-2 ring-yellow-400' : 'bg-white/10'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-amber-600 text-white' : 'bg-white/20'}`}>
                                    {i + 1}
                                </span>
                                <span className="font-medium">{player.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">{player.totalScore} оноо</div>
                                <div className="text-xs text-white/60">{player.correctCount}/{questions.length} зөв</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Teacher Reset Button */}
                {isTeacher && (
                    <Button onClick={handleReset} className="mt-4 bg-white/20 hover:bg-white/30">
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

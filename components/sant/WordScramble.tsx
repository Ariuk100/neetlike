'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Trophy, RotateCcw, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Textarea } from '@/components/ui/textarea';

// Types
interface Word {
    word: string;
    hint: string;
    category?: string;
}

interface PlayerProgress {
    name: string;
    wordsCompleted: number;
    totalTime: number;
    currentWordIndex: number;
    wrongGuesses: number;
    guessedLetters: string[];
    startedAt: number;
    finishedAt?: number;
}

interface WordScrambleElement {
    id: string;
    type: string;
    words?: Word[];
    gameStatus?: 'editing' | 'waiting' | 'playing' | 'finished';
    players?: Record<string, PlayerProgress>;
    gameStartedAt?: Timestamp | number;
    language?: 'mongolian' | 'english';
    maxWrongGuesses?: number;
}

interface WordScrambleProps {
    isTeacher: boolean;
    element: WordScrambleElement;
    sessionId: string;
    currentPage: number;
    userName: string;
    collectionName?: string;
}

const DEFAULT_MAX_WRONG_GUESSES = 8;

// Hangman SVG stages - scales to match maxWrongGuesses
const HangmanStage = ({ wrongGuesses, maxWrongGuesses }: { wrongGuesses: number; maxWrongGuesses: number }) => {
    // Normalize wrongGuesses to 8 stages
    // If maxWrongGuesses = 5, then wrongGuess 1 = stage 1.6, wrongGuess 2 = stage 3.2, etc.
    const normalizedStage = maxWrongGuesses > 0 ? (wrongGuesses / maxWrongGuesses) * 8 : 0;

    return (
        <svg width="80" height="80" viewBox="0 0 100 120" className="mx-auto">
            {/* Gallows */}
            <line x1="10" y1="110" x2="50" y2="110" stroke="white" strokeWidth="2" />
            <line x1="30" y1="110" x2="30" y2="10" stroke="white" strokeWidth="2" />
            <line x1="30" y1="10" x2="60" y2="10" stroke="white" strokeWidth="2" />
            <line x1="60" y1="10" x2="60" y2="20" stroke="white" strokeWidth="2" />

            {/* Head */}
            {normalizedStage >= 1 && <circle cx="60" cy="30" r="8" stroke="white" strokeWidth="2" fill="none" />}

            {/* Body */}
            {normalizedStage >= 2 && <line x1="60" y1="38" x2="60" y2="60" stroke="white" strokeWidth="2" />}

            {/* Left arm */}
            {normalizedStage >= 3 && <line x1="60" y1="45" x2="50" y2="50" stroke="white" strokeWidth="2" />}

            {/* Right arm */}
            {normalizedStage >= 4 && <line x1="60" y1="45" x2="70" y2="50" stroke="white" strokeWidth="2" />}

            {/* Left leg */}
            {normalizedStage >= 5 && <line x1="60" y1="60" x2="50" y2="75" stroke="white" strokeWidth="2" />}

            {/* Right leg */}
            {normalizedStage >= 6 && <line x1="60" y1="60" x2="70" y2="75" stroke="white" strokeWidth="2" />}

            {/* Left eye (X) */}
            {normalizedStage >= 7 && (
                <>
                    <line x1="57" y1="28" x2="59" y2="30" stroke="white" strokeWidth="1" />
                    <line x1="59" y1="28" x2="57" y2="30" stroke="white" strokeWidth="1" />
                </>
            )}

            {/* Right eye (X) */}
            {normalizedStage >= 8 && (
                <>
                    <line x1="61" y1="28" x2="63" y2="30" stroke="white" strokeWidth="1" />
                    <line x1="63" y1="28" x2="61" y2="30" stroke="white" strokeWidth="1" />
                </>
            )}
        </svg>
    );
};

export default function WordScramble(props: WordScrambleProps) {
    const { isTeacher, element, sessionId, userName, collectionName = 'whiteboard_sessions' } = props;

    const [jsonInput, setJsonInput] = useState('');
    const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');

    const words = element.words || [];
    const gameStatus = element.gameStatus || 'editing';
    const players = useMemo(() => element.players || {}, [element.players]);
    const maxWrongGuesses = element.maxWrongGuesses || DEFAULT_MAX_WRONG_GUESSES;

    const myId = userName.replace(/\s+/g, '_');
    const myProgress = players[myId];

    const currentWordIndex = myProgress?.currentWordIndex ?? 0;
    const isFinished = currentWordIndex >= words.length;
    const currentWord = !isFinished ? words[currentWordIndex] : null;

    // Auto-detect language from current word (Cyrillic = Mongolian, Latin = English)
    const detectLanguage = (word: string | null): 'mongolian' | 'english' => {
        if (!word) return 'mongolian';
        // Check if word contains Cyrillic characters
        const cyrillicPattern = /[А-Яа-яЁёӨөҮү]/;
        return cyrillicPattern.test(word) ? 'mongolian' : 'english';
    };

    const language = currentWord ? detectLanguage(currentWord.word) : 'mongolian';

    const [guessStatus, setGuessStatus] = useState<'correct' | 'incorrect' | null>(null);

    // Reset status after animation
    useEffect(() => {
        if (guessStatus) {
            const timer = setTimeout(() => setGuessStatus(null), 500);
            return () => clearTimeout(timer);
        }
    }, [guessStatus]);


    const guessedLetters = useMemo(() => myProgress?.guessedLetters ?? [], [myProgress?.guessedLetters]);
    const wrongGuesses = myProgress?.wrongGuesses ?? 0;

    // Display word with guessed letters
    const displayWord = useMemo(() => {
        if (!currentWord) return '';
        return currentWord.word.split('').map(letter => {
            const upperLetter = letter.toUpperCase();
            return guessedLetters.some(gl => gl.toUpperCase() === upperLetter) ? letter : '_';
        }).join(' ');
    }, [currentWord, guessedLetters]);

    const isWordComplete = useMemo(() => {
        if (!currentWord) return false;
        return currentWord.word.split('').every(letter => {
            const upperLetter = letter.toUpperCase();
            return guessedLetters.some(gl => gl.toUpperCase() === upperLetter);
        });
    }, [currentWord, guessedLetters]);

    // Firestore update
    const updateElement = useCallback(async (updates: Record<string, unknown>) => {
        try {
            const elementRef = doc(db, collectionName, sessionId, 'pages', String(props.currentPage), 'elements', element.id);
            await updateDoc(elementRef, updates);
        } catch (e) {
            console.error('WordScramble update error:', e);
        }
    }, [sessionId, props.currentPage, element.id]);

    // Parse JSON
    const handleParseJSON = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (!parsed.words || !Array.isArray(parsed.words)) {
                toast.error('JSON-д "words" массив байх ёстой');
                return;
            }

            const formattedWords: Word[] = parsed.words.map((w: Word, i: number) => {
                if (!w.word || !w.hint) {
                    throw new Error(`Үг ${i + 1}: word болон hint шаардлагатай`);
                }
                return {
                    word: w.word.trim(),
                    hint: w.hint,
                    category: w.category || ''
                };
            });

            updateElement({
                words: formattedWords,
                gameStatus: 'waiting'
            });
            toast.success(`${formattedWords.length} үг нэмэгдлээ!`);
        } catch (e) {
            console.error(e);
            toast.error('JSON формат буруу байна');
        }
    };

    // Start game
    const handleStartGame = async () => {
        if (words.length === 0) {
            toast.error('Үг нэмнэ үү');
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

        await updateElement({
            gameStatus: 'playing',
            gameStartedAt: serverTimestamp(),
            players: {}
        });
        toast.success('Тоглоом эхэллээ!');
    };

    // Auto join
    useEffect(() => {
        if (gameStatus === 'playing' && !myProgress && !isTeacher) {
            const newPlayer: PlayerProgress = {
                name: userName,
                wordsCompleted: 0,
                totalTime: 0,
                currentWordIndex: 0,
                wrongGuesses: 0,
                guessedLetters: [],
                startedAt: Date.now()
            };
            updateElement({
                [`players.${myId}`]: newPlayer
            });
        }
    }, [gameStatus, myProgress, isTeacher, userName, myId, updateElement]);

    // Handle letter guess
    const handleGuess = async (letter: string) => {
        if (!currentWord || isWordComplete || wrongGuesses >= maxWrongGuesses) return;

        const upperLetter = letter.toUpperCase();
        if (guessedLetters.includes(upperLetter)) {
            toast.warning('Энэ үсгийг аль хэдийн таасан байна');
            return;
        }

        const newGuessedLetters = [...guessedLetters, upperLetter];
        const isCorrect = currentWord.word.toUpperCase().includes(upperLetter);

        setGuessStatus(isCorrect ? 'correct' : 'incorrect');

        const updatedProgress: PlayerProgress = {
            ...myProgress!,
            guessedLetters: newGuessedLetters,
            wrongGuesses: isCorrect ? wrongGuesses : wrongGuesses + 1
        };

        // Check if word is complete
        const wordComplete = currentWord.word.split('').every(l =>
            newGuessedLetters.includes(l.toUpperCase())
        );

        if (wordComplete) {
            updatedProgress.wordsCompleted = (myProgress?.wordsCompleted ?? 0) + 1;
            updatedProgress.currentWordIndex = currentWordIndex + 1;
            updatedProgress.guessedLetters = [];
            updatedProgress.wrongGuesses = 0;
            toast.success('Зөв! Дараагийн үг...');
        } else if (updatedProgress.wrongGuesses >= maxWrongGuesses) {
            // Failed this word, move to next
            updatedProgress.currentWordIndex = currentWordIndex + 1;
            updatedProgress.guessedLetters = [];
            updatedProgress.wrongGuesses = 0;
            toast.error('Алдсан! Дараагийн үг...');
        }

        // Check if all words done
        if (updatedProgress.currentWordIndex >= words.length) {
            updatedProgress.finishedAt = Date.now();
            updatedProgress.totalTime = Math.floor((updatedProgress.finishedAt - updatedProgress.startedAt) / 1000);
        }

        await updateElement({
            [`players.${myId}`]: updatedProgress
        });
    };

    // Leaderboard
    const leaderboard = useMemo(() => {
        return Object.values(players).sort((a, b) => {
            if (b.wordsCompleted !== a.wordsCompleted) {
                return b.wordsCompleted - a.wordsCompleted;
            }
            return a.totalTime - b.totalTime;
        });
    }, [players]);

    // Reset
    const handleReset = async () => {
        await updateElement({
            gameStatus: 'editing',
            words: [],
            players: {},
            gameStartedAt: 0
        });
        setJsonInput('');
    };

    // Keyboard - Both English and Mongolian alphabets
    const englishAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const mongolianAlphabet = 'АБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЩЪЫЬЭЮЯ'.split('');
    const alphabet = language === 'mongolian' ? mongolianAlphabet : englishAlphabet;

    // Editing mode
    if (gameStatus === 'editing' && isTeacher) {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 p-2 sm:p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-sm sm:text-base">Word Scramble - Үг оруулах</span>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm">Алдах эрх:</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={maxWrongGuesses}
                            onChange={(e) => updateElement({ maxWrongGuesses: parseInt(e.target.value) || DEFAULT_MAX_WRONG_GUESSES })}
                            className="bg-white/10 border border-white/20 text-white rounded px-3 py-1 w-20 text-sm"
                        />
                        <span className="text-xs text-white/60">(1-20)</span>
                    </div>
                    <Textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder={`{
  "words": [
    {
      "word": "ХУРДАТГАЛ",  // Кирилл үсэг → Монгол keyboard
      "hint": "Acceleration",
      "category": "Механик"
    },
    {
      "word": "ACCELERATION",  // Латин үсэг → Англи keyboard
      "hint": "Хурдатгал",
      "category": "Mechanics"
    },
    {
      "word": "ХҮЧ",
      "hint": "Force"
    }
  ]
}`}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 font-mono text-xs sm:text-sm"
                    />

                    <Button onClick={handleParseJSON} className="bg-green-500 hover:bg-green-600 w-full sm:w-auto self-end">
                        Бэлтгэх
                    </Button>
                </div>
            </div>
        );
    }

    // Waiting mode
    if (gameStatus === 'waiting') {
        return (
            <div className="flex flex-col w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 p-4 text-white text-center">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        <span className="font-bold">Word Scramble</span>
                    </div>
                    <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                        {words.length} үг
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="text-4xl sm:text-6xl">🔤</div>
                    <div className="text-lg sm:text-xl font-bold">Тоглоом бэлэн боллоо!</div>

                    {isTeacher ? (
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto px-4">
                            <Button onClick={handleStartGame} size="lg" className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                                <Play className="w-5 h-5 mr-2" />
                                Эхлүүлэх
                            </Button>
                            <Button onClick={handleReset} variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Дахин
                            </Button>
                        </div>
                    ) : (
                        <div className="text-white/70 animate-pulse">Багш эхлүүлэхийг хүлээж байна...</div>
                    )}
                </div>
            </div>
        );
    }

    // Playing mode
    if (gameStatus === 'playing') {
        const LeaderboardPanel = () => (
            <div className="h-full bg-black/30 lg:border-l border-white/10 flex flex-col">
                <div className="p-3 border-b border-white/10 font-bold bg-black/20 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    Leaderboard
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {leaderboard.map((player, i) => (
                        <div
                            key={player.name}
                            className={`flex items-center justify-between p-2 rounded ${player.name === userName ? 'bg-white/20 ring-1 ring-white/50' : 'bg-white/5'}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10'}`}>
                                    {i + 1}
                                </span>
                                <span className="truncate text-sm max-w-[100px]">{player.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-bold text-yellow-300">{player.wordsCompleted} үг</div>
                                <div className="text-[10px] text-white/60">{player.totalTime}s</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );

        return (
            <div className="flex flex-col lg:flex-row w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
                {/* Mobile Tab Switcher */}
                <div className="lg:hidden flex border-b border-white/10 bg-black/20 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('game')}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'game' ? 'bg-white/10' : 'text-white/50'}`}
                    >
                        🔤 Game
                    </button>
                    <button
                        onClick={() => setActiveTab('leaderboard')}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'leaderboard' ? 'bg-white/10' : 'text-white/50'}`}
                    >
                        🏆 Leaderboard
                    </button>
                </div>

                {/* Main Game Area */}
                <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'game' ? 'flex' : 'hidden lg:flex'}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-2 py-1 bg-black/20 flex-shrink-0">
                        <span className="font-bold text-sm">Word Scramble</span>
                        <div className="flex items-center gap-2">
                            {!isFinished && !isTeacher && (
                                <div className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                    {myProgress?.wordsCompleted ?? 0} / {words.length}
                                </div>
                            )}
                            {isTeacher && (
                                <Button onClick={handleReset} variant="destructive" size="sm" className="h-7 text-xs px-2">
                                    <RotateCcw className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col items-center justify-start p-1 overflow-y-auto overflow-x-hidden pb-8">
                        {isTeacher ? (
                            <div className="text-center opacity-70 mt-8">
                                <div className="text-4xl mb-4">👀</div>
                                <div className="text-base">Сурагчдын явцыг Leaderboard-оос харна уу</div>
                            </div>
                        ) : isFinished ? (
                            <div className="text-center mt-8">
                                <div className="text-4xl mb-4">🏆</div>
                                <h2 className="text-2xl font-bold mb-2">Баяр хүргэе!</h2>
                                <p className="text-base opacity-80 mb-4">Та бүх үгийг дууслаа</p>
                                <div className="bg-white/10 p-4 rounded-xl inline-block">
                                    <div className="text-sm uppercase opacity-60">Таасан үг</div>
                                    <div className="text-3xl font-bold text-yellow-400">{myProgress?.wordsCompleted ?? 0}</div>
                                    <div className="text-xs opacity-60 mt-1">{myProgress?.totalTime ?? 0} секунд</div>
                                </div>
                            </div>
                        ) : currentWord ? (
                            <div className="w-full max-w-2xl flex flex-col items-center gap-2 pt-2">
                                {/* Hangman */}
                                <HangmanStage wrongGuesses={wrongGuesses} maxWrongGuesses={maxWrongGuesses} />

                                {/* Wrong guesses */}
                                <div className="text-xs text-red-300">
                                    Буруу: {wrongGuesses} / {maxWrongGuesses}
                                </div>

                                {/* Hint */}
                                <div className="text-xs text-yellow-300 flex items-center gap-1">
                                    <Lightbulb className="w-3 h-3" />
                                    {currentWord.hint}
                                </div>

                                {/* Display word - shows underscores and revealed letters */}
                                <div className={`text-3xl font-mono font-bold tracking-wider my-4 px-4 py-3 rounded-lg transition-colors duration-300 ${guessStatus === 'correct' ? 'bg-green-500/50 scale-105' :
                                    guessStatus === 'incorrect' ? 'bg-red-500/50 animate-shake' :
                                        'bg-white/10'
                                    }`}>
                                    {displayWord}
                                </div>

                                {/* Keyboard */}
                                <div className="w-full flex flex-col gap-1 px-2">
                                    <div className="grid grid-cols-7 gap-1">
                                        {alphabet.map(letter => {
                                            const isGuessed = guessedLetters.includes(letter);
                                            const isCorrect = currentWord.word.toUpperCase().includes(letter);

                                            return (
                                                <button
                                                    key={letter}
                                                    onClick={() => handleGuess(letter)}
                                                    disabled={isGuessed}
                                                    className={`
                                                        h-8 text-xs font-bold rounded
                                                        ${isGuessed
                                                            ? isCorrect
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-red-500 text-white'
                                                            : 'bg-white/20 hover:bg-white/30 active:scale-95'
                                                        }
                                                        disabled:opacity-50 disabled:cursor-not-allowed
                                                    `}
                                                >
                                                    {letter}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Space Button */}
                                    <button
                                        onClick={() => handleGuess(' ')}
                                        disabled={guessedLetters.includes(' ')}
                                        className={`
                                            h-8 text-xs font-bold rounded
                                            ${guessedLetters.includes(' ')
                                                ? currentWord.word.includes(' ')
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-red-500 text-white'
                                                : 'bg-white/20 hover:bg-white/30 active:scale-95'
                                            }
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                        `}
                                    >
                                        SPACE
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center mt-8">
                                <div className="animate-spin text-4xl mb-2">⏳</div>
                                <div>Ачаалж байна...</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Leaderboard Sidebar */}
                <div className={`w-full lg:w-64 flex-shrink-0 ${activeTab === 'leaderboard' ? 'flex-1' : 'hidden lg:flex'}`}>
                    <LeaderboardPanel />
                </div>
            </div>
        );
    }

    // Default fallback
    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
            <Lightbulb className="w-12 h-12 text-yellow-400 mb-4" />
            <div className="text-lg font-bold">Word Scramble</div>
            <div className="text-white/60 text-sm">Багш үг оруулж байна...</div>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, RotateCcw, Hand, CheckCircle, AlertOctagon, Lock } from 'lucide-react';
import { MiniCppInterpreter } from '@/lib/cpp/MiniCppInterpreter';
import { toast } from 'sonner';

interface CppLabViewProps {
    sessionId: string;
    userName: string;
    isTeacher: boolean;
    studentIdToView?: string; // If teacher is viewing a student
}

const interpreter = new MiniCppInterpreter();

const LAB_TEMPLATES = {
    'lab1': {
        title: 'Лаб 1: Нас Тооцоологч',
        description: 'Хэрэглэгчээс "turuh_jil"-ийг аваад, насийг нь тооцоолж хэвлэнэ үү.',
        defaultCode: `#include <iostream>
using namespace std;

int main() {
    int turuh_jil;
    cout << "Чи хэдэн онд төрсөн бэ? ";
    // Энд кодоо бичээрэй...
    
}`
    },
    'lab2': {
        title: 'Лаб 2: Нууц Үг',
        description: 'Хэрэглэгчээс "password" аваад, хэрвээ 1234 бол "Зөв!", үгүй бол "Буруу!" гэж хэвлэ.',
        defaultCode: `#include <iostream>
using namespace std;

int main() {
    int password;
    cout << "Нууц үгээ оруул: ";
    cin >> password;
    
    // Энд нөхцөл шалгаарай...
    if (password == 1234) {
        
    }
}`
    },
    'lab3': {
        title: 'Лаб 3: Пуужин',
        description: '10-аас 1 хүртэл тоолоод, төгсгөлд нь "Хөөрлөө!" гэж хэвлэ.',
        defaultCode: `#include <iostream>
using namespace std;

int main() {
    // for давталт ашиглаарай
    for (int i = 10; i >= 1; i--) {
        
    }
    cout << "🚀 Хөөрлөө!";
}`
    }
};

export default function CppLabView({ sessionId, userName, isTeacher, studentIdToView }: CppLabViewProps) {
    // If teacher is viewing, use studentIdToView, else use own name
    const targetStudentId = studentIdToView || userName;
    const isReadOnly = isTeacher && !studentIdToView; // Teacher viewing own "blank" lab or similar? Actually teacher dashboard view handles selection.

    const [activeLab, setActiveLab] = useState<keyof typeof LAB_TEMPLATES>('lab1');
    const [labStatus, setLabStatus] = useState<'open' | 'locked'>('locked');
    const [code, setCode] = useState(LAB_TEMPLATES['lab1'].defaultCode);
    const [output, setOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [inputNeeded, setInputNeeded] = useState(false);
    const [consoleInput, setConsoleInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isHelpRequested, setIsHelpRequested] = useState(false);

    // Sync Lab State (Active Lab & Code)
    useEffect(() => {
        // 1. Listen for global lab settings (active lab, status)
        const unsubSession = onSnapshot(doc(db, 'cpp', sessionId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.activeLab && LAB_TEMPLATES[data.activeLab as keyof typeof LAB_TEMPLATES]) {
                    setActiveLab(data.activeLab);
                }
                setLabStatus(data.labStatus || 'locked');
            }
        });

        // 2. Listen for Target Student's Code
        const unsubStudent = onSnapshot(doc(db, 'cpp', sessionId, 'labs', targetStudentId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();

                // If the code in DB belongs to a different lab, ignore it (or treating it as blank for this new lab)
                // We rely on 'activeLab' from state (which might be slightly stale vs session doc)
                // But generally fine.

                if (isTeacher) {
                    // Teacher sees whatever is there, but maybe warn if mismatch?
                    setCode(data.code || '');
                    setOutput(data.output ? JSON.parse(data.output) : []);
                    setIsHelpRequested(data.helpRequested || false);
                } else {
                    // Student:
                    // If DB has code for CURRENT lab, load it.
                    if (data.labId === activeLab) {
                        // Only update if I'm not typing? 
                        // Actually for MVP, let's load it only if we haven't touched it? 
                        // Or purely rely on local state and only load on mount?
                        // Let's stick to: "Last write wins", but since we debate fast typing vs sync...
                        // Let's just NOT load code from DB if we are the student, to avoid overwriting our own typing with old server echoes.
                        // EXCEPT on initial load or lab switch.
                    }
                }
            } else {
                // No data yet
                if (!isTeacher) {
                    // This block is for when there's no student data at all for the targetStudentId
                    // For a student, this means they haven't saved anything yet for any lab.
                    // The `useEffect` below for `activeLab` change will handle setting default code.
                }
            }
        });

        return () => {
            unsubSession();
            unsubStudent();
        }
    }, [sessionId, targetStudentId, isTeacher, activeLab]);

    // Effect to reset code when Active Lab changes locally
    useEffect(() => {
        if (!isTeacher) {
            // Reset to default code for the new lab
            // We should probably check if we already have saved code for this lab (if we want persistence),
            // but for this simple flow, "New Lab = Fresh Start" is acceptable and safe.
            setCode(LAB_TEMPLATES[activeLab].defaultCode);
            setOutput([]);
            setError(null);
        }
    }, [activeLab, isTeacher]);

    // Push Code Updates (Debounced)
    useEffect(() => {
        if (isTeacher) return;

        const timeout = setTimeout(() => {
            setDoc(doc(db, 'cpp', sessionId, 'labs', userName), {
                code,
                labId: activeLab, // Tag with current Lab ID
                lastUpdated: new Date().toISOString(),
                status: isRunning ? 'running' : (error ? 'error' : 'coding')
            }, { merge: true });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [code, isRunning, error, sessionId, userName, isTeacher, activeLab]);


    const handleRun = async () => {
        setIsRunning(true);
        setError(null);
        setOutput([]);

        // Syntax Check
        const syntax = interpreter.checkSyntax(code);
        if (!syntax.valid) {
            setError(syntax.error || "Алдаа гарлаа");
            setIsRunning(false);
            // Sync Status
            setDoc(doc(db, 'cpp', sessionId, 'labs', userName), {
                status: 'error',
                output: JSON.stringify([syntax.error])
            }, { merge: true });
            return;
        }

        // Logic Check if input needed
        // For simplicity in this non-blocking interpreter, we ask input UP FRONT if code contains 'cin'
        // A real terminal pauses. Here we just simple-prompt.
        const inputVars = code.match(/cin\s*>>\s*(\w+);/g);
        if (inputVars && inputVars.length > 0) {
            setInputNeeded(true);
            return; // Wait for input submission
        }

        // No input needed, Execute
        executeCode([]);
    };

    const handleInputSubmit = () => {
        setInputNeeded(false);
        // primitive single input support for now, split by spaces
        const inputs = consoleInput.split(' ');
        executeCode(inputs);
    };

    const executeCode = async (inputs: string[]) => {
        try {
            const result = interpreter.execute(code, inputs);
            if (result.error) {
                setError(result.error);
                setOutput(prev => [...prev, ...result.output, `⚠ Алдаа: ${result.error}`]);
                // Sync Error
                if (!isTeacher) {
                    setDoc(doc(db, 'cpp', sessionId, 'labs', userName), {
                        status: 'error',
                        output: JSON.stringify(result.output)
                    }, { merge: true });
                }
            } else {
                setOutput(result.output);
                // Sync Success
                if (!isTeacher) {
                    setDoc(doc(db, 'cpp', sessionId, 'labs', userName), {
                        status: 'completed',
                        output: JSON.stringify(result.output)
                    }, { merge: true });
                }
            }
        } catch (e) {
            setError("Системийн алдаа.");
        }
        setIsRunning(false);
    };

    const toggleHand = async () => {
        const newState = !isHelpRequested;
        setIsHelpRequested(newState);
        if (!isTeacher) {
            await setDoc(doc(db, 'cpp', sessionId, 'labs', userName), {
                helpRequested: newState
            }, { merge: true });
            if (newState) toast.success("Багшид мэдэгдлээ!");
        }
    };

    const currentTemplate = LAB_TEMPLATES[activeLab as keyof typeof LAB_TEMPLATES] || LAB_TEMPLATES['lab1'];

    return (
        <div className="flex flex-col h-full bg-stone-900 border-l border-stone-800 text-stone-100 relative">
            {/* Lock Overlay */}
            {!isTeacher && labStatus === 'locked' && (
                <div className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-stone-900 p-8 rounded-2xl border border-stone-800 shadow-2xl max-w-sm">
                        <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-8 h-8 text-stone-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Лаборатори хаалттай байна</h3>
                        <p className="text-stone-400 text-sm leading-relaxed">
                            Багш лабораторыг нээхийг хүлээнэ үү.<br />
                            Одоогоор багшийн зааврыг анхааралтай сонсоорой.
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-stone-950">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold">C++</div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">{currentTemplate.title}</h3>
                        <p className="text-[10px] text-stone-400 mt-0.5">{isTeacher ? `Viewing: ${targetStudentId}` : 'Интерактив Лаборатори'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isTeacher && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`${isHelpRequested ? 'bg-red-500/20 text-red-400' : 'text-stone-400 hover:text-white'}`}
                            onClick={toggleHand}
                        >
                            <Hand className="w-4 h-4 mr-2" />
                            {isHelpRequested ? 'Тусламж хүссэн' : 'Тусламж'}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-500 text-white font-bold"
                        onClick={handleRun}
                        disabled={isRunning || inputNeeded || isTeacher}
                    >
                        {!isRunning ? <Play className="w-4 h-4 mr-2 fill-current" /> : <RotateCcw className="w-4 h-4 mr-2 animate-spin" />}
                        {isRunning ? 'Ажиллаж байна...' : 'Ажиллуулах'}
                    </Button>
                </div>
            </div>

            {/* Content Split */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Editor */}
                <div className="flex-1 flex flex-col min-h-[50%] md:min-h-0 border-b md:border-b-0 md:border-r border-white/10 relative group">
                    <Textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={isTeacher}
                        className="flex-1 font-mono text-sm leading-relaxed p-4 bg-transparent border-none focus-visible:ring-0 text-blue-100 resize-none h-full"
                        spellCheck={false}
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-[10px] text-stone-500 bg-stone-900/50 px-2 py-1 rounded">main.cpp</span>
                    </div>
                </div>

                {/* Console / Output */}
                <div className="w-full md:w-[400px] bg-black/50 flex flex-col">
                    {/* Instructions */}
                    <div className="p-4 border-b border-white/5 bg-white/5">
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Даалгавар</h4>
                        <p className="text-sm text-stone-300 leading-relaxed">
                            {currentTemplate.description}
                        </p>
                    </div>

                    {/* Terminal Output */}
                    <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-1">
                        <div className="text-green-500/50 text-xs mb-2">$ g++ main.cpp -o app && ./app</div>

                        {output.map((line, i) => (
                            <div key={i} className="text-stone-300 whitespace-pre-wrap">{line}</div>
                        ))}

                        {inputNeeded && (
                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-xs text-blue-300 mb-2">Оролтын утга оруулна уу:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={consoleInput}
                                        onChange={(e) => setConsoleInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
                                        className="flex-1 bg-black border border-blue-500/30 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                        autoFocus
                                    />
                                    <Button size="sm" variant="secondary" onClick={handleInputSubmit}>Send</Button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-200">
                                <AlertOctagon className="w-5 h-5 shrink-0 text-red-500" />
                                <div>
                                    <div className="font-bold text-red-500 mb-0.5">Алдаа гарлаа!</div>
                                    <div className="text-sm opacity-90">{error}</div>
                                </div>
                            </div>
                        )}

                        {output.length > 0 && !error && !inputNeeded && (
                            <div className="mt-4 text-green-400 flex items-center gap-2 text-xs opacity-50">
                                <CheckCircle className="w-3 h-3" />
                                Program finished with exit code 0
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

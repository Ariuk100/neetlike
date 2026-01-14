'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import StudentList from '@/components/sant/StudentList';
import WhiteboardCanvas from '@/components/sant/WhiteboardCanvas';
import { Copy, LogOut, Users } from 'lucide-react';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EndSessionDialog from '@/components/sant/EndSessionDialog';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet';

interface WhiteboardData {
    classes: string[];
    teacherAssignments: Record<string, string>;
    students: Record<string, string[]>;
}

function WhiteboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session');
    const role = searchParams.get('role'); // 'teacher' | 'student'
    const collectionName = searchParams.get('collection') || 'whiteboard_sessions';

    const [data, setData] = useState<WhiteboardData | null>(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [isWaiting, setIsWaiting] = useState(false);
    const [assignedTeacherId, setAssignedTeacherId] = useState('');
    const [isAllowedToWrite, setIsAllowedToWrite] = useState(true); // Default to true
    const [currentPage, setCurrentPage] = useState(0);   // NEW: Multi-page
    const [totalPages, setTotalPages] = useState(1);     // NEW: Multi-page
    const [endDialogOpen, setEndDialogOpen] = useState(false);
    const [endingLoading, setEndingLoading] = useState(false);
    const [isStudentListOpen, setIsStudentListOpen] = useState(false);

    // Fetch initial data
    useEffect(() => {
        fetch('/api/sant/whiteboard/data')
            .then(res => res.json())
            .then(setData)
            .catch(() => toast.error('Мэдээлэл татаж чадсангүй'));
    }, []);

    const handleJoinClass = () => {
        if (!data || !selectedClass || !selectedStudent) return;

        const teacherCode = data.teacherAssignments[selectedClass];
        if (!teacherCode) {
            toast.error('Энэ ангид багш хуваарилагдаагүй байна');
            return;
        }

        setAssignedTeacherId(teacherCode);
        setIsWaiting(true);
    };

    // Wait for teacher session
    useEffect(() => {
        if (!isWaiting || !assignedTeacherId) return;

        // Listen to active session for this teacher in the unified collection
        const unsub = onSnapshot(doc(db, collectionName, assignedTeacherId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Teacher has started a session (isActive check)
                if (data.isActive) {
                    // We use the teacher code itself as the session ID now
                    const params = new URLSearchParams();
                    params.set('session', assignedTeacherId);
                    params.set('role', 'student');
                    params.set('name', selectedStudent);
                    params.set('class', selectedClass);

                    router.push(`/sant/whiteboard?${params.toString()}`);
                }
            }
            // If doc doesn't exist or not active, we keep waiting
        });

        return () => unsub();
    }, [isWaiting, assignedTeacherId, selectedStudent, selectedClass, router]);

    // Logic to register student in the DB after joining
    useEffect(() => {
        if (role === 'student' && sessionId && searchParams.get('name')) {
            const studentName = searchParams.get('name')!;
            const studentClass = searchParams.get('class') || '';

            // PERSISTENCE: Save session to sessionStorage
            sessionStorage.setItem('sant_session', JSON.stringify({
                sessionId,
                name: studentName,
                class: studentClass
            }));

            // Write to {collectionName}/{sessionId}/students/{studentName}
            const userRef = doc(db, collectionName, sessionId, 'students', studentName);

            // Use setDoc with merge to update presence
            setDoc(userRef, {
                name: studentName,
                class: studentClass,
                joinedAt: new Date().toISOString(),
                status: 'online',
                leftAt: null
            }, { merge: true });
        }
    }, [role, sessionId, searchParams]);

    // Reliable Exit on Tab Close (Beacon API)
    useEffect(() => {
        if (role !== 'student' || !sessionId) return;

        const handleUnload = () => {
            // Retrieve latest credentials from storage or closure
            // We read from sessionStorage to be safe in case state is stale
            let sName = searchParams.get('name');
            if (!sName) {
                try {
                    const stored = sessionStorage.getItem('sant_session');
                    if (stored) sName = JSON.parse(stored).name;
                } catch { }
            }

            if (sessionId && sName) {
                const payload = JSON.stringify({ sessionId, studentName: sName });
                const blob = new Blob([payload], { type: 'application/json' });
                // Use sendBeacon for reliable sending during unload
                navigator.sendBeacon('/api/sant/whiteboard/exit', blob);
            }
        };

        window.addEventListener('beforeunload', handleUnload); // Modern browsers often prefer 'pagehide' for mobile, but beforeunload is standard for desktop exit

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [sessionId, role, searchParams]);

    // Listener for Active Session (Auto-End for Students & Permissions for All)
    useEffect(() => {
        if (!sessionId) return;

        const unsub = onSnapshot(doc(db, 'whiteboard_sessions', sessionId), (doc) => {
            const d = doc.data();

            // Student-specific: If document is deleted or isActive becomes false
            if (role !== 'teacher') {
                if (!doc.exists() || !d?.isActive) {
                    toast.info('Багш хичээлийг дуусгалаа.');
                    setIsWaiting(false);
                    setSelectedClass('');
                    setSelectedStudent('');
                    sessionStorage.removeItem('sant_session'); // Clean up
                    router.push('/sant/whiteboard');
                    return;
                }
            }

            // Common: Update permissions realtime
            if (d && typeof d.isStudentWriteAllowed !== 'undefined') {
                setIsAllowedToWrite(d.isStudentWriteAllowed);
            }

            // NEW: Sync currentPage and totalPages
            if (d && typeof d.currentPage !== 'undefined') {
                setCurrentPage(d.currentPage);
            }
            if (d && typeof d.totalPages !== 'undefined') {
                setTotalPages(d.totalPages);
            }
        });

        return () => unsub();
    }, [sessionId, role, router]);

    const handleStudentExit = async () => {
        let studentName = searchParams.get('name');
        let currentSessionId = sessionId;

        // Fallback: Check sessionStorage if URL params are missing
        if (!studentName || !currentSessionId) {
            try {
                const stored = sessionStorage.getItem('sant_session');
                if (stored) {
                    const s = JSON.parse(stored);
                    console.log('Restored session from storage:', s);
                    if (!studentName) studentName = s.name;
                    if (!currentSessionId) currentSessionId = s.sessionId;
                }
            } catch (e) {
                console.error('Error parsing session storage', e);
            }
        }

        console.log('Attempting exit:', { currentSessionId, role, studentName });

        if (!currentSessionId || !role || role !== 'student') {
            console.warn('Missing session or role');
            setIsWaiting(false);
            router.push('/sant/whiteboard');
            return;
        }

        if (!studentName) {
            console.error('Student name missing from URL params and localStorage');
            toast.error('Сурагчийн нэр олдсонгүй, шууд гарлаа.');
            setIsWaiting(false);
            sessionStorage.removeItem('sant_session'); // Ensure cleanup even on error
            router.push('/sant/whiteboard');
            return;
        }

        toast.info(`Гарч байна... (${studentName})`);
        const userRef = doc(db, 'whiteboard_sessions', currentSessionId, 'students', studentName);
        try {
            // Check if exists first (Debugging step)
            const docSnap = await getDoc(userRef);
            if (!docSnap.exists()) {
                console.error(`Document for ${studentName} does not exist! ID used: ${userRef.id}`);
            }

            await setDoc(userRef, {
                status: 'offline',
                leftAt: new Date().toISOString()
            }, { merge: true });

            console.log('Exit status updated successfully');
        } catch (e) {
            console.error("Error updating exit status", e);
            toast.error('Гарах үед алдаа гарлаа');
        }

        // Cleanup and Redirect
        sessionStorage.removeItem('sant_session');
        setIsWaiting(false);
        setSelectedClass('');
        setSelectedStudent('');
        router.push('/sant/whiteboard');
    };

    const endSession = async (action: 'save' | 'delete') => {
        if (!sessionId) return;
        setEndingLoading(true);

        try {
            if (action === 'delete') {
                // Hard delete
                await fetch('/api/sant/whiteboard/cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });
                toast.success('Хичээл устгагдлаа');
            } else {
                // Save (Archive)
                // Just mark as inactive so students get kicked, but data remains
                await updateDoc(doc(db, 'whiteboard_sessions', sessionId), {
                    isActive: false,
                    archivedAt: new Date().toISOString(),
                    // Optionally ask for a name? For now just save as is.
                });
                toast.success('Хичээл хадгалагдлаа');
            }

            router.push('/sant/whiteboard');
        } catch (e) {
            console.error(e);
            toast.error('Алдаа гарлаа');
        } finally {
            setEndingLoading(false);
            setEndDialogOpen(false);
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/sant/whiteboard?session=${sessionId}&role=student`;
        navigator.clipboard.writeText(url);
        toast.success('Холбоос хуулагдлаа');
    };

    // NEW: Page navigation functions
    const handleAddPage = async () => {
        if (!isTeacher || !sessionId) return;
        const newTotal = totalPages + 1;
        await updateDoc(doc(db, 'whiteboard_sessions', sessionId), {
            totalPages: newTotal,
            currentPage: newTotal - 1  // Navigate to new page
        });
        toast.success(`Хуудас ${newTotal} нэмэгдлээ`);
    };

    const handleNavigatePage = async (delta: number) => {
        if (!isTeacher || !sessionId) return;
        const newPage = Math.max(0, Math.min(totalPages - 1, currentPage + delta));
        if (newPage !== currentPage) {
            await updateDoc(doc(db, 'whiteboard_sessions', sessionId), {
                currentPage: newPage
            });
        }
    };

    const handleDeletePage = async () => {
        if (!isTeacher || !sessionId) return;
        if (totalPages <= 1) {
            toast.error('Сүүлийн хуудсыг устгах боломжгүй');
            return;
        }

        const toastId = toast.loading('Хуудсыг устгаж байна...');
        try {
            const res = await fetch('/api/sant/whiteboard/page/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, pageIndex: currentPage }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Хуудас устгагдлаа', { id: toastId });
                // The totalPages will update via listener.
                // If we were on the last page, we should navigate back.
                // The listener for totalPages handles clamping?
                // Let's force clamp if needed.
                if (currentPage >= data.newTotal) {
                    await updateDoc(doc(db, 'whiteboard_sessions', sessionId), {
                        currentPage: Math.max(0, data.newTotal - 1)
                    });
                }
            } else {
                toast.error(data.error || 'Алдаа гарлаа', { id: toastId });
            }
        } catch (e) {
            console.error(e);
            toast.error('Холболтын алдаа', { id: toastId });
        }
    };

    // Login Screen
    if (!sessionId || !role) {
        // Waiting Screen
        if (isWaiting) {
            return (
                <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                    <Card className="w-full max-w-md text-center">
                        <CardHeader>
                            <div className="mx-auto w-16 h-16 mb-4 animate-pulse">
                                <Image src="/sant-logo.png" width={64} height={64} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <CardTitle className="text-xl">Багшийг хүлээж байна...</CardTitle>
                            <CardDescription>
                                Анги: {selectedClass} | Сурагч: {selectedStudent}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Багш хичээлээ эхлүүлэхэд та автоматаар холбогдох болно.
                            </p>
                            <Button variant="outline" onClick={() => setIsWaiting(false)}>
                                Буцах
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            );
        }

        return (
            <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 mb-4">
                            <Image src="/sant-watermark-white.png" width={64} height={64} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <CardTitle className="text-2xl">Sant Whiteboard</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="text-center space-y-2">
                                <h3 className="font-medium">Сурагч нэвтрэх</h3>
                                <p className="text-xs text-muted-foreground">
                                    Анги болон нэрээ сонгоод нэвтэрнэ үү.
                                </p>
                            </div>

                            {!data ? (
                                <p className="text-center text-sm">Ачаалж байна...</p>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Анги</label>
                                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Анги сонгох" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px] overflow-y-auto">
                                                {data.classes.map(c => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium">Сурагч</label>
                                        <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Нэр сонгох" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px] overflow-y-auto">
                                                {selectedClass && data.students[selectedClass]?.map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button className="w-full" onClick={handleJoinClass} disabled={!selectedClass || !selectedStudent}>
                                        Хичээлд орох
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        );
    }

    // Whiteboard Screen
    const isTeacher = role === 'teacher';

    return (
        <main className="flex flex-col h-screen bg-stone-100 overflow-hidden">
            {/* Header */}
            <header className="flex-none h-14 bg-white border-b flex items-center justify-between px-3 sm:px-4 z-10">
                <div className="flex items-center gap-2">
                    <Image src="/sant-watermark-white.png" width={28} height={28} className="object-contain sm:w-8 sm:h-8" alt="Logo" />
                    <span className="font-semibold text-stone-700 hidden sm:inline">Сант</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-xs font-mono text-stone-500 border border-stone-200 truncate max-w-[80px] sm:max-w-none">
                        {sessionId}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile Student List Toggle */}
                    {isTeacher && (
                        <div className="lg:hidden">
                            <Sheet open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Users className="w-5 h-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="p-0 w-80">
                                    <StudentList sessionId={sessionId} collectionName={collectionName} />
                                </SheetContent>
                            </Sheet>
                        </div>
                    )}

                    {isTeacher && (
                        <Button variant="outline" size="sm" onClick={copyLink} className="hidden sm:flex">
                            <Copy className="w-4 h-4 mr-2" />
                            Link хуулах
                        </Button>
                    )}
                    {isTeacher ? (
                        <>
                            <Button variant="destructive" size="sm" onClick={() => setEndDialogOpen(true)}>
                                <LogOut className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">Дуусгах</span>
                            </Button>
                            <EndSessionDialog
                                open={endDialogOpen}
                                onOpenChange={setEndDialogOpen}
                                onEnd={endSession}
                                loading={endingLoading}
                            />
                        </>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={handleStudentExit}>
                            Гарах
                        </Button>
                    )}
                </div>
            </header>

            {/* Canvas Area - Flex Row Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Whiteboard Container - takes remaining space after sidebar */}
                <div className="flex-1 flex items-center justify-center bg-stone-100 overflow-hidden relative">
                    <WhiteboardCanvas
                        sessionId={sessionId}
                        isTeacher={isTeacher}
                        isAllowedToWrite={isAllowedToWrite}
                        userName={isTeacher ? 'Багш' : (searchParams.get('name') || 'Guest')}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onAddPage={handleAddPage}
                        onDeletePage={handleDeletePage}
                        onNavigatePage={handleNavigatePage}
                        collectionName={collectionName}
                    />
                </div>

                {/* Student List Sidebar - Desktop Only */}
                {isTeacher && (
                    <div className="hidden lg:block w-80 border-l bg-white h-full flex-shrink-0">
                        <StudentList sessionId={sessionId} collectionName={collectionName} />
                    </div>
                )}
            </div>
        </main>
    );
}

export default function WhiteboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WhiteboardContent />
        </Suspense>
    );
}

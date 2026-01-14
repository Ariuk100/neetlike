'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Users, Code, Trash2, Power, Menu, ChevronLeft, ChevronRight, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import WhiteboardCanvas from './WhiteboardCanvas';
import CppLessonView from './CppLessonView';
import CppLabView from './CppLabView';
import TeacherLabDashboard from './TeacherLabDashboard';

interface Participant {
    name: string;
    status: 'online' | 'offline';
    joinedAt: string;
    role?: 'lead' | 'participant';
}

interface CppSessionProps {
    sessionId: string;
    role: 'lead' | 'participant';
    userName: string;
    currentPage: number;
    totalPages: number;
    onAddPage: () => void;
    onDeletePage: () => void;
    onNavigatePage: (delta: number) => void;
}

interface SessionData {
    isActive?: boolean;
    updatedAt?: string;
    updatedBy?: string;
    viewMode?: 'whiteboard' | 'lesson' | 'lab';
    lessonSlide?: number;
    activeLab?: string;
    labStatus?: 'open' | 'locked';
}

export default function CppSession({
    sessionId,
    role,
    userName,
    currentPage,
    totalPages,
    onAddPage,
    onDeletePage,
    onNavigatePage
}: CppSessionProps) {
    const isLead = role === 'lead';
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

    // Sync Participants & Presence
    useEffect(() => {
        // Set own status to online
        const userDoc = doc(db, 'cpp', sessionId, 'participants', userName);
        setDoc(userDoc, {
            name: userName,
            status: 'online',
            role: role,
            lastSeen: new Date().toISOString()
        }, { merge: true });

        // Cleanup: set status to offline when leaving
        const handleOffline = () => {
            updateDoc(userDoc, { status: 'offline', lastSeen: new Date().toISOString() });
        };

        window.addEventListener('beforeunload', handleOffline);

        const q = query(collection(db, 'cpp', sessionId, 'participants'));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: Participant[] = [];
            snapshot.forEach((doc) => {
                list.push(doc.data() as Participant);
            });
            setParticipants(list.sort((a, b) => {
                if (a.role === 'lead') return -1;
                if (b.role === 'lead') return 1;
                return a.name.localeCompare(b.name);
            }));
        });

        return () => {
            handleOffline();
            window.removeEventListener('beforeunload', handleOffline);
            unsub();
        };
    }, [sessionId, userName, role]);

    // Sync Session State
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'cpp', sessionId), (doc) => {
            if (doc.exists()) {
                setSessionData(doc.data());
            }
        });
        return () => unsub();
    }, [sessionId]);

    const handleSetViewMode = async (mode: 'whiteboard' | 'lesson' | 'lab') => {
        if (!isLead) return;
        await setDoc(doc(db, 'cpp', sessionId), {
            viewMode: mode,
            updatedBy: userName
        }, { merge: true });
    };

    const [viewingStudentId, setViewingStudentId] = useState<string | undefined>(undefined);

    const handleSlideChange = async (index: number) => {
        if (!isLead) return;
        await setDoc(doc(db, 'cpp', sessionId), {
            lessonSlide: index,
            updatedBy: userName
        }, { merge: true });
    };

    const handleToggleSession = async () => {
        const isActive = sessionData?.isActive;
        await setDoc(doc(db, 'cpp', sessionId), {
            isActive: !isActive,
            updatedAt: new Date().toISOString(),
            updatedBy: userName
        }, { merge: true });
        toast.success(isActive ? "Хичээл зогсоолоо" : "Хичээл эхэллээ");
    };

    const handleClearParticipantsClick = () => {
        setIsClearDialogOpen(true);
    };

    const handleConfirmClearParticipants = async () => {
        setIsClearDialogOpen(false);
        const toastId = toast.loading("Цэвэрлэж байна...");

        try {
            const batch = writeBatch(db);
            const participantsRef = collection(db, 'cpp', sessionId, 'participants');
            const snapshot = await getDocs(participantsRef);

            snapshot.docs.forEach((d) => {
                // Don't delete the lead teacher themselves if they are in the list
                if (d.id !== userName) {
                    batch.delete(d.ref);
                }
            });

            await batch.commit();
            toast.success("Жагсаалт цэвэрлэгдлээ", { id: toastId });
        } catch (error) {
            console.error("Error clearing participants:", error);
            toast.error("Алдаа гарлаа", { id: toastId });
        }
    };

    return (
        <div className="flex h-full w-full bg-white">
            {/* Sidebar - Participant List (Desktop) */}
            <aside className={`hidden md:flex flex-col border-r border-stone-200 bg-stone-50 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'}`}>
                <div className="p-4 border-b border-stone-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-stone-600 font-medium">
                        <Users className="w-4 h-4" />
                        <span>Оролцогчид</span>
                    </div>
                    <span className="bg-blue-600/10 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {participants.filter(p => p.status === 'online').length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-w-[256px]">
                    {participants.map((p) => (
                        <div
                            key={p.name}
                            className={`flex items-center justify-between p-2 rounded-lg text-sm ${p.name === userName ? 'bg-white shadow-sm ring-1 ring-stone-200' : 'hover:bg-stone-100/50'}`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-stone-300'}`} />
                                <span className={`truncate ${p.status === 'online' ? 'text-stone-800' : 'text-stone-400'} flex items-center gap-1`}>
                                    {p.name}
                                    {p.role === 'lead' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded uppercase font-bold tracking-tighter shrink-0 border border-amber-200">Lead</span>}
                                </span>
                            </div>
                            {p.name === userName && <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter shrink-0 ml-1">Та</span>}
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div className="text-center py-10 text-stone-400 text-xs italic">
                            Одоогоор хүн байхгүй байна
                        </div>
                    )}
                </div>

                {isLead && (
                    <div className="p-3 border-t border-stone-200 space-y-2 shrink-0 min-w-[256px]">
                        <Button
                            className={`w-full justify-start h-9 ${sessionData?.isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                            onClick={handleToggleSession}
                        >
                            <Power className="w-4 h-4 mr-2" />
                            {sessionData?.isActive ? 'Хичээл зогсоох' : 'Хичээл эхлүүлэх'}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-8 text-stone-400 hover:text-red-500 hover:bg-red-50 text-xs"
                            onClick={handleClearParticipantsClick}
                        >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Жагсаалт цэвэрлэх
                        </Button>
                    </div>
                )}
            </aside>

            <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Жагсаалт цэвэрлэх</DialogTitle>
                        <DialogDescription>
                            Та бүх оролцогчдыг жагсаалтаас хасахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>Болих</Button>
                        <Button variant="destructive" onClick={handleConfirmClearParticipants}>Цэвэрлэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative">
                {/* Session Overlay if inactive */}
                {
                    !sessionData?.isActive && !isLead && (
                        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                            <div className="max-w-sm space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                    <Code className="w-10 h-10 text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-stone-900">Хичээл эхлээгүй байна</h2>
                                <p className="text-stone-500 text-sm">
                                    Удирдах багш хичээлийг эхлүүлэх хүртэл түр хүлээнэ үү.
                                </p>
                            </div>
                        </div>
                    )
                }

                {/* Toolbar */}
                <div className="h-12 border-b border-stone-200 flex items-center px-4 bg-stone-50/50 gap-4">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-stone-500 hover:text-stone-900 hidden md:flex"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>

                        {/* Mobile Menu Trigger */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900 md:hidden">
                                    <Menu className="w-4 h-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0 bg-stone-50 border-r border-stone-200">
                                <div className="flex flex-col h-full">
                                    <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-stone-600 font-medium">
                                            <Users className="w-4 h-4" />
                                            <span>Оролцогчид</span>
                                        </div>
                                        <span className="bg-blue-600/10 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                            {participants.filter(p => p.status === 'online').length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {participants.map((p) => (
                                            <div
                                                key={p.name}
                                                className={`flex items-center justify-between p-2 rounded-lg text-sm ${p.name === userName ? 'bg-white shadow-sm ring-1 ring-stone-200' : 'hover:bg-stone-100/50'}`}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'online' ? 'bg-green-500' : 'bg-stone-300'}`} />
                                                    <span className={`truncate ${p.status === 'online' ? 'text-stone-800' : 'text-stone-400'} flex items-center gap-1`}>
                                                        {p.name}
                                                        {p.role === 'lead' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded uppercase font-bold border border-amber-200">Lead</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {isLead && (
                                        <div className="p-3 border-t border-stone-200 space-y-2">
                                            <Button
                                                className={`w-full justify-start h-9 ${sessionData?.isActive ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                                                onClick={handleToggleSession}
                                            >
                                                <Power className="w-4 h-4 mr-2" />
                                                {sessionData?.isActive ? 'Хичээл зогсоох' : 'Хичээл эхлүүлэх'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* Page Navigation (Lead Teacher only) */}
                        {isLead && (
                            <div className="flex items-center gap-1 ml-2 border-r pr-2 mr-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigatePage(-1)} disabled={currentPage === 0}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-xs font-medium min-w-[3rem] text-center">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNavigatePage(1)} disabled={currentPage >= totalPages - 1}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={onAddPage}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                                {totalPages > 1 && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDeletePage}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        )}

                        {!isLead && (
                            <span className="text-xs font-medium text-stone-500 ml-4 px-2 py-1 bg-stone-100 rounded">
                                Хуудас {currentPage + 1}
                            </span>
                        )}

                        {isLead ? (
                            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 ml-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetViewMode('whiteboard')}
                                    className={cn("h-7 px-2 text-xs", (!sessionData?.viewMode || sessionData?.viewMode === 'whiteboard') ? "bg-white text-blue-600 shadow-sm" : "text-stone-500 hover:text-stone-900")}
                                >
                                    <Code className="w-3.5 h-3.5 mr-1.5" />
                                    Board
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetViewMode('lesson')}
                                    className={cn("h-7 px-2 text-xs", sessionData?.viewMode === 'lesson' ? "bg-white text-blue-600 shadow-sm" : "text-stone-500 hover:text-stone-900")}
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                    Lesson
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetViewMode('lab')}
                                    className={cn("h-7 px-2 text-xs", sessionData?.viewMode === 'lab' ? "bg-white text-blue-600 shadow-sm" : "text-stone-500 hover:text-stone-900")}
                                >
                                    <Code className="w-3.5 h-3.5 mr-1.5" />
                                    Lab
                                </Button>
                            </div>
                        ) : (
                            <div className="ml-2 flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                                {sessionData?.viewMode === 'lesson' ? <BookOpen className="w-3.5 h-3.5" /> :
                                    sessionData?.viewMode === 'lab' ? <Code className="w-3.5 h-3.5" /> :
                                        <Plus className="w-3.5 h-3.5" />}
                                {sessionData?.viewMode === 'lesson' ? 'LESSON' : sessionData?.viewMode === 'lab' ? 'LAB' : 'BOARD'}
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-stone-200 mx-2" />

                    <div className="flex-1 text-xs text-stone-400 font-mono truncate">
                        {isLead ? "Lead Teacher System" : `Connected: ${userName}`}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {sessionData?.viewMode === 'lesson' ? (
                        <CppLessonView
                            slideIndex={sessionData?.lessonSlide || 0}
                            onSlideChange={handleSlideChange}
                            isTeacher={isLead}
                        />
                    ) : sessionData?.viewMode === 'lab' ? (
                        isLead && !viewingStudentId ? (
                            <TeacherLabDashboard
                                sessionId={sessionId}
                                onViewStudent={(id) => setViewingStudentId(id)}
                            />
                        ) : (
                            <div className="h-full relative">
                                {isLead && viewingStudentId && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="absolute top-2 right-4 z-50 shadow-lg"
                                        onClick={() => setViewingStudentId(undefined)}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-2" />
                                        Буцах (Dashboard)
                                    </Button>
                                )}
                                <CppLabView
                                    sessionId={sessionId}
                                    userName={userName}
                                    isTeacher={isLead}
                                    studentIdToView={viewingStudentId}
                                />
                            </div>
                        )
                    ) : (
                        <WhiteboardCanvas
                            sessionId={sessionId}
                            isTeacher={isLead}
                            isAllowedToWrite={isLead}
                            userName={userName}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onAddPage={onAddPage}
                            onDeletePage={onDeletePage}
                            onNavigatePage={onNavigatePage}
                            collectionName="cpp"
                        />
                    )}
                </div>
            </main >
        </div >
    );
}

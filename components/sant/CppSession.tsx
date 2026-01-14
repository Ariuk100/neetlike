'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Users, Code, Trash2, Power, Menu, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import WhiteboardCanvas from './WhiteboardCanvas';

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

    const handleToggleSession = async () => {
        const isActive = sessionData?.isActive;
        await setDoc(doc(db, 'cpp', sessionId), {
            isActive: !isActive,
            updatedAt: new Date().toISOString(),
            updatedBy: userName
        }, { merge: true });
        toast.success(isActive ? "Хичээл зогсоолоо" : "Хичээл эхэллээ");
    };

    const handleClearParticipants = async () => {
        if (!confirm("Бүх оролцогчдын жагсаалтыг цэвэрлэх үү?")) return;
        // In a real app, you'd batch delete. Here we just show the intent.
        toast.info("Цэвэрлэж байна...");
        // Logic to delete subcollection docs...
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
                            onClick={handleClearParticipants}
                        >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Жагсаалт цэвэрлэх
                        </Button>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative">
                {/* Session Overlay if inactive */}
                {!sessionData?.isActive && !isLead && (
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
                )}

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

                        <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 ml-2">
                            <Code className="w-4 h-4 mr-2" />
                            Whiteboard
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-stone-200 mx-2" />

                    <div className="flex-1 text-xs text-stone-400 font-mono truncate">
                        {isLead ? "Lead Teacher System" : `Connected: ${userName}`}
                    </div>
                </div>

                {/* Whiteboard Canvas Area */}
                <div className="flex-1 overflow-hidden relative">
                    <WhiteboardCanvas
                        sessionId={sessionId}
                        isTeacher={isLead}
                        isAllowedToWrite={isLead} // Only lead can draw in CPP for now, or we can add permission.
                        userName={userName}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onAddPage={onAddPage}
                        onDeletePage={onDeletePage}
                        onNavigatePage={onNavigatePage}
                        collectionName="cpp"
                    />
                </div>
            </main>
        </div>
    );
}

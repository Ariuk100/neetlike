'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LogOut, Users, Settings } from 'lucide-react';
import CppSession from '../../../components/sant/CppSession';

function CppContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get('role'); // 'lead' | 'participant'
    const userName = searchParams.get('name');
    const sessionId = "cpp_main_session"; // Unified session for now

    const [teachers, setTeachers] = useState<string[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [sessionActive, setSessionActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    // Fetch teachers list
    useEffect(() => {
        fetch('/api/sant/cpp/teachers')
            .then(res => res.json())
            .then(data => {
                setTeachers(data.teachers);
                setIsLoading(false);
            })
            .catch(() => {
                toast.error('Багш нарын мэдээлэл татаж чадсангүй');
                setIsLoading(false);
            });
    }, []);

    // Listen to session status
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'cpp', sessionId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSessionActive(data?.isActive);
                if (typeof data?.currentPage !== 'undefined') setCurrentPage(data.currentPage);
                if (typeof data?.totalPages !== 'undefined') setTotalPages(data.totalPages);
            } else {
                setSessionActive(false);
            }
        });
        return () => unsub();
    }, [sessionId]);

    const handleAddPage = async () => {
        if (role !== 'lead') return;
        const newTotal = totalPages + 1;
        await updateDoc(doc(db, 'cpp', sessionId), {
            totalPages: newTotal,
            currentPage: newTotal - 1
        });
        toast.success(`Хуудас ${newTotal} нэмэгдлээ`);
    };

    const handleNavigatePage = async (delta: number) => {
        if (role !== 'lead') return;
        const newPage = Math.max(0, Math.min(totalPages - 1, currentPage + delta));
        if (newPage !== currentPage) {
            await updateDoc(doc(db, 'cpp', sessionId), {
                currentPage: newPage
            });
        }
    };

    const handleDeletePage = async () => {
        if (role !== 'lead' || totalPages <= 1) return;

        const toastId = toast.loading('Хуудсыг устгаж байна...');
        try {
            const res = await fetch('/api/sant/whiteboard/page/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    pageIndex: currentPage,
                    collectionName: 'cpp' // We need to support custom collection in the API
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Хуудас устгагдлаа', { id: toastId });
                if (currentPage >= data.newTotal) {
                    await updateDoc(doc(db, 'cpp', sessionId), {
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

    const handleJoin = async () => {
        if (!selectedTeacher) return;

        const params = new URLSearchParams();
        params.set('role', 'participant');
        params.set('name', selectedTeacher);
        router.push(`/sant/cpp?${params.toString()}`);

        // Register participant
        await setDoc(doc(db, 'cpp', sessionId, 'participants', selectedTeacher), {
            name: selectedTeacher,
            joinedAt: new Date().toISOString(),
            status: 'online'
        }, { merge: true });
    };

    const handleLeadLoginClick = () => {
        setIsLoginDialogOpen(true);
        setPasswordInput('');
    };

    const handleConfirmLeadLogin = async () => {
        if (passwordInput === "123") {
            setIsLoginDialogOpen(false);
            const params = new URLSearchParams();
            params.set('role', 'lead');
            params.set('name', "Lead Teacher");
            router.push(`/sant/cpp?${params.toString()}`);

            // Register lead teacher
            await setDoc(doc(db, 'cpp', sessionId, 'participants', 'Lead Teacher'), {
                name: "Lead Teacher",
                role: 'lead',
                joinedAt: new Date().toISOString(),
                status: 'online'
            }, { merge: true });
        } else {
            toast.error("Нууц үг буруу байна");
        }
    };

    const handleExit = async () => {
        if (role === 'participant' && userName) {
            await updateDoc(doc(db, 'cpp', sessionId, 'participants', userName), {
                status: 'offline',
                leftAt: new Date().toISOString()
            });
        }
        router.push('/sant/cpp');
    };

    // --- LEADERBOARD & SESSION UI ---
    if (role && (role === 'participant' || role === 'lead')) {
        return (
            <main className="flex flex-col h-screen bg-white text-stone-900 overflow-hidden">
                <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-4 z-10 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <div className="w-8 h-8 relative shrink-0">
                            <Image src="/sant-logo.png" fill className="object-contain" alt="Logo" />
                        </div>
                        <span className="font-bold text-stone-800 hidden xs:block truncate">CPP Training</span>
                        <div className="px-2 py-0.5 rounded bg-stone-100 text-[10px] sm:text-xs font-mono text-stone-500 border border-stone-200 truncate max-w-[120px] sm:max-w-none">
                            {role === 'lead' ? 'Lead' : userName}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {role === 'lead' && (
                            <Button variant="outline" size="sm" className="hidden sm:flex bg-white border-stone-200 text-stone-600 hover:bg-stone-50 h-8">
                                <Settings className="w-4 h-4 mr-2" />
                                Тохиргоо
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleExit} className="text-stone-500 hover:text-stone-900 hover:bg-stone-50 h-8 px-2 sm:px-3">
                            <LogOut className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Гарах</span>
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden">
                    <CppSession
                        sessionId={sessionId}
                        role={role as 'lead' | 'participant'}
                        userName={userName || 'Guest'}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onAddPage={handleAddPage}
                        onDeletePage={handleDeletePage}
                        onNavigatePage={handleNavigatePage}
                    />
                </div>
            </main>
        );
    }

    // --- LOGIN SCREEN ---
    return (
        <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full" />
            </div>

            <Card className="w-full max-w-md bg-white border-stone-200 shadow-xl relative overflow-hidden">
                <CardHeader className="text-center p-6 sm:p-8">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 mb-4 p-2 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
                        <Image src="/sant-logo.png" width={64} height={64} alt="Sant Logo" className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-stone-900">
                        C++ Training Session
                    </CardTitle>
                    <CardDescription className="text-stone-500 text-sm">
                        Сургалтад орохын тулд нэрээ сонгоно уу
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6 sm:p-8 pt-0">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-700">Багшийн нэр</label>
                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                            <SelectTrigger className="bg-white border-stone-200 text-stone-900 h-12">
                                <SelectValue placeholder={isLoading ? "Ачаалж байна..." : "Дарж нэрээ сонгох"} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-stone-200 text-stone-900 max-h-[300px]">
                                {teachers.map(t => (
                                    <SelectItem key={t} value={t} className="focus:bg-stone-100 focus:text-stone-900">
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                        onClick={handleJoin}
                        disabled={!selectedTeacher || isLoading}
                    >
                        Хичээлд нэвтрэх
                    </Button>

                    <div className="pt-4 border-t border-stone-100 text-center">
                        <Button
                            variant="ghost"
                            className="text-stone-400 hover:text-stone-600 hover:bg-stone-50 text-xs w-full sm:w-auto"
                            onClick={handleLeadLoginClick}
                        >
                            Удирдах багшаар нэвтрэх
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удирдах багшаар нэвтрэх</DialogTitle>
                        <DialogDescription>
                            Багшийн нууц үгээ оруулна үү (123)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            type="password"
                            placeholder="Нууц үг"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmLeadLogin()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLoginDialogOpen(false)}>Болих</Button>
                        <Button onClick={handleConfirmLeadLogin}>Нэвтрэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}

export default function CppPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500">Уншиж байна...</div>}>
            <CppContent />
        </Suspense>
    );
}

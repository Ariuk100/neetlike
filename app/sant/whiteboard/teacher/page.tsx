'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeacherLoginPage() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!code) return toast.error('Нууц код оруулна уу');
        setLoading(true);

        try {
            const res = await fetch('/api/sant/whiteboard/auth/temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(`Тавтай морил, ${data.teacher.name}!`);

                // Use Teacher Code as the Session ID for simplicity and consistency
                const sessionKey = data.teacher.code;

                // Reset/Start session in 'whiteboard_sessions'
                // We set 'isActive' to true so students know it's started.
                await setDoc(doc(db, 'whiteboard_sessions', sessionKey), {
                    isActive: true,
                    startedAt: new Date().toISOString(),
                    teacherName: data.teacher.name
                }, { merge: true });

                // Optionally clear old paths via API (not doing it here to avoid double waiting,
                // the cleanup button can be used or we can do a forced cleanup here if needed).
                // Let's rely on the cleanup button or explicit start.
                // Actually best to clear previous data on new start to avoid confusion.
                try {
                    await fetch('/api/sant/whiteboard/cleanup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: sessionKey }),
                    });
                } catch (cleanupError) {
                    console.error("Failed to cleanup whiteboard data:", cleanupError);
                    // Optionally toast an error here, but it might not be critical enough to block login
                }

                // Set active again after cleanup (in case cleanup deletes the doc)
                await setDoc(doc(db, 'whiteboard_sessions', sessionKey), {
                    isActive: true,
                    startedAt: new Date().toISOString(),
                    teacherName: data.teacher.name,
                    currentPage: 0,   // NEW: Multi-page support
                    totalPages: 1     // NEW: Start with 1 page
                }, { merge: true });

                router.push(`/sant/whiteboard?session=${sessionKey}&role=teacher`);
            } else {
                toast.error(data.message || 'Нэвтрэх бүтэлгүйтлээ');
            }
        } catch {
            toast.error('Сервертэй холбогдож чадсангүй');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 mb-4">
                        <Image src="/sant-logo.png" alt="Logo" width={64} height={64} className="w-full h-full object-contain" />
                    </div>
                    <CardTitle className="text-2xl">Багшийн нэвтрэх хэсэг</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        type="password"
                        placeholder="Нууц код (Жишээ: TEACH01)"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    <Button className="w-full" onClick={handleLogin} disabled={loading}>
                        {loading ? 'Уншиж байна...' : 'Нэвтрэх (Хичээл эхлүүлэх)'}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

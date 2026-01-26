"use client";

import { useEffect, useState } from "react";
import WhiteboardCanvas from "@/features/whiteboard/core/WhiteboardCanvas";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function StudentDashboard() {
    const { user } = useAuth();
    // In a real app, this might be dynamic or based on a class code. 
    // For this demo, let's assume students join the same teacher session or a specific session.
    // If the requirement is "teacher starts lesson", there must be a known session ID.
    // Assuming a single session for demo or based on teacher's ID.
    // For now, let's look for the recent active session or a hardcoded one for testing. 
    // Or maybe the user enters a code. 
    // Since I don't see a class code system yet, I'll default to the 'demo_session' or similar used by teacher.
    // Wait, teacher uses `session_${user.uid}`. 
    // If I am a student, I need to know the teacher's UID. 
    // Let's assume for now for the demo purpose, we use a fixed session ID or prompts.
    // BUT the prompt says "teacher starts lesson... student sees". 
    // Let's use "demo_session" as a fallback if no specific teacher is linked, 
    // OR easier: list active sessions? 
    // Let's stick to "demo_session" for simplicity unless I see other logic. 
    // Actually, looking at previous logs, `sessionId` was `session_${user.uid}`.
    // If I'm a student, I can't guess teacher's UID.
    // Let's make the teacher use "demo_session" if no user, OR create a public "classroom". 
    // PROPOSAL: Student enters a session ID. 
    // OR simpler: Just listing this functionality.

    // For this specific request: "teacher saves... loads... starts lesson".
    // I will implement a basic "Enter Session ID" input if not present, 
    // or just default to check "demo_session" if user is null.

    // Let's use a URL param for sessionId ?session=... or just an input.
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);

    // Generate a unique-ish name for guests to prevent leaderboard collisions
    const [displayName] = useState(() => {
        if (user?.displayName) return user.displayName;
        return `Student #${Math.floor(Math.random() * 900) + 100}`;
    });

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // If we want to test easily, let's allow entering a session ID.
    const [inputSessionId, setInputSessionId] = useState("");

    useEffect(() => {
        if (!sessionId) return;

        const sessionRef = doc(db, 'whiteboard_sessions', sessionId);
        const unsub = onSnapshot(sessionRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setIsActive(data.isActive || false);
                setTotalPages(data.totalPages || 1);
                setCurrentPage(data.currentPage || 0);
            } else {
                setIsActive(false);
            }
        });

        return () => unsub();
    }, [sessionId]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputSessionId.trim()) {
            setSessionId(inputSessionId.trim());
        }
    };

    if (!sessionId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-4 text-center">Хичээлд нэгдэх</h1>
                    <form onSubmit={handleJoin} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Session ID (Ex: demo_session)"
                            value={inputSessionId}
                            onChange={(e) => setInputSessionId(e.target.value)}
                            className="border p-2 rounded"
                        />
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">
                            Нэгдэх
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!isActive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <h1 className="text-2xl font-bold">Багш хичээлийг эхлүүлэхийг хүлээж байна...</h1>
                </div>
            </div>
        );
    }



    return (
        <div className="w-full h-screen overflow-hidden bg-gray-200 flex flex-col items-center justify-center">
            <div
                className="relative bg-white shadow-2xl"
                style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '1600px',
                    maxHeight: '100vh',
                }}
            >
                <WhiteboardCanvas
                    sessionId={sessionId}
                    isTeacher={false}
                    isAllowedToWrite={true}
                    userName={displayName}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    collectionName="whiteboard_sessions"
                    onNavigatePage={() => { }}
                    tool={'cursor'}
                    setTool={() => { }}
                    color={'#000000'}
                    width={2}
                />
            </div>
        </div>
    );
}


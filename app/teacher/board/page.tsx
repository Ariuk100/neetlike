'use client';

import { useState, useEffect, useRef } from "react";
import WhiteboardCanvas from "@/features/whiteboard/core/WhiteboardCanvas";
import Toolbar from "@/features/whiteboard/core/Toolbar";
import { useAuth } from "@/app/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, getDocs, writeBatch, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { generateElementId, uploadWhiteboardImage } from "@/features/whiteboard/core/utils/whiteboardStorage";
import { WhiteboardElement } from "@/features/whiteboard/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Save, FolderOpen } from "lucide-react";
import InputDialog from "@/components/ui/input-dialog";

// Helper types for Saved Boards
interface SavedBoard {
    id: string;
    name: string;
    createdAt: string;
    createdBy: string;
    pageCount: number;
}

export default function TeacherBoardPage() {
    const { user } = useAuth();
    const sessionId = user ? `session_${user.uid}` : "demo_session";

    // Page state
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isActive, setIsActive] = useState(false);

    // Tool State (Lifted Up)
    const [tool, setTool] = useState<'pen' | 'eraser' | 'cursor' | 'laser'>('cursor');
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(2);
    const [isUploading, setIsUploading] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false);
    const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Save / Load Logic ---
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
    const [loadingSavedBoards, setLoadingSavedBoards] = useState(false);

    // Initialize session if needed
    useEffect(() => {
        if (!user) return;

        const initSession = async () => {
            try {
                const sessionRef = doc(db, 'whiteboard_sessions', sessionId);
                const sessionSnap = await getDoc(sessionRef);

                if (!sessionSnap.exists()) {
                    // Create new empty session
                    await setDoc(sessionRef, {
                        createdBy: user.uid,
                        createdAt: new Date().toISOString(),
                        totalPages: 1,
                        currentPage: 0,
                        isStudentWriteAllowed: true
                    });
                } else {
                    // Session exists - clear all content for fresh start
                    const collectionName = "whiteboard_sessions";
                    const batchDelete = writeBatch(db);

                    // Get current page count to delete all pages
                    const data = sessionSnap.data();
                    const existingPages = data.totalPages || 1;

                    // Delete all pages' content
                    for (let p = 0; p < existingPages; p++) {
                        const q_elems = query(collection(db, collectionName, sessionId, 'pages', String(p), 'elements'));
                        const snapElems = await getDocs(q_elems);
                        snapElems.forEach(d => batchDelete.delete(d.ref));

                        const q_paths = query(collection(db, collectionName, sessionId, 'pages', String(p), 'paths'));
                        const snapPaths = await getDocs(q_paths);
                        snapPaths.forEach(d => batchDelete.delete(d.ref));
                    }

                    await batchDelete.commit();

                    // Reset session to fresh state
                    await updateDoc(sessionRef, {
                        totalPages: 1,
                        currentPage: 0,
                        isActive: false
                    });

                    setTotalPages(1);
                    setCurrentPage(0);
                }
            } catch (error) {
                console.error("Error init session:", error);
            } finally {
                setLoading(false);
            }
        };

        const sessionRef = doc(db, 'whiteboard_sessions', sessionId);
        const unsub = onSnapshot(sessionRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setTotalPages(data.totalPages || 1);
                setCurrentPage(data.currentPage || 0);
                setIsActive(data.isActive || false);
            }
        });

        initSession();

        return () => unsub();
    }, [user, sessionId]);

    const toggleSessionActive = async () => {
        try {
            const sessionRef = doc(db, 'whiteboard_sessions', sessionId);
            await updateDoc(sessionRef, {
                isActive: !isActive
            });
            toast.success(isActive ? "Хичээл зогслоо" : "Хичээл эхэллээ");
        } catch (e) {
            console.error("Error toggling session:", e);
            toast.error("Алдаа гарлаа");
        }
    };

    // Actions
    const handleClearBoard = async () => {
        const collectionName = "whiteboard_sessions";
        const q_paths = query(collection(db, collectionName, sessionId, 'pages', String(currentPage), 'paths'));
        const q_elems = query(collection(db, collectionName, sessionId, 'pages', String(currentPage), 'elements'));

        const batch = writeBatch(db);
        const snapPaths = await getDocs(q_paths);
        const snapElems = await getDocs(q_elems);

        snapPaths.forEach(d => batch.delete(d.ref));
        snapElems.forEach(d => batch.delete(d.ref));

        await batch.commit();
        setClearDialogOpen(false);
        toast.success("Самбар цэвэрлэгдлээ");
    };





    // Fetch saved boards
    const fetchSavedBoards = async () => {
        if (!user) return;
        setLoadingSavedBoards(true);
        try {
            const q = query(collection(db, 'saved_boards')); // Can filter by createdBy ideally
            const snap = await getDocs(q);
            const boards: SavedBoard[] = [];
            snap.forEach(d => boards.push({ id: d.id, ...d.data() } as SavedBoard));
            // Sort by createdAt desc
            boards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            setSavedBoards(boards);
        } catch (e) {
            console.error("Error fetching Saved Boards", e);
        } finally {
            setLoadingSavedBoards(false);
        }
    };

    const handleSaveBoard = async () => {
        if (!saveName.trim() || !user) return;
        try {
            const boardId = generateElementId(); // Use unique ID
            const boardRef = doc(db, 'saved_boards', boardId);

            // 1. Save Meta
            await setDoc(boardRef, {
                name: saveName,
                createdBy: user.uid,
                createdAt: new Date().toISOString(),
                pageCount: totalPages
            });

            // 2. Save ALL Pages Content (Deep Copy)
            const collectionName = "whiteboard_sessions";
            const batch = writeBatch(db);

            for (let p = 0; p < totalPages; p++) {
                // Get Elements
                const q_elems = query(collection(db, collectionName, sessionId, 'pages', String(p), 'elements'));
                const snapElems = await getDocs(q_elems);

                // Get Paths
                const q_paths = query(collection(db, collectionName, sessionId, 'pages', String(p), 'paths'));
                const snapPaths = await getDocs(q_paths);

                // Write to saved_boards/{boardId}/pages/{p}/...
                snapElems.forEach(d => {
                    const newRef = doc(db, 'saved_boards', boardId, 'pages', String(p), 'elements', d.id);
                    batch.set(newRef, d.data());
                });
                snapPaths.forEach(d => {
                    const newRef = doc(db, 'saved_boards', boardId, 'pages', String(p), 'paths', d.id);
                    batch.set(newRef, d.data());
                });
            }

            await batch.commit();
            toast.success("Самбар хадгалагдлаа!");
            setSaveDialogOpen(false);
            setSaveName("");
        } catch (e) {
            console.error("Save Error:", e);
            toast.error("Хадгалахад алдаа гарлаа");
        }
    };

    const handleLoadBoard = async (boardId: string) => {
        try {
            if (!confirm("Одоогийн самбар устаж, сонгосон самбар ачааллагдах болно. Үргэлжлүүлэх үү?")) return;

            // 1. Clear Current Session deeply
            // We reuse clear logic, but here we do it inline or call helper if we want to confirm first.
            const collectionName = "whiteboard_sessions";
            const batchDelete = writeBatch(db);

            for (let p = 0; p < totalPages; p++) {
                const q_elems = query(collection(db, collectionName, sessionId, 'pages', String(p), 'elements'));
                const snapElems = await getDocs(q_elems);
                snapElems.forEach(d => batchDelete.delete(d.ref));

                const q_paths = query(collection(db, collectionName, sessionId, 'pages', String(p), 'paths'));
                const snapPaths = await getDocs(q_paths);
                snapPaths.forEach(d => batchDelete.delete(d.ref));
            }
            await batchDelete.commit();

            // 2. Load Content from Saved Board
            const boardRef = doc(db, 'saved_boards', boardId);
            const boardSnap = await getDoc(boardRef);
            if (!boardSnap.exists()) {
                toast.error("Самбар олдсонгүй");
                return;
            }
            const boardData = boardSnap.data();
            const newPageCount = boardData.pageCount || 1;

            const batchWrite = writeBatch(db); // For writes

            // Loop pages of saved board
            for (let p = 0; p < newPageCount; p++) {
                const q_elems = query(collection(db, 'saved_boards', boardId, 'pages', String(p), 'elements'));
                const snapElems = await getDocs(q_elems);

                const q_paths = query(collection(db, 'saved_boards', boardId, 'pages', String(p), 'paths'));
                const snapPaths = await getDocs(q_paths);

                snapElems.forEach(d => {
                    const newRef = doc(db, collectionName, sessionId, 'pages', String(p), 'elements', d.id);
                    batchWrite.set(newRef, d.data());
                });
                snapPaths.forEach(d => {
                    const newRef = doc(db, collectionName, sessionId, 'pages', String(p), 'paths', d.id);
                    batchWrite.set(newRef, d.data());
                });
            }

            // Update Session Meta
            const sessionRef = doc(db, 'whiteboard_sessions', sessionId);
            batchWrite.update(sessionRef, {
                totalPages: newPageCount,
                currentPage: 0 // Reset to first page
            });

            await batchWrite.commit();

            setTotalPages(newPageCount);
            setCurrentPage(0);
            setLoadDialogOpen(false);
            toast.success("Самбар амжилттай ачааллаа!");

        } catch (e) {
            console.error("Load Error:", e);
            toast.error("Ачааллахад алдаа гарлаа");
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const imageUrl = await uploadWhiteboardImage(sessionId, currentPage, file);
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'image',
                x: 35, y: 20, width: 30, height: 30,
                url: imageUrl
            };
            await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
            toast.success('Зураг амжилттай орлоо!');
        } catch {
            toast.error('Зураг хуулах үед алдаа гарлаа.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddWidget = async (type: string) => {
        if (type === 'optics_game') {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'optics_game',
                x: 20, y: 20,
                width: 60, height: 60,
                isLocked: false,
                currentLevel: 1
            };
            try {
                await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
                toast.success('Тоглоом нэмэгдлээ!');
            } catch (e) {
                console.error("Failed to add widget", e);
                toast.error('Тоглоом нэмэх үед алдаа гарлаа.');
            }
        } else if (type === 'photon_race_game') {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'photon_race_game',
                x: 10, y: 10,
                width: 80, height: 35,
                isLocked: false,
                players: {},
                gameStatus: 'waiting',
                raceStartedAt: 0,
                duration: 10
            };
            try {
                await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
                toast.success('Фотон уралдаан нэмэгдлээ!');
            } catch (e) {
                console.error("Failed to add widget", e);
                toast.error('Тоглоом нэмэх үед алдаа гарлаа.');
            }
        } else if (type === 'quiz_game') {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'quiz_game',
                x: 10, y: 10,
                width: 80, height: 35,
                isLocked: false,
                players: {},
                gameStatus: 'editing',
                questions: []
            };
            try {
                await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
                toast.success('Quiz Game нэмэгдлээ!');
            } catch (e) {
                console.error("Failed to add widget", e);
                toast.error('Тоглоом нэмэх үед алдаа гарлаа.');
            }
        } else if (type === 'measurement_objects') {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'measurement_objects',
                x: 10, y: 10,
                width: 80, height: 60,
                isLocked: false,
                bodies: [] // Initial empty world
            };
            try {
                await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
                toast.success('Физикийн симуляци нэмэгдлээ!');
            } catch (e) {
                console.error("Failed to add widget", e);
                toast.error('Симуляци нэмэх үед алдаа гарлаа.');
            }
        } else if (type === 'measurement_objects') {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'measurement_objects',
                x: 10, y: 10,
                width: 80, height: 60,
                isLocked: false,
                bodies: [] // Initial empty world
            };
            try {
                await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
                toast.success('Физикийн симуляци нэмэгдлээ!');
            } catch (e) {
                console.error("Failed to add widget", e);
                toast.error('Симуляци нэмэх үед алдаа гарлаа.');
            }
        } else if (type === 'simulation') {
            setSimulationDialogOpen(true);
        }
    };

    const handleCreateSimulation = async (url: string) => {
        if (!url.trim()) return;

        let embedUrl = url;
        // Basic YouTube URL parsing
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = url.split('v=')[1]?.split('&')[0];
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1];
            if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        try {
            const newElement: WhiteboardElement = {
                id: generateElementId(),
                type: 'simulation',
                x: 25,
                y: 15,
                width: 60,
                height: 34,
                url: embedUrl,
                createdAt: new Date().toISOString(),
                updatedBy: user?.displayName || 'Unknown'
            };

            await setDoc(doc(db, 'whiteboard_sessions', sessionId, 'pages', String(currentPage), 'elements', newElement.id), newElement);
            toast.success("Simulation амжилттай нэмэгдлээ");
        } catch (error) {
            console.error("Error creating simulation:", error);
            toast.error("Simulation нэмэхэд алдаа гарлаа");
        }
    };

    const handleAddPage = async () => {
        try {
            const nextPageIndex = totalPages;
            const sessionRef = doc(db, 'whiteboard_sessions', sessionId);

            // CRITICAL FIX: Explicitly clear any stale data at this index before "creating" the page.
            const collectionName = "whiteboard_sessions";
            const batch = writeBatch(db);

            const q_elems = query(collection(db, collectionName, sessionId, 'pages', String(nextPageIndex), 'elements'));
            const snapElems = await getDocs(q_elems);
            snapElems.forEach(d => batch.delete(d.ref));

            const q_paths = query(collection(db, collectionName, sessionId, 'pages', String(nextPageIndex), 'paths'));
            const snapPaths = await getDocs(q_paths);
            snapPaths.forEach(d => batch.delete(d.ref));

            await batch.commit();

            await updateDoc(sessionRef, {
                totalPages: nextPageIndex + 1,
                currentPage: nextPageIndex
            });

            setTotalPages(nextPageIndex + 1);
            setCurrentPage(nextPageIndex);
            toast.success("Шинэ хуудас нэмэгдлээ");
        } catch (error) {
            console.error("Error adding page:", error);
            toast.error("Хуудас нэмэхэд алдаа гарлаа");
        }
    };

    const handleDeletePage = async () => {
        if (totalPages <= 1) return;

        try {
            const sessionRef = doc(db, 'whiteboard_sessions', sessionId);

            // Clear the content of the CURRENT page (the one being viewed/deleted).
            const pageToDelete = currentPage;

            const collectionName = "whiteboard_sessions";
            const batch = writeBatch(db);

            const q_elems = query(collection(db, collectionName, sessionId, 'pages', String(pageToDelete), 'elements'));
            const snapElems = await getDocs(q_elems);
            snapElems.forEach(d => batch.delete(d.ref));

            const q_paths = query(collection(db, collectionName, sessionId, 'pages', String(pageToDelete), 'paths'));
            const snapPaths = await getDocs(q_paths);
            snapPaths.forEach(d => batch.delete(d.ref));

            await batch.commit();

            // Update Meta
            const newTotal = totalPages - 1;
            const newCurrent = Math.min(newTotal - 1, currentPage);

            await updateDoc(sessionRef, {
                totalPages: newTotal,
                currentPage: newCurrent >= 0 ? newCurrent : 0
            });

            setTotalPages(newTotal);
            setCurrentPage(newCurrent >= 0 ? newCurrent : 0);
            toast.success("Хуудас устгагдлаа");
        } catch (error) {
            console.error("Error deleting page:", error);
            toast.error("Хуудас устгахад алдаа гарлаа");
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full">Loading Board...</div>;

    return (
        <div className="min-h-screen w-full flex flex-col">
            {/* Header with Toolbar */}
            <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm z-50">
                <div className="w-[100px] hidden md:block" />

                {/* Centered Toolbar - Integrated */}
                <div className="flex-1 flex justify-center mx-4">
                    <Toolbar
                        tool={tool}
                        setTool={setTool}
                        color={color}
                        setColor={setColor}
                        width={width}
                        setWidth={setWidth}
                        onClear={() => setClearDialogOpen(true)}
                        onImageUpload={() => fileInputRef.current?.click()}
                        isUploading={isUploading}
                        className="bg-transparent border-none shadow-none"
                        // Page management
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onAddPage={handleAddPage}
                        onDeletePage={() => {
                            if (totalPages > 1) {
                                setDeletePageDialogOpen(true);
                            }
                        }}
                        onNavigatePage={(delta) => {
                            const newPage = Math.max(0, Math.min(totalPages - 1, currentPage + delta));
                            setCurrentPage(newPage);
                        }}
                        onAddWidget={handleAddWidget}
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                </div>

                <div className="flex items-center justify-end gap-2 w-auto min-w-[100px]">
                    <Button variant="outline" size="sm" onClick={() => { fetchSavedBoards(); setLoadDialogOpen(true); }} className="gap-2">
                        <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Нээх</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)} className="gap-2">
                        <Save className="w-4 h-4" /> <span className="hidden sm:inline">Хадгалах</span>
                    </Button>
                    <button
                        onClick={toggleSessionActive}
                        className={`px-6 py-2 rounded-full font-bold text-white shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2
                            ${isActive
                                ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                            }`}
                    >
                        {isActive ? (
                            <>
                                <span>Хичээл дуусгах</span>
                            </>
                        ) : (
                            <>
                                <span>Хичээл эхлүүлэх</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Board Area - Stable Center Layout */}
            <div className="flex-1 overflow-auto bg-gray-200 p-4 md:p-8 min-h-0 flex flex-col items-center">
                <div
                    className="relative bg-white shadow-2xl rounded-sm border border-gray-300 transition-all duration-300"
                    style={{
                        width: '1600px', // Fixed Internal Width for stability
                        height: '2200px', // Fixed Height
                        flexShrink: 0
                    }}
                >
                    <WhiteboardCanvas
                        sessionId={sessionId}
                        isTeacher={true}
                        isAllowedToWrite={true}
                        userName={user?.displayName || 'Багш'}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        collectionName="whiteboard_sessions"
                        onNavigatePage={(delta) => setCurrentPage(p => Math.max(0, Math.min(totalPages - 1, p + delta)))}
                        // Pass Tool State
                        tool={tool}
                        setTool={setTool}
                        color={color}
                        width={width}
                    />
                </div>
            </div>

            {/* Clear Confirmation Dialog */}
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Самбарыг цэвэрлэх үү?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ үйлдэл нь одоогийн хуудасны бүх зурсан зураас болон элементүүдийг устгана. Энэ үйлдлийг буцаах боломжгүй.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearBoard} className="bg-red-600 hover:bg-red-700">
                            Цэвэрлэх
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* Page Delete Confirmation Dialog */}
            <AlertDialog open={deletePageDialogOpen} onOpenChange={setDeletePageDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Хуудсыг устгах уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Энэ үйлдэл нь тухайн хуудсан дээрх бүх зурсан зураас болон элементүүдийг бүрэн устгана. Энэ үйлдлийг буцаах боломжгүй.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                handleDeletePage();
                                setDeletePageDialogOpen(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Save Board Dialog */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Самбар хадгалах</DialogTitle>
                        <DialogDescription>
                            Одоогийн самбарын төлөвийг нэр өгч хадгална уу.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Самбарын нэр (Жишээ нь: Физик Хичээл 1)"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Болих</Button>
                        <Button onClick={handleSaveBoard} disabled={!saveName.trim()}>Хадгалах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Load Board Dialog */}
            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Самбар ачааллах</DialogTitle>
                        <DialogDescription>
                            Хадгалсан самбаруудаас сонгож ачаална уу. Анхааруулга: Одоогийн самбар устах болно!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto min-h-0 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loadingSavedBoards ? (
                            <div className="text-center py-8">Ачаалж байна...</div>
                        ) : savedBoards.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Хадгалсан самбар алга.</div>
                        ) : (
                            savedBoards.map((board) => (
                                <div key={board.id} className="border rounded-lg p-4 hover:bg-gray-50 flex flex-col gap-2 relative group">
                                    <div className="font-bold text-lg">{board.name}</div>
                                    <div className="text-sm text-gray-500">
                                        Үүсгэсэн: {new Date(board.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded w-fit">
                                        {board.pageCount || 1} хуудас
                                    </div>

                                    <div className="mt-2 flex gap-2">
                                        <Button size="sm" onClick={() => handleLoadBoard(board.id)} className="flex-1">
                                            Ачааллах
                                        </Button>
                                    </div>

                                    {/* Delete Saved Board */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle delete logic via a separate confirm or direct
                                            // Ideally separate generic confirm setup, but for now strict:
                                            if (confirm('Та энэ хадгалсан самбарыг устгахдаа итгэлтэй байна уу?')) {
                                                const ref = doc(db, 'saved_boards', board.id);
                                                deleteDoc(ref).then(() => {
                                                    toast.success('Устгагдлаа');
                                                    setSavedBoards(prev => prev.filter(b => b.id !== board.id));
                                                });
                                            }
                                        }}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>Хаах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <InputDialog
                open={simulationDialogOpen}
                onOpenChange={setSimulationDialogOpen}
                title="Simulation / Embed URL оруулах"
                placeholder="https://..."
                onSubmit={handleCreateSimulation}
            />

        </div>
    );
}

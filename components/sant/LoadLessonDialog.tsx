'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LessonTemplate } from '@/lib/lessonHelpers';
import { User, Calendar } from 'lucide-react';

interface LoadLessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLoad: (template: LessonTemplate) => void;
}

export default function LoadLessonDialog({ open, onOpenChange, onLoad }: LoadLessonDialogProps) {
    const [lessons, setLessons] = useState<LessonTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            const q = query(collection(db, 'prepared_lessons'), orderBy('createdAt', 'desc'));
            getDocs(q).then((snap) => {
                const data: LessonTemplate[] = [];
                snap.forEach(d => data.push(d.data() as LessonTemplate));
                setLessons(data);
                setLoading(false);
            });
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Хичээл нээх</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Уншиж байна...</div>
                    ) : lessons.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Хадгалсан хичээл алга.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {lessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    className="border rounded-lg p-4 hover:border-black/20 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col gap-2"
                                    onClick={() => { onLoad(lesson); onOpenChange(false); }}
                                >
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-semibold text-lg line-clamp-1">{lesson.title}</h3>
                                        <span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-600 shrink-0">{lesson.subject}</span>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-stone-500 mt-auto">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {lesson.authorName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(lesson.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="ml-auto text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                                            {lesson.grade}-р анги
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

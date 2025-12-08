'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface StudentListProps {
    sessionId: string;
}

interface Student {
    id: string;
    name: string;
    class: string;
    joinedAt: string;
    status?: 'online' | 'offline';
    leftAt?: string | null;
}

export default function StudentList({ sessionId }: StudentListProps) {
    const [students, setStudents] = useState<Student[]>([]);

    useEffect(() => {
        if (!sessionId) return;

        const q = query(
            collection(db, 'whiteboard_sessions', sessionId, 'students')
            // orderBy('joinedAt', 'asc') // Requires index
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list: Student[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Student);
            });
            // Client-side sort: Online first, then by join time
            list.sort((a, b) => {
                // If status differs, online first
                if (a.status !== b.status) {
                    return a.status === 'online' ? -1 : 1;
                }
                return (a.joinedAt > b.joinedAt ? 1 : -1);
            });
            setStudents(list);
        });

        return () => unsub();
    }, [sessionId]);

    const formatTime = (isoString: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (isoString: string) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleString('mn-MN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const handleExportExcel = () => {
        if (students.length === 0) {
            toast.error('Татах сурагч байхгүй');
            return;
        }

        // Prepare data for Excel
        const excelData = students.map((s, index) => ({
            '№': index + 1,
            'Нэр': s.name,
            'Анги': s.class,
            'Орсон цаг': formatDateTime(s.joinedAt),
            'Гарсан цаг': s.leftAt ? formatDateTime(s.leftAt) : 'Одоо байгаа',
            'Төлөв': s.status === 'online' ? 'Online' : 'Offline'
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // №
            { wch: 20 },  // Нэр
            { wch: 10 },  // Анги
            { wch: 22 },  // Орсон цаг
            { wch: 22 },  // Гарсан цаг
            { wch: 10 },  // Төлөв
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Ирц');

        // Generate filename with date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filename = `Ирц_${sessionId}_${dateStr}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
        toast.success('Excel татагдлаа');
    };

    // Responsive adjustments:
    // - w-full to fill container (Sheet or Sidebar)
    // - h-full to flex correctly
    return (
        <div className="w-full h-full flex flex-col bg-white border-l shadow-lg">
            <div className="p-4 border-b flex items-center justify-between bg-stone-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-stone-600" />
                    <h3 className="font-semibold text-stone-700">Сурагчид ({students.length})</h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleExportExcel}
                    title="Excel татах"
                    className="h-8 w-8 text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                >
                    <Download className="w-4 h-4" />
                </Button>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {students.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            Одоогоор сурагч алга
                        </div>
                    ) : (
                        students.map((student) => {
                            const isOnline = student.status === 'online';
                            const leftTime = student.leftAt ? formatTime(student.leftAt) : '?';
                            const timeText = isOnline
                                ? `${formatTime(student.joinedAt)} `
                                : `${formatTime(student.joinedAt)} - ${leftTime} `;

                            return (
                                <div
                                    key={student.id}
                                    className={`flex items-center justify-between p-2 rounded-md border border-transparent hover:bg-stone-100 transition-colors text-sm ${!isOnline ? 'opacity-60 bg-stone-50' : ''} `}
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-stone-800 truncate max-w-[120px]" title={student.name}>{student.name}</span>
                                            <span className="text-xs text-stone-500 flex-shrink-0">{student.class}</span>
                                        </div>
                                        <span className="text-[10px] text-stone-400 font-mono">
                                            {timeText}
                                        </span>
                                    </div>
                                    <div
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-300'} `}
                                        title={isOnline ? "Online" : "Offline"}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

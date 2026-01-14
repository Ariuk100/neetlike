'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Lock, CheckCircle, AlertTriangle, HelpCircle, Eye } from 'lucide-react';

interface StudentLabState {
    name: string;
    code: string;
    output: string;
    status: 'coding' | 'running' | 'completed' | 'error';
    helpRequested?: boolean;
    lastUpdated?: string;
}

interface TeacherLabDashboardProps {
    sessionId: string;
    onViewStudent: (studentId: string) => void;
}

export default function TeacherLabDashboard({ sessionId, onViewStudent }: TeacherLabDashboardProps) {
    const [students, setStudents] = useState<StudentLabState[]>([]);
    const [labStatus, setLabStatus] = useState<'open' | 'locked'>('locked');
    const [activeLab, setActiveLab] = useState('lab1');

    useEffect(() => {
        // Listen to lab status
        const unsubSession = onSnapshot(doc(db, 'cpp', sessionId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setLabStatus(data.labStatus || 'locked');
                if (data.activeLab) setActiveLab(data.activeLab);
            }
        });

        // Listen to student labs
        const q = query(collection(db, 'cpp', sessionId, 'labs'));
        const unsubLabs = onSnapshot(q, (snapshot) => {
            const list: StudentLabState[] = [];
            snapshot.forEach((doc) => {
                list.push({ name: doc.id, ...doc.data() } as StudentLabState);
            });
            setStudents(list);
        });

        return () => {
            unsubSession();
            unsubLabs();
        };
    }, [sessionId]);

    const toggleLabLock = async () => {
        const newStatus = labStatus === 'open' ? 'locked' : 'open';
        await updateDoc(doc(db, 'cpp', sessionId), { labStatus: newStatus });
    };

    const handleLabChange = async (labId: string) => {
        await updateDoc(doc(db, 'cpp', sessionId), { activeLab: labId });
    };

    return (
        <div className="h-full flex flex-col p-4 bg-stone-50 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-stone-900">Лабораторийн Удирдлага</h2>
                    <p className="text-sm text-stone-500">Сурагчдын явцыг хянах</p>
                </div>
                <div className="flex gap-2 items-center">
                    <select
                        value={activeLab}
                        onChange={(e) => handleLabChange(e.target.value)}
                        className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="lab1">Lab 1: Нас Тооцоологч</option>
                        <option value="lab2">Lab 2: Нууц Үг</option>
                        <option value="lab3">Lab 3: Пуужин</option>
                    </select>

                    <Button
                        variant={labStatus === 'open' ? "destructive" : "default"}
                        onClick={toggleLabLock}
                    >
                        {labStatus === 'open' ? <Lock className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {labStatus === 'open' ? 'Лабыг Хаах' : 'Лабыг Нээх'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                    <Card key={student.name} className={`relative overflow-hidden transition-all hover:shadow-md ${student.helpRequested ? 'ring-2 ring-red-500 border-red-500' : ''}`}>
                        {student.helpRequested && (
                            <div className="absolute top-0 right-0 p-1 bg-red-500 rounded-bl-lg animate-pulse z-10">
                                <HelpCircle className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {student.name}
                            </CardTitle>
                            {getStatusBadge(student.status)}
                        </CardHeader>
                        <CardContent>
                            <div className="h-24 bg-stone-900 rounded-md p-2 mb-3 overflow-hidden">
                                <pre className="text-[10px] text-stone-300 font-mono leading-tight whitespace-pre-wrap opacity-75">
                                    {student.code || '// No code yet'}
                                </pre>
                            </div>
                            <div className="flex justify-between items-center text-xs text-stone-500">
                                <span>Output: {student.output ? (student.output.length > 20 ? student.output.substring(0, 20) + '...' : student.output) : '-'}</span>
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onViewStudent(student.name)}>
                                    <Eye className="w-3 h-3 mr-1" />
                                    Харах
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {students.length === 0 && (
                    <div className="col-span-full py-12 text-center text-stone-400 italic border-2 border-dashed border-stone-200 rounded-xl">
                        Одоогоор лабораторид сурагч нэгдээгүй байна.
                    </div>
                )}
            </div>
        </div>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'completed':
            return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Дууссан</Badge>;
        case 'error':
            return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Алдаатай</Badge>;
        case 'running':
            return <Badge className="bg-blue-500 hover:bg-blue-600">Ажиллаж байна</Badge>;
        default:
            return <Badge variant="outline" className="text-stone-500">Бичиж байна</Badge>;
    }
}

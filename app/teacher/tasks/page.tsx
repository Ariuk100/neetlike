'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchQuestions, softDeleteQuestion, fetchCategories } from './sheets-action';
import {
    Loader2, RefreshCw, Plus, Search, Edit2, Trash2,
    Image as ImageIcon, XCircle, MoreHorizontal
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from '@/lib/utils';

const bloomLevels = [
    { value: '1', label: 'Сэргээн санах' },
    { value: '2', label: 'Ойлгох' },
    { value: '3', label: 'Хэрэглэх' },
    { value: '4', label: 'Шинжлэх' },
    { value: '5', label: 'Үнэлэх' },
    { value: '6', label: 'Бүтээх' },
];

export default function TeacherTasksPage() {
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [questions, setQuestions] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterBloom, setFilterBloom] = useState('all');
    const [filterDifficulty, setFilterDifficulty] = useState('all');

    const loadData = async () => {
        setLoading(true);
        try {
            const [qData, cData] = await Promise.all([
                fetchQuestions(),
                fetchCategories()
            ]);
            setQuestions(qData);
            setCategories(cData);
        } catch {
            toast.error('Алдал гарлаа. Датаг дахин ачаална уу.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const availableSubjects = useMemo(() => Array.from(new Set(categories.map(c => c.subject))).filter(Boolean), [categories]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q => {
            const searchText = ((q.questionText || '') + (q.topic || '') + (q.subTopic || '')).toLowerCase();
            const matchesSearch = searchText.includes(searchQuery.toLowerCase());
            const matchesSubject = filterSubject === 'all' || q.subject === filterSubject;
            const matchesGrade = filterGrade === 'all' || q.grade === filterGrade;
            const matchesType = filterType === 'all' || q.qType === filterType;
            const matchesBloom = filterBloom === 'all' || q.bloom.toString() === filterBloom;
            const matchesDifficulty = filterDifficulty === 'all' || q.difficulty.toString() === filterDifficulty;
            return matchesSearch && matchesSubject && matchesGrade && matchesType && matchesBloom && matchesDifficulty;
        });
    }, [questions, searchQuery, filterSubject, filterGrade, filterType, filterBloom, filterDifficulty]);

    const gradeList = ['all', '6', '7', '8', '9', '10', '11', '12'];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEdit = (q: any) => {
        router.push(`/teacher/tasks/editor?rowIndex=${q.rowIndex}&type=${q.qType}`);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDelete = async (q: any) => {
        if (!confirm('Та энэ асуултыг устгахдаа итгэлтэй байна уу?')) return;
        try {
            setLoading(true);
            await softDeleteQuestion(q.rowIndex, q.qType);
            toast.success("Устгагдлаа");
            await loadData();
        } catch {
            toast.error("Устгахад алдаа гарлаа");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-stone-50/50 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900">Даалгавар</h1>
                    <p className="text-stone-500 text-sm">Асуултын сангийн удирдлага</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2 bg-white">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Шинэчлэх
                    </Button>
                    <Button size="sm" onClick={() => router.push('/teacher/tasks/editor')} className="bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition-all active:scale-95">
                        <Plus className="h-4 w-4 mr-1" />
                        Асуулт нэмэх
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Асуулт, сэдвээр хайх..."
                        className="pl-10 bg-white border-stone-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="bg-white border-stone-200">
                        <SelectValue placeholder="Төрөл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх төрөл</SelectItem>
                        <SelectItem value="MCQ">MCQ</SelectItem>
                        <SelectItem value="Problem">Problem</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="bg-white border-stone-200">
                        <SelectValue placeholder="Хичээл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх хичээл</SelectItem>
                        {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="bg-white border-stone-200">
                        <SelectValue placeholder="Анги" />
                    </SelectTrigger>
                    <SelectContent>
                        {gradeList.map(g => <SelectItem key={g} value={g}>{g === 'all' ? 'Бүх анги' : `${g}-р анги`}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterBloom} onValueChange={setFilterBloom}>
                    <SelectTrigger className="bg-white border-stone-200">
                        <SelectValue placeholder="Блүүм" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх Блүүм</SelectItem>
                        {bloomLevels.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="bg-white border-stone-200">
                        <SelectValue placeholder="Хүндрэл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх хүндрэл</SelectItem>
                        {[1, 2, 3, 4, 5].map(d => <SelectItem key={d} value={d.toString()}>{d}-р зэрэг</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Main Content Table */}
            <Card className="border-stone-200 shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-stone-50/50">
                        <TableRow className="border-stone-100">
                            <TableHead className="w-16 pl-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest">#</TableHead>
                            <TableHead className="text-xs font-bold text-stone-900 uppercase">Сэдэв</TableHead>
                            <TableHead className="text-xs font-bold text-stone-900 uppercase">Асуултын текст</TableHead>
                            <TableHead className="text-xs font-bold text-stone-900 uppercase text-center">Түвшин</TableHead>
                            <TableHead className="text-right pr-6 text-xs font-bold text-stone-900 uppercase">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && questions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-stone-200" />
                                        <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">Ачаалж байна...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredQuestions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <XCircle className="h-8 w-8 text-stone-100" />
                                        <p className="text-stone-400 text-sm font-medium">Одоогоор асуулт алга байна.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuestions.map((q, index) => (
                                <TableRow key={q.id} className="border-stone-50 hover:bg-stone-50/50 transition-colors">
                                    <TableCell className="pl-6 py-4">
                                        <span className="text-xs font-bold text-stone-300">{(index + 1).toString().padStart(2, '0')}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-stone-800">{q.topic}</span>
                                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-stone-200 text-stone-500">{q.grade} анги</Badge>
                                                <Badge variant="secondary" className="text-[8px] py-0 px-1.5 bg-stone-100 text-stone-500 font-bold uppercase">{q.qType}</Badge>
                                            </div>
                                            <p className="text-[10px] text-stone-400 mt-0.5 uppercase tracking-tighter">{q.subTopic || '---'}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md py-4">
                                        <div className="flex items-start gap-2">
                                            {q.questionImage && (
                                                <span title="Зурагтай">
                                                    <ImageIcon className="h-4 w-4 mt-0.5 text-stone-200 flex-shrink-0" />
                                                </span>
                                            )}
                                            <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">
                                                {q.questionText}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="text-[8px] font-bold text-stone-300 uppercase leading-none">
                                                {bloomLevels.find(b => b.value === q.bloom.toString())?.label || `BLOOM ${q.bloom}`}
                                            </span>
                                            <span className="text-[8px] font-bold text-stone-300 uppercase leading-none">DIFF {q.difficulty}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-stone-100">
                                                    <MoreHorizontal className="h-4 w-4 text-stone-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-32 rounded-xl">
                                                <DropdownMenuItem onClick={() => handleEdit(q)} className="gap-2 cursor-pointer">
                                                    <Edit2 className="h-3.5 w-3.5" /> Засах
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(q)} className="gap-2 text-red-600 cursor-pointer">
                                                    <Trash2 className="h-3.5 w-3.5" /> Устгах
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

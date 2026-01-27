'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchQuestionsFromFirestore, softDeleteQuestion, fetchCategories, bulkDeleteQuestions, bulkUpdateStatus, syncAllQuestionsFromSheets } from './sheets-action';
import {
    Loader2, RefreshCw, Plus, Search, Edit2, Trash2,
    XCircle, MoreHorizontal, RotateCcw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/app/context/AuthContext';

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
    const queryClient = useQueryClient();
    const { ref, inView } = useInView();
    const { user } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterBloom, setFilterBloom] = useState('all');
    const [filterDifficulty, setFilterDifficulty] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [deletingQuestion, setDeletingQuestion] = useState<any>(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const filters = useMemo(() => ({
        searchQuery,
        subject: filterSubject,
        grade: filterGrade,
        qType: filterType,
        bloom: filterBloom,
        difficulty: filterDifficulty,
        status: filterStatus
    }), [searchQuery, filterSubject, filterGrade, filterType, filterBloom, filterDifficulty, filterStatus]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch
    } = useInfiniteQuery({
        queryKey: ['questions', filters],
        queryFn: ({ pageParam }) => fetchQuestionsFromFirestore(filters, pageParam as string),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getNextPageParam: (lastPage: any) => lastPage.nextCursor,
        initialPageParam: null as string | null,
    });

    const { data: categories = [] } = useInfiniteQuery({
        queryKey: ['categories'],
        queryFn: () => fetchCategories(),
        initialPageParam: null as string | null,
        getNextPageParam: () => null,
        select: (data) => data.pages[0] || []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const questions = useMemo(() => data?.pages.flatMap(page => page.items) || [], [data]);

    const deleteMutation = useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async (q: any) => softDeleteQuestion(q.rowIndex, q.qType),
        onMutate: async (deletedQ) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['questions', filters] });
            const previousData = queryClient.getQueryData(['questions', filters]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(['questions', filters], (old: any) => ({
                ...old,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pages: old.pages.map((page: any) => ({
                    ...page,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: page.items.filter((q: any) => q.id !== deletedQ.id)
                }))
            }));
            return { previousData };
        },
        onSuccess: () => {
            toast.success("Устгагдлаа");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err, deletedQ, context: any) => {
            toast.error("Устгахад алдаа гарлаа");
            if (context?.previousData) {
                queryClient.setQueryData(['questions', filters], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        }
    });

    const bulkDeleteMutation = useMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutationFn: async (items: any[]) => bulkDeleteQuestions(items),
        onMutate: async (itemsToDelete) => {
            const idsToDelete = itemsToDelete.map(i => i.id);
            await queryClient.cancelQueries({ queryKey: ['questions', filters] });
            const previousData = queryClient.getQueryData(['questions', filters]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(['questions', filters], (old: any) => ({
                ...old,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pages: old.pages.map((page: any) => ({
                    ...page,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: page.items.filter((q: any) => !idsToDelete.includes(q.id))
                }))
            }));
            return { previousData };
        },
        onSuccess: () => {
            toast.success("Сонгосон асуултууд устгагдлаа");
            setSelectedIds([]);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err, items, context: any) => {
            toast.error("Олноор устгахад алдаа гарлаа");
            if (context?.previousData) {
                queryClient.setQueryData(['questions', filters], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        }
    });

    const bulkStatusMutation = useMutation({
        mutationFn: async ({ ids, status }: { ids: string[], status: string }) => bulkUpdateStatus(ids, status),
        onMutate: async ({ ids, status }) => {
            await queryClient.cancelQueries({ queryKey: ['questions', filters] });
            const previousData = queryClient.getQueryData(['questions', filters]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(['questions', filters], (old: any) => ({
                ...old,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pages: old.pages.map((page: any) => ({
                    ...page,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: page.items.map((q: any) => ids.includes(q.id) ? { ...q, status } : q)
                }))
            }));
            return { previousData };
        },
        onSuccess: () => {
            toast.success("Төлөв шинэчлэгдлээ");
            setSelectedIds([]);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err, variables, context: any) => {
            toast.error("Төлөв өөрчлөхөд алдаа гарлаа");
            if (context?.previousData) {
                queryClient.setQueryData(['questions', filters], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        }
    });

    const syncMutation = useMutation({
        mutationFn: () => syncAllQuestionsFromSheets(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
        }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableSubjects = useMemo(() => Array.from(new Set(categories.map((c: any) => c.subject))).filter(Boolean), [categories]);
    const gradeList = ['all', '6', '7', '8', '9', '10', '11', '12'];

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === questions.length && questions.length > 0) setSelectedIds([]);
        else setSelectedIds(questions.map(q => q.id));
    };

    const resetFilters = () => {
        setSearchQuery('');
        setFilterSubject('all');
        setFilterGrade('all');
        setFilterType('all');
        setFilterBloom('all');
        setFilterDifficulty('all');
        setFilterStatus('all');
    };

    return (
        <div className="flex flex-col min-h-screen bg-stone-50/50 p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900">Даалгавар</h1>
                    <p className="text-stone-500 text-sm">Асуултын сангийн удирдлага</p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'admin' && (
                        <Button variant="outline" size="sm"
                            onClick={() => {
                                const promise = syncMutation.mutateAsync();
                                toast.promise(promise, {
                                    loading: 'Синк хийж байна...',
                                    success: 'Амжилттай синк хийгдлээ',
                                    error: 'Синк хийхэд алдаа гарлаа'
                                });
                            }}
                            disabled={syncMutation.isPending}
                            className="bg-white"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", syncMutation.isPending && "animate-spin")} />
                            Синк (Sheets)
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['questions'] })} disabled={isLoading} className="bg-white text-stone-600">
                        <RotateCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                        Шинэчлэх
                    </Button>
                    <Button size="sm" onClick={() => router.push('/teacher/tasks/editor')} className="bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95">
                        <Plus className="h-4 w-4 mr-1" />
                        Асуулт нэмэх
                    </Button>
                </div>
            </div>

            {/* Filter Row */}
            <div className="bg-white p-3 rounded-lg border border-stone-200 mb-6 flex items-center gap-4 overflow-x-auto no-scrollbar">
                <div className="relative w-72 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="ID эсвэл сэдвээр хайх..."
                        className="pl-9 h-9 bg-stone-50 border-stone-200 focus-visible:ring-stone-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-9 w-32 bg-white border-stone-200 text-sm">
                            <SelectValue placeholder="Төрөл" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх төрөл</SelectItem>
                            <SelectItem value="MCQ">MCQ</SelectItem>
                            <SelectItem value="Problem">Бодлого</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                        <SelectTrigger className="h-9 w-40 bg-white border-stone-200 text-sm">
                            <SelectValue placeholder="Хичээл" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх хичээл</SelectItem>
                            {(availableSubjects as string[]).map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filterGrade} onValueChange={setFilterGrade}>
                        <SelectTrigger className="h-9 w-28 bg-white border-stone-200 text-sm">
                            <SelectValue placeholder="Анги" />
                        </SelectTrigger>
                        <SelectContent>
                            {gradeList.map(g => <SelectItem key={g} value={g}>{g === 'all' ? 'Бүх анги' : `${g}-р анги`}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filterBloom} onValueChange={setFilterBloom}>
                        <SelectTrigger className="h-9 w-28 bg-white border-stone-200 text-sm">
                            <SelectValue placeholder="Блүүм" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх Блүүм</SelectItem>
                            {bloomLevels.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                        <SelectTrigger className="h-9 w-28 bg-white border-stone-200 text-sm">
                            <SelectValue placeholder="Түвшин" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх түвшин</SelectItem>
                            {[1, 2, 3, 4, 5].map(d => <SelectItem key={d} value={d.toString()}>{d}-р зэрэг</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 w-28 bg-white border-stone-200 text-sm">
                            <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх статус</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetFilters}
                        className="h-9 px-3 text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg gap-2 text-sm"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Арилгах
                    </Button>
                </div>
            </div>

            <Card className="border-stone-200 shadow-sm overflow-hidden bg-white rounded-xl relative">
                <Table>
                    <TableHeader className="bg-stone-50/50">
                        <TableRow className="border-stone-100">
                            <TableHead className="w-12 pl-6">
                                <Checkbox
                                    checked={selectedIds.length > 0 && selectedIds.length === questions.length}
                                    onCheckedChange={toggleSelectAll}
                                    className="border-stone-300"
                                />
                            </TableHead>
                            <TableHead className="w-24 pl-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">ID</TableHead>
                            <TableHead className="text-[10px] font-bold text-stone-900 uppercase tracking-widest">Сэдэв</TableHead>
                            <TableHead className="text-[10px] font-bold text-stone-900 uppercase tracking-widest text-center">Дэд сэдэв</TableHead>
                            <TableHead className="text-[10px] font-bold text-stone-900 uppercase tracking-widest text-center">Статус</TableHead>
                            <TableHead className="text-right pr-6 text-[10px] font-bold text-stone-900 uppercase tracking-widest">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.pages[0]?.error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3 p-8">
                                        <XCircle className="h-8 w-8 text-red-500" />
                                        <div className="space-y-1">
                                            <p className="text-red-600 font-bold text-sm">Датаг ачаалахад алдаа гарлаа</p>
                                            <p className="text-stone-400 text-[10px] max-w-md mx-auto">
                                                {data.pages[0].error.includes('index')
                                                    ? "Firebase Console дээр Composite Index нэмэх шаардлагатай байна. Browser-ийн console дээрх линкийг ашиглана уу."
                                                    : data.pages[0].error}
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">Дахин оролдох</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : isLoading && questions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-stone-200" />
                                        <p className="text-stone-400 text-sm">Ачаалж байна...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : questions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <XCircle className="h-8 w-8 text-stone-100" />
                                        <p className="text-stone-400 text-sm font-medium">Асуулт олдсонгүй.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {questions.map((q) => (
                                    <TableRow key={q.id} className={cn(
                                        "border-stone-50 hover:bg-stone-50/30 transition-colors group",
                                        selectedIds.includes(q.id) && "bg-stone-50"
                                    )}>
                                        <TableCell className="pl-6 py-3">
                                            <Checkbox
                                                checked={selectedIds.includes(q.id)}
                                                onCheckedChange={() => toggleSelect(q.id)}
                                                className="border-stone-300"
                                            />
                                        </TableCell>
                                        <TableCell className="py-3 pl-2">
                                            <span className="text-xs font-mono bg-stone-100 px-2 py-1 rounded text-stone-600 border border-stone-200">
                                                {q.id}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-stone-800">{q.topic}</span>
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-stone-100 text-stone-500 font-medium">{q.qType}</Badge>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-stone-400">{q.subject}</span>
                                                    <span className="text-stone-200">•</span>
                                                    <span className="text-xs text-stone-400">{q.grade} анги</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-xs text-stone-500">{q.subTopic || '---'}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] py-0.5 px-2 font-medium rounded-full border-none shadow-sm",
                                                    q.status === 'active'
                                                        ? "bg-emerald-50 text-emerald-600"
                                                        : "bg-stone-100 text-stone-500"
                                                )}
                                            >
                                                {q.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => router.push(`/teacher/tasks/editor?rowIndex=${q.rowIndex}&type=${q.qType}`)} className="h-8 w-8 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg">
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeletingQuestion(q)} className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="group-hover:hidden">
                                                <MoreHorizontal className="h-4 w-4 text-stone-300 ml-auto mr-2" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {hasNextPage && (
                                    <TableRow ref={ref}>
                                        <TableCell colSpan={6} className="py-8 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-stone-200 mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Bulk Actions Floating Toolbar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white border border-stone-200 text-stone-900 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 ring-1 ring-stone-950/5">
                    <div className="flex items-center gap-3 border-r border-stone-100 pr-6 mr-2">
                        <span className="bg-blue-600 text-white text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-sm">
                            {selectedIds.length}
                        </span>
                        <span className="text-sm font-semibold text-stone-600">Сонгосон</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg px-3"
                                onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'active' })}
                            >
                                <Badge className="h-2 w-2 rounded-full bg-emerald-500 p-0 mr-2" />
                                Active болгох
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-xs font-semibold text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-lg px-3"
                                onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'inactive' })}
                            >
                                <Badge className="h-2 w-2 rounded-full bg-stone-300 p-0 mr-2" />
                                Inactive болгох
                            </Button>
                        </div>

                        <div className="w-px h-6 bg-stone-100" />

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-3 gap-2"
                            onClick={() => setBulkDeleting(true)}
                        >
                            <Trash2 className="h-4 w-4" />
                            Устгах
                        </Button>

                        <div className="w-px h-6 bg-stone-100" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-full"
                            onClick={() => setSelectedIds([])}
                        >
                            <XCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Single Delete Confirmation */}
            <AlertDialog open={!!deletingQuestion} onOpenChange={() => setDeletingQuestion(null)}>
                <AlertDialogContent className="bg-white border-stone-200 rounded-2xl shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-stone-900 font-bold">Асуулт устгах уу?</AlertDialogTitle>
                        <AlertDialogDescription className="text-stone-500">
                            Та <strong>{deletingQuestion?.id}</strong> ID-тай асуултыг устгахдаа итгэлтэй байна уу? Энэ үйлдэл нь асуултыг жагсаалтаас хасах болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg">Болих</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg border-none"
                            onClick={() => {
                                if (deletingQuestion) {
                                    deleteMutation.mutate(deletingQuestion);
                                    setDeletingQuestion(null);
                                }
                            }}
                        >
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={bulkDeleting} onOpenChange={setBulkDeleting}>
                <AlertDialogContent className="bg-white border-stone-200 rounded-2xl shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-stone-900 font-bold">Олноор устгах уу?</AlertDialogTitle>
                        <AlertDialogDescription className="text-stone-500">
                            Сонгогдсон <strong>{selectedIds.length}</strong> асуултыг устгахдаа итгэлтэй байна уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg">Болих</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg border-none"
                            onClick={() => {
                                const itemsToDelete = questions
                                    .filter(q => selectedIds.includes(q.id))
                                    .map(q => ({ rowIndex: q.rowIndex, qType: q.qType, id: q.id }));
                                bulkDeleteMutation.mutate(itemsToDelete);
                                setBulkDeleting(false);
                            }}
                        >
                            Тийм, устга
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import { fetchQuestions, upsertQuestion, uploadImage, fetchCategories } from '../sheets-action';
import { useQueryClient } from '@tanstack/react-query';
import { optimizeImage } from '@/lib/image-utils';
import {
    Loader2, ChevronLeft, Save, Upload,
    Eye, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import LatexRenderer from '@/components/LatexRenderer';

const bloomLevels = [
    { value: '1', label: 'Сэргээн санах' },
    { value: '2', label: 'Ойлгох' },
    { value: '3', label: 'Хэрэглэх' },
    { value: '4', label: 'Шинжлэх' },
    { value: '5', label: 'Үнэлэх' },
    { value: '6', label: 'Бүтээх' },
];

function EditorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rowIndex = searchParams.get('rowIndex');
    const typeParam = searchParams.get('type');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [categories, setCategories] = useState<any[]>([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formData, setFormData] = useState<any>({
        qType: 'MCQ',
        status: 'inactive',
        subject: '',
        topic: '',
        subTopic: '',
        grade: '6',
        bloom: '1',
        difficulty: '1',
        questionText: '',
        questionImage: '',
        opt1: '', opt2: '', opt3: '', opt4: '', opt5: '',
        opt1Image: '', opt2Image: '', opt3Image: '', opt4Image: '', opt5Image: '',
        correctAnswer: '1',
        solutionText: '',
        solutionImage: '',
    });

    useEffect(() => {
        const init = async () => {
            try {
                const cData = await fetchCategories();
                setCategories(cData);

                if (rowIndex) {
                    const qData = await fetchQuestions();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const question = qData.find((q: any) => q.rowIndex.toString() === rowIndex);
                    if (question) {
                        setFormData(question);
                    } else {
                        toast.error("Асуулт олдсонгүй");
                    }
                } else if (typeParam) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setFormData((prev: any) => ({ ...prev, qType: typeParam }));
                }
            } catch {
                toast.error("Датаг ачаалахад алдаа гарлаа");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [rowIndex, typeParam]);

    const availableSubjects = useMemo(() => Array.from(new Set(categories.map(c => c.subject))).filter(Boolean), [categories]);
    const availableTopics = useMemo(() => {
        return Array.from(new Set(categories
            .filter(c => c.subject === formData.subject)
            .map(c => c.topic)
        )).filter(Boolean);
    }, [categories, formData.subject]);

    const availableSubTopics = useMemo(() => {
        return Array.from(new Set(categories
            .filter(c => c.subject === formData.subject && c.topic === formData.topic)
            .map(c => c.subTopic)
        )).filter(Boolean);
    }, [categories, formData.subject, formData.topic]);

    const calculateHash = async (file: File) => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(field);
        try {
            const optimized = await optimizeImage(file);
            const hash = await calculateHash(optimized);

            const fd = new FormData();
            fd.append('file', optimized);
            fd.append('hash', hash);

            const result = await uploadImage(fd);

            if (result.error) {
                toast.error(result.error);
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setFormData((prev: any) => ({ ...prev, [field]: result.url }));
            toast.success('Зураг амжилттай хадгалагдлаа');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(`Зураг хуулахад алдаа гарлаа: ${error.message || 'Тодорхойгүй алдаа'}`);
        } finally {
            setUploading(null);
        }
    };

    const removeImage = (field: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFormData((prev: any) => ({ ...prev, [field]: '' }));
    };

    const queryClient = useQueryClient();

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await upsertQuestion(formData);
            toast.success("Амжилттай хадгалагдлаа");
            queryClient.invalidateQueries({ queryKey: ['questions'] });
            router.push('/teacher/tasks');
        } catch {
            toast.error("Хадгалахад алдаа гарлаа");
        } finally {
            setSaving(false);
        }
    };

    const ImageUploadSection = ({ field, label }: { field: string, label?: string }) => {
        const url = formData[field];
        const isUploading = uploading === field;

        return (
            <div className="space-y-2">
                {label && <Label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{label}</Label>}
                <div className="flex items-center gap-3">
                    {url ? (
                        <div className="flex items-center gap-2 p-2 bg-white border border-stone-200 rounded-lg shadow-sm group">
                            <div className="relative h-10 w-10">
                                <NextImage
                                    src={url}
                                    alt="Thumbnail"
                                    fill
                                    className="object-contain rounded"
                                    sizes="40px"
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-red-500" onClick={() => removeImage(field)}>
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="file" className="hidden" id={`up-${field}`} onChange={(e) => handleImageUpload(e, field)} disabled={!!uploading} />
                            <Button asChild variant="outline" size="sm" className="bg-white border-stone-200 h-9 gap-2 text-stone-600">
                                <label htmlFor={`up-${field}`} className="cursor-pointer flex items-center gap-2">
                                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    Зураг хуулах
                                </label>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-stone-200" />
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Ачаалж байна...</p>
        </div>
    );

    const isMCQ = formData.qType === 'MCQ';

    return (
        <div className="flex flex-col h-screen bg-stone-50 overflow-hidden">
            {/* Nav Header */}
            <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between z-30">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <ChevronLeft className="h-5 w-5 text-stone-600" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-stone-900 leading-none">
                            {rowIndex ? 'Асуулт засах' : 'Шинэ асуулт'}
                        </h1>
                        <p className="text-xs text-stone-500 mt-1.5">{formData.qType === 'MCQ' ? 'Олон сонголттой асуулт' : 'Бодлого төрлийн асуулт'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => router.back()} className="text-stone-500 hover:text-stone-700">Цуцлах</Button>
                    <Button onClick={() => handleSubmit()} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 shadow-sm shadow-blue-200">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Хадгалах
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Scrollable Form */}
                <div className="w-1/2 overflow-y-auto bg-stone-50/30 p-8 border-r border-stone-200 custom-scrollbar pb-32">
                    <div className="max-w-2xl mx-auto space-y-10">

                        {/* Type Selection */}
                        {!rowIndex && (
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold text-stone-700">Асуултын төрөл</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['MCQ', 'Problem'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFormData({ ...formData, qType: type })}
                                            className={cn(
                                                "p-4 rounded-xl border text-left transition-all",
                                                formData.qType === type
                                                    ? "bg-white border-blue-600 ring-1 ring-blue-600 shadow-md"
                                                    : "bg-white border-stone-200 text-stone-400 hover:border-stone-300"
                                            )}
                                        >
                                            <div className="text-sm font-bold text-stone-900">{type === 'MCQ' ? 'MCQ' : 'Бодлого'}</div>
                                            <div className="text-xs text-stone-500 mt-1">
                                                {type === 'MCQ' ? 'Олон сонголттой' : 'Текст эсвэл тоон хариулт'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata Section */}
                        <div className="space-y-6">
                            <Label className="text-sm font-semibold text-stone-700">Ерөнхий мэдээлэл</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-stone-500">Хичээл</Label>
                                    <Select value={formData.subject} onValueChange={(v) => setFormData({ ...formData, subject: v, topic: '', subTopic: '' })}>
                                        <SelectTrigger className="bg-white border-stone-200">
                                            <SelectValue placeholder="Сонгох..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-stone-500">Анги</Label>
                                    <Select value={formData.grade} onValueChange={(v) => setFormData({ ...formData, grade: v })}>
                                        <SelectTrigger className="bg-white border-stone-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['6', '7', '8', '9', '10', '11', '12'].map(g => <SelectItem key={g} value={g}>{g}-р анги</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-stone-500">Сэдэв</Label>
                                    <Select value={formData.topic} onValueChange={(v) => setFormData({ ...formData, topic: v, subTopic: '' })}>
                                        <SelectTrigger className="bg-white border-stone-200">
                                            <SelectValue placeholder="Сэдэв сонгох..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-stone-500">Дэд сэдэв</Label>
                                    <Select value={formData.subTopic} onValueChange={(v) => setFormData({ ...formData, subTopic: v })}>
                                        <SelectTrigger className="bg-white border-stone-200">
                                            <SelectValue placeholder="Дэд сэдэв сонгох..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSubTopics.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-stone-500">Блүүм түвшин</Label>
                                    <Select value={formData.bloom} onValueChange={(v) => setFormData({ ...formData, bloom: v })}>
                                        <SelectTrigger className="bg-white border-stone-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bloomLevels.map(b => <SelectItem key={b.value} value={b.value}>{b.value}. {b.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-stone-500">Хүндрэл (1-5)</Label>
                                    <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                                        <SelectTrigger className="bg-white border-stone-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5].map(i => <SelectItem key={i} value={i.toString()}>{i}-р зэрэг</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Question Content */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold text-stone-700">Асуултын агуулга</Label>
                            <div className="space-y-2">
                                <Label className="text-xs text-stone-500">Асуултын текст</Label>
                                <Textarea
                                    value={formData.questionText}
                                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                                    className="min-h-[160px] bg-white border-stone-200 focus-visible:ring-stone-400"
                                    placeholder="Асуултын текст... LaTeX \(...\) дэмжинэ."
                                />
                                <ImageUploadSection field="questionImage" label="Асуултын зураг" />
                            </div>
                        </div>

                        {/* Answers/Options Section */}
                        <div className="space-y-6 pt-4 border-t border-stone-100">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Хариулт ба Хувилбарууд</Label>
                                {isMCQ && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase">Зөв хариулт:</span>
                                        <Select value={formData.correctAnswer} onValueChange={(v) => setFormData({ ...formData, correctAnswer: v })}>
                                            <SelectTrigger className="w-16 h-8 text-xs font-bold border-stone-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5].map(i => <SelectItem key={i} value={i.toString()}>{i}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {isMCQ ? (
                                <div className="space-y-4">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="space-y-3 p-4 bg-white border border-stone-100 rounded-lg shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                                                    formData.correctAnswer === i.toString() ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-stone-100 text-stone-400"
                                                )}>
                                                    {i}
                                                </div>
                                                <Input
                                                    value={formData[`opt${i}`]}
                                                    onChange={(e) => setFormData({ ...formData, [`opt${i}`]: e.target.value })}
                                                    placeholder={`Хувилбар ${i}...`}
                                                    className="border-none shadow-none focus-visible:ring-0 p-0 text-sm"
                                                />
                                            </div>
                                            <div className="pl-10">
                                                <ImageUploadSection field={`opt${i}Image`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Input
                                        value={formData.correctAnswer}
                                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                                        className="h-11 bg-white border-stone-200"
                                        placeholder="Зөв хариулт (Тоо эсвэл Текст)..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Solution Section */}
                        <div className="space-y-6 pt-4 border-t border-stone-100">
                            <Label className="text-sm font-semibold text-stone-700">Бодолт ба Тайлбар</Label>
                            <div className="space-y-4">
                                <Textarea
                                    value={formData.solutionText}
                                    onChange={(e) => setFormData({ ...formData, solutionText: e.target.value })}
                                    className="min-h-[120px] bg-white border-stone-200 focus-visible:ring-stone-400"
                                    placeholder="Бодолтын тайлбар..."
                                />
                                <ImageUploadSection field="solutionImage" label="Бодолтын зураг" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Pane */}
                <div className="w-1/2 bg-white flex flex-col p-12 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 mb-10 text-stone-400">
                        <Eye size={16} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Урьдчилан харах</span>
                        <div className="flex-1 border-b border-stone-100" />
                    </div>

                    <div className="max-w-xl mx-auto w-full space-y-10">
                        {/* Meta */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-stone-100 text-stone-600 font-medium text-[10px] px-2 py-0.5 rounded-full">{formData.subject || 'Хичээл'}</Badge>
                                <Badge variant="outline" className="text-stone-400 border-stone-100 text-[10px] px-2 py-0.5 rounded-full">{formData.grade ? `${formData.grade} анги` : 'Анги'}</Badge>
                            </div>
                            <span className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">{formData.topic}</span>
                        </div>

                        {/* Content */}
                        <div className="space-y-8">
                            <div className="text-stone-800 text-lg leading-relaxed font-medium">
                                <LatexRenderer text={formData.questionText || 'Асуултын текст...'} />
                            </div>
                            {formData.questionImage && (
                                <div className="relative w-full h-[300px] rounded-xl shadow-lg border border-stone-100 overflow-hidden">
                                    <NextImage
                                        src={formData.questionImage}
                                        alt="Question"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Answers */}
                        {isMCQ ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={cn(
                                        "flex items-center p-4 rounded-xl border transition-all",
                                        formData.correctAnswer === i.toString() ? "bg-blue-50/50 border-blue-600 shadow-sm" : "bg-white border-stone-100"
                                    )}>
                                        <div className={cn(
                                            "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                            formData.correctAnswer === i.toString() ? "bg-blue-600 text-white shadow-sm" : "bg-stone-100 text-stone-400"
                                        )}>
                                            {i}
                                        </div>
                                        <div className="ml-4 flex-1">
                                            <div className="text-stone-700 font-medium">
                                                <LatexRenderer text={formData[`opt${i}`] || `Хувилбар ${i}`} />
                                            </div>
                                            {formData[`opt${i}Image`] && (
                                                <div className="relative mt-3 h-32 w-full max-w-[200px]">
                                                    <NextImage
                                                        src={formData[`opt${i}Image`]}
                                                        alt={`Opt ${i}`}
                                                        fill
                                                        className="object-contain rounded-lg border border-stone-50"
                                                        sizes="200px"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 bg-stone-50 border border-stone-100 rounded-2xl">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">Зөв хариулт:</span>
                                <div className="text-xl font-bold text-stone-900">
                                    <LatexRenderer text={formData.correctAnswer || '---'} />
                                </div>
                            </div>
                        )}

                        {/* Solution Preview */}
                        {(formData.solutionText || formData.solutionImage) && (
                            <div className="pt-10 border-t border-stone-100 space-y-4">
                                <span className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em] block">Бодолт</span>
                                <div className="text-sm text-stone-600 leading-relaxed">
                                    <LatexRenderer text={formData.solutionText} />
                                    {formData.solutionImage && (
                                        <div className="relative mt-6 w-full h-[400px]">
                                            <NextImage
                                                src={formData.solutionImage}
                                                alt="Solution"
                                                fill
                                                className="object-contain rounded-xl"
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QuestionEditorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
            <EditorContent />
        </Suspense>
    );
}

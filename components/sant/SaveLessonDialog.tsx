'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SaveLessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: { title: string; subject: string; grade: string }) => void;
}

export default function SaveLessonDialog({ open, onOpenChange, onSave }: SaveLessonDialogProps) {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [grade, setGrade] = useState('');

    const handleSubmit = () => {
        if (!title || !subject || !grade) return;
        onSave({ title, subject, grade });
        onOpenChange(false);
        // Reset
        setTitle('');
        setSubject('');
        setGrade('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Хичээл хадгалах</DialogTitle>
                    <DialogDescription>
                        Бэлтгэсэн хичээлээ загвар болгон хадгалах.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Хичээлийн сэдэв / Нэр</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Жишээ: Ньютоны хууль" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Хичээл</Label>
                            <Select value={subject} onValueChange={setSubject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Физик">Физик</SelectItem>
                                    <SelectItem value="Математик">Математик</SelectItem>
                                    <SelectItem value="Хими">Хими</SelectItem>
                                    <SelectItem value="Газарзүй">Газарзүй</SelectItem>
                                    <SelectItem value="Бусад">Бусад</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Анги</Label>
                            <Select value={grade} onValueChange={setGrade}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[6, 7, 8, 9, 10, 11, 12].map(g => (
                                        <SelectItem key={g} value={String(g)}>{g}-р анги</SelectItem>
                                    ))}
                                    <SelectItem value="Бусад">Бусад</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Болих</Button>
                    <Button onClick={handleSubmit} disabled={!title || !subject || !grade}>Хадгалах</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

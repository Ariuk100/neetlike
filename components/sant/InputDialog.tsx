'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface InputDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    multiline?: boolean;
    onSubmit: (value: string) => void;
}

export default function InputDialog({
    open,
    onOpenChange,
    title,
    placeholder = '',
    defaultValue = '',
    multiline = false,
    onSubmit
}: InputDialogProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset value when dialog opens with new defaultValue
    useEffect(() => {
        if (open) {
            setValue(defaultValue);
            // Focus input after dialog opens
            setTimeout(() => {
                if (multiline) {
                    textareaRef.current?.focus();
                    textareaRef.current?.select();
                } else {
                    inputRef.current?.focus();
                    inputRef.current?.select();
                }
            }, 100);
        }
    }, [open, defaultValue, multiline]);

    const handleSubmit = () => {
        if (value.trim()) {
            onSubmit(value.trim());
            onOpenChange(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Enter' && e.ctrlKey && multiline) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {multiline ? (
                        <Textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="min-h-[100px]"
                        />
                    ) : (
                        <Input
                            ref={inputRef}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Болих
                    </Button>
                    <Button onClick={handleSubmit} disabled={!value.trim()}>
                        Хадгалах
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

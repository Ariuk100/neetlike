'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react';

// Font options
const FONTS = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Comic Sans MS', label: 'Comic Sans' },
];

// Font sizes
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

// Colors
const TEXT_COLORS = [
    '#000000', // Black
    '#FFFFFF', // White
    '#DC2626', // Red
    '#2563EB', // Blue
    '#16A34A', // Green
    '#CA8A04', // Yellow
    '#9333EA', // Purple
    '#DB2777', // Pink
    '#EA580C', // Orange
    '#0F766E', // Teal
];

// Animation options
const ANIMATIONS = [
    { value: 'none', label: 'Байхгүй' },
    { value: 'fadeIn', label: 'Fade In' },
    { value: 'slideLeft', label: 'Зүүнээс орох' },
    { value: 'slideRight', label: 'Баруунаас орох' },
    { value: 'slideUp', label: 'Доороос орох' },
    { value: 'slideDown', label: 'Дээрээс орох' },
    { value: 'zoomIn', label: 'Томроод орох' },
    { value: 'bounce', label: 'Bounce' },
];

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    textAlign: 'left' | 'center' | 'right';
}

interface TextFormatToolbarProps {
    style: TextStyle;
    animation: string;
    onStyleChange: (style: Partial<TextStyle>) => void;
    onAnimationChange: (animation: string) => void;
}

export default function TextFormatToolbar({
    style,
    animation,
    onStyleChange,
    onAnimationChange
}: TextFormatToolbarProps) {
    return (
        <div
            className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-stone-200 px-3 py-2 flex items-center gap-2 z-30"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Font Family */}
            <Select
                value={style.fontFamily}
                onValueChange={(value) => onStyleChange({ fontFamily: value })}
            >
                <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {FONTS.map((font) => (
                        <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Font Size */}
            <Select
                value={String(style.fontSize)}
                onValueChange={(value) => onStyleChange({ fontSize: parseInt(value) })}
            >
                <SelectTrigger className="w-16 h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {FONT_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                            {size}px
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Divider */}
            <div className="h-6 w-px bg-stone-200" />

            {/* Color Picker */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded"
                    >
                        <div
                            className="w-5 h-5 rounded border border-stone-300"
                            style={{ backgroundColor: style.color }}
                        />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-fit p-2" side="top">
                    <div className="grid grid-cols-5 gap-1">
                        {TEXT_COLORS.map((color) => (
                            <button
                                key={color}
                                className={`w-6 h-6 rounded border ${style.color === color ? 'ring-2 ring-blue-500' : 'border-stone-200'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => onStyleChange({ color })}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Divider */}
            <div className="h-6 w-px bg-stone-200" />

            {/* Bold */}
            <Button
                variant={style.bold ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded"
                onClick={() => onStyleChange({ bold: !style.bold })}
            >
                <Bold className="w-4 h-4" />
            </Button>

            {/* Italic */}
            <Button
                variant={style.italic ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded"
                onClick={() => onStyleChange({ italic: !style.italic })}
            >
                <Italic className="w-4 h-4" />
            </Button>

            {/* Underline */}
            <Button
                variant={style.underline ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded"
                onClick={() => onStyleChange({ underline: !style.underline })}
            >
                <Underline className="w-4 h-4" />
            </Button>

            {/* Divider */}
            <div className="h-6 w-px bg-stone-200" />

            {/* Alignment */}
            <div className="flex">
                <Button
                    variant={style.textAlign === 'left' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-l rounded-r-none"
                    onClick={() => onStyleChange({ textAlign: 'left' })}
                >
                    <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                    variant={style.textAlign === 'center' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-none border-x-0"
                    onClick={() => onStyleChange({ textAlign: 'center' })}
                >
                    <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                    variant={style.textAlign === 'right' ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 rounded-r rounded-l-none"
                    onClick={() => onStyleChange({ textAlign: 'right' })}
                >
                    <AlignRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-stone-200" />

            {/* Animation */}
            <Select
                value={animation || 'none'}
                onValueChange={onAnimationChange}
            >
                <SelectTrigger className="w-32 h-8 text-xs">
                    <Palette className="w-3 h-3 mr-1" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {ANIMATIONS.map((anim) => (
                        <SelectItem key={anim.value} value={anim.value}>
                            {anim.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

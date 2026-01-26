import { MousePointer2, Pen, Eraser, ImageIcon, Trash2, ChevronDown, Plus, Video, Zap, Gamepad2, Flag, HelpCircle } from "lucide-react";
import React from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, FilePlus, FileX, Globe } from "lucide-react";

interface ToolbarProps {
    tool: 'pen' | 'eraser' | 'cursor' | 'laser';
    setTool: (tool: 'pen' | 'eraser' | 'cursor' | 'laser') => void;
    color: string;
    setColor: (color: string) => void;
    width: number;
    setWidth: (width: number) => void;
    onImageUpload: () => void;
    onVideoUpload?: () => void;
    onClear: () => void;
    isUploading?: boolean;
    className?: string; // Allow custom styles
    // Page props
    currentPage: number;
    totalPages: number;
    onAddPage: () => void;
    onDeletePage: () => void;
    onNavigatePage: (delta: number) => void;
    onAddWidget?: (type: string) => void;
}

export default function Toolbar({
    tool,
    setTool,
    color,
    setColor,
    width,
    setWidth,
    onImageUpload,
    onVideoUpload,
    onClear,
    isUploading,
    className = "",
    currentPage,
    totalPages,
    onAddPage,
    onDeletePage,

    onNavigatePage,
    onAddWidget
}: ToolbarProps) {
    const toolIcons = {
        cursor: MousePointer2,
        pen: Pen,
        eraser: Eraser,
        laser: Zap,
    };

    const toolLabels = {
        cursor: 'Хулгана',
        pen: 'Үзэг',
        eraser: 'Баллуур',
        laser: 'Лазер'
    };

    const ToolIcon = toolIcons[tool];

    const COLORS = [
        '#000000', '#DC2626', '#2563EB', '#16A34A', '#CA8A04',
        '#EA580C', '#9333EA', '#DB2777', '#0F766E', '#4B5563',
    ];

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 h-10 overflow-x-auto max-w-full no-scrollbar ${className || 'bg-white rounded-lg shadow-sm border border-gray-200'}`}>
            <div className="flex items-center gap-2 min-w-max">

                {/* Tools Dropdown - Consolidated */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 p-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border-none bg-transparent">
                            <ToolIcon className="w-4 h-4 text-blue-600" />
                            <span className="hidden sm:inline">{toolLabels[tool]}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-3">
                        <DropdownMenuLabel className="pb-2">Багаж сонгох</DropdownMenuLabel>
                        <div className="grid grid-cols-2 gap-2 pb-2">
                            <button
                                onClick={() => setTool('cursor')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all ${tool === 'cursor' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-gray-50 border-gray-100'}`}
                            >
                                <MousePointer2 className="w-4 h-4" />
                                <span className="text-[10px]">Хулгана</span>
                            </button>
                            <button
                                onClick={() => setTool('pen')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all ${tool === 'pen' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-gray-50 border-gray-100'}`}
                            >
                                <Pen className="w-4 h-4" />
                                <span className="text-[10px]">Үзэг</span>
                            </button>
                            <button
                                onClick={() => setTool('eraser')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all ${tool === 'eraser' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-gray-50 border-gray-100'}`}
                            >
                                <Eraser className="w-4 h-4" />
                                <span className="text-[10px]">Баллуур</span>
                            </button>
                            <button
                                onClick={() => setTool('laser')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all ${tool === 'laser' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-gray-50 border-gray-100'}`}
                            >
                                <Zap className="w-4 h-4" />
                                <span className="text-[10px]">Лазер</span>
                            </button>
                        </div>

                        <DropdownMenuSeparator className="my-2" />

                        <DropdownMenuLabel className="pb-2">Өнгө</DropdownMenuLabel>
                        <div className="grid grid-cols-5 gap-2 pb-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setColor(c);
                                    }}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-blue-500 scale-110 shadow-sm' : 'border-gray-200 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <DropdownMenuSeparator className="my-2" />

                        <DropdownMenuLabel className="pb-2 flex justify-between items-center">
                            <span>Хэмжээ</span>
                            <span className="text-xs font-normal text-gray-500">{width}px</span>
                        </DropdownMenuLabel>
                        <div className="px-1 pb-1">
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={width}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    setWidth(Number(e.target.value));
                                }}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Insert Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 p-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border-none bg-transparent">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Insert</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={onImageUpload} disabled={isUploading} className="flex items-center gap-2 cursor-pointer">
                            <ImageIcon className="w-4 h-4" />
                            <span>Зураг</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onVideoUpload} className="flex items-center gap-2 cursor-pointer">
                            <Video className="w-4 h-4" />
                            <span>Видео</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddWidget && onAddWidget('simulation')} className="flex items-center gap-2 cursor-pointer">
                            <Globe className="w-4 h-4" />
                            <span>Simulation / Embed</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Games Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 p-1.5 rounded-md hover:bg-gray-100 text-gray-700 font-medium text-sm transition-colors border-none bg-transparent">
                            <Gamepad2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Games</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel className="text-xs">Тоглоомууд</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAddWidget && onAddWidget('optics_game')} className="flex items-center gap-2 cursor-pointer">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span>Оптик</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddWidget && onAddWidget('photon_race_game')} className="flex items-center gap-2 cursor-pointer">
                            <Flag className="w-4 h-4 text-orange-500" />
                            <span>Фотон уралдаан</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddWidget && onAddWidget('quiz_game')} className="flex items-center gap-2 cursor-pointer">
                            <HelpCircle className="w-4 h-4 text-purple-500" />
                            <span>Quiz Game</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={onClear}
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                    title="Цэвэрлэх"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Page Management */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                    <button
                        onClick={() => onNavigatePage(-1)}
                        disabled={currentPage === 0}
                        className="p-1 rounded-sm hover:bg-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-2 py-0.5 text-xs font-bold hover:bg-white rounded-sm min-w-[60px]">
                                {currentPage + 1} / {totalPages}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-40">
                            <DropdownMenuLabel>Хуудас удирдах</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onAddPage} className="flex items-center gap-2 cursor-pointer text-blue-600">
                                <FilePlus className="w-4 h-4" />
                                <span>Шинэ хуудас</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={onDeletePage}
                                disabled={totalPages <= 1}
                                className="flex items-center gap-2 cursor-pointer text-red-600"
                            >
                                <FileX className="w-4 h-4" />
                                <span>Хуудас устгах</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="max-h-40 overflow-y-auto p-1">
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <DropdownMenuItem
                                        key={i}
                                        onClick={() => onNavigatePage(i - currentPage)}
                                        className={`flex items-center justify-between cursor-pointer ${currentPage === i ? 'bg-blue-50 text-blue-600' : ''}`}
                                    >
                                        <span>Хуудас {i + 1}</span>
                                        {currentPage === i && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                        onClick={() => onNavigatePage(1)}
                        disabled={currentPage === totalPages - 1}
                        className="p-1 rounded-sm hover:bg-white disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

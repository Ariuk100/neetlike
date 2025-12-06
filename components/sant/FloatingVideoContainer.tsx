'use client';

import { useState, useRef } from 'react';
import { X, GripHorizontal, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FloatingVideoContainer() {
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [visible, setVisible] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    if (!visible) {
        return (
            <Button
                className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
                onClick={() => setVisible(true)}
            >
                <Video className="w-4 h-4 mr-2" />
                Video
            </Button>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                touchAction: 'none',
            }}
            className="fixed z-50 top-0 left-0 bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl w-64 h-48 border border-white/20 select-none flex flex-col"
        >
            {/* Drag Handle */}
            <div
                className="h-8 bg-white/10 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <GripHorizontal className="text-white/50 w-4 h-4" />
                <button onClick={() => setVisible(false)} className="text-white/50 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-white/50 text-xs gap-2">
                <Video className="w-8 h-8 opacity-50" />
                <p>Google Meet-ийн PIP цонхыг энд байрлуулна уу.</p>
                <p className="opacity-50 text-[10px]">(Багшийн царайг харах хэсэг)</p>
            </div>
        </div>
    );
}

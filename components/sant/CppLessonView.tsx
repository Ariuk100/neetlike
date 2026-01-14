'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Code, Box, GitFork, RotateCw, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Concepts and Data
const LESSON_SLIDES = [
    {
        id: 'program',
        title: 'Програм гэж юу вэ?',
        subtitle: 'Компьютерт өгөх заавар',
        content: "Хоолны жор шиг, програм бол компьютерт юу хийхийг алхам алхмаар зааж өгдөг зааварчилгаа юм. Робот тогооч таны бичсэн жороор хоол хийдэгтэй адил.",
        image: '/sant/lessons/program.png',
        icon: Terminal,
        color: 'from-orange-400 to-red-500'
    },
    {
        id: 'algorithm',
        title: 'Алгоритм гэж юу вэ?',
        subtitle: 'Асуудал шийдэх алхмууд',
        content: "Аливаа ажлыг хийх дараалал. Жишээ нь: Өглөө босох -> Шүдээ угаах -> Цайгаа уух. Энэ бол таны өглөөний алгоритм юм.",
        image: '/sant/lessons/algorithm.png',
        icon: GitFork,
        color: 'from-blue-400 to-indigo-500'
    },
    {
        id: 'languages',
        title: 'Програмчлалын хэлнүүд',
        subtitle: 'Бид компьютертэй хэрхэн ярилцдаг вэ?',
        content: "Хүн бүр өөр хэлээр ярьдаг шиг компьютер ч олон хэлтэй. Python (Могой), Java (Кофе), C++ (Робот) гэх мэт. C++ бол маш хүчирхэг хэл!",
        image: '/sant/lessons/languages.png', // New Tree Image
        icon: Box,
        color: 'from-green-400 to-emerald-600'
    },
    {
        id: 'cpp_intro',
        title: 'C++ Хэл',
        subtitle: 'Хүчирхэг бөгөөд Хурдан',
        content: "C++ хэлийг тоглоом бүтээх, пуужин хөөргөх, робот удирдах зэрэгт ашигладаг. Энэ хэл нь компьютерын 'тархи'-тай шууд харьцдаг учраас маш хурдан.",
        image: '/sant/lessons/cpp_logo.png', // New Rocket Image
        icon: Code,
        color: 'from-blue-600 to-cyan-400'
    },
    {
        id: 'syntax',
        title: 'Кодны Бүтэц (Syntax)',
        subtitle: 'C++ хэлний дүрэм',
        content: "Монгол хэлэнд өгүүлбэр бүр цэгээр дуусдаг шиг, C++ хэлэнд үйлдэл бүр цэгтэй таслал (;) -аар дуусдаг.",
        image: '/sant/lessons/syntax.png', // New Brick Image
        code: `#include <iostream> // Номын сан
using namespace std;

int main() { // Эхлэх цэг
    cout << "Сайн уу!"; // Хэвлэх
    return 0; // Дуусгах
}`,
        icon: Terminal,
        color: 'from-slate-500 to-zinc-500'
    },
    {
        id: 'intro',
        title: 'C++ Үндсэн Ойлголтууд',
        subtitle: 'Бид юу сурах вэ?',
        content: "Өнөөдөр бид дараах 4 чухал зүйлийг үзнэ: 1. Хувьсагч (Сав), 2. Нөхцөл (Уулзвар), 3. Давталт (Тойрог), 4. Оролт/Гаралт.",
        image: '/sant/lessons/robot.png',
        icon: Terminal,
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'variables',
        title: '1. Хувьсагч (Variables)',
        subtitle: 'Мэдээлэл хадгалах сав',
        content: "Хувьсагч бол мэдээлэл хадгалах 'Хайрцаг' юм. int хайрцагт тоо, string хайрцагт үг хийнэ.",
        image: '/sant/lessons/variables.png',
        icon: Box,
        color: 'from-purple-500 to-pink-500',
        code: `int age = 12;
string name = "Bat";

cout << name << " is " << age;`
    },
    {
        id: 'lab1',
        title: 'Лаб 1: Нас Тооцоологч',
        subtitle: 'Оролт ба Гаралт',
        content: "Хэрэглэгчээс төрсөн оныг нь асууж, насыг нь тооцоолж хэвлэцгээе!",
        image: '/sant/lessons/lab1.png', // New Abacus Image
        code: `int turuh_jil;
cout << "Чи хэдэн онд төрсөн бэ? ";
cin >> turuh_jil;

int nas = 2026 - turuh_jil;
cout << "Чи одоо " << nas << " настай!";`,
        icon: Code,
        color: 'from-green-500 to-emerald-500',
        isLab: true
    },
    {
        id: 'condition',
        title: 'Нөхцөл Шалгах (If/Else)',
        subtitle: 'Зөв замыг сонгох',
        content: "Програм нөхцөл шалгаж, үнэн бол нэг замаар, худал бол өөр замаар явдаг.",
        image: '/sant/lessons/ifelse.png',
        icon: GitFork,
        color: 'from-orange-500 to-amber-500',
        code: `if (rain == true) {
    cout << "Шүхэр ав!";
} else {
    cout << "Малгай өмс!";
}`
    },
    {
        id: 'lab2',
        title: 'Лаб 2: Нууц Үг',
        subtitle: 'Хамгаалалтын систем',
        content: "Нууц үг зөв эсэхийг шалгадаг програм бичье.",
        image: '/sant/lessons/lab2.png', // New Lock Image
        code: `int password;
cout << "Нууц үгээ оруул: ";
cin >> password;

if (password == 1234) {
    cout << "Нэвтэрлээ! ✅";
} else {
    cout << "Буруу байна! ❌";
}`,
        icon: Code,
        color: 'from-red-500 to-rose-500',
        isLab: true
    },
    {
        id: 'loop',
        title: 'Давталт (Loop)',
        subtitle: 'Залхуурахгүйгээр ажиллах',
        content: "Компьютер нэг үйлдлийг сая удаа ч алдаагүй хийж чадна. Энэ бол давталт юм.",
        image: '/sant/lessons/loop.png',
        icon: RotateCw,
        color: 'from-indigo-500 to-blue-600',
        code: `for (int i = 1; i <= 5; i++) {
    cout << "Тойрог " << i << endl;
}`
    },
    {
        id: 'lab3',
        title: 'Лаб 3: Пуужин Хөөрлөө',
        subtitle: 'Countdown Timer',
        content: "10-аас доош тоолоод пуужин хөөргөе!",
        image: '/sant/lessons/lab3.png', // New Stopwatch Image
        code: `for (int i = 10; i >= 1; i--) {
    cout << i << "..." << endl;
}
cout << "🚀 ПУУЖИН ХӨӨРЛӨӨ!";`,
        icon: Code,
        color: 'from-violet-600 to-purple-600',
        isLab: true
    }
];

interface CppLessonViewProps {
    slideIndex: number;
    onSlideChange: (index: number) => void;
    isTeacher: boolean;
}

export default function CppLessonView({ slideIndex, onSlideChange, isTeacher }: CppLessonViewProps) {
    const currentSlide = Math.min(Math.max(0, slideIndex), LESSON_SLIDES.length - 1);
    const slide = LESSON_SLIDES[currentSlide];

    const nextSlide = () => isTeacher && onSlideChange(Math.min(currentSlide + 1, LESSON_SLIDES.length - 1));
    const prevSlide = () => isTeacher && onSlideChange(Math.max(0, currentSlide - 1));

    return (
        <div className="h-full w-full flex flex-col bg-slate-900 text-white overflow-hidden relative">
            {/* Background Gradients */}
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br ${slide.color} opacity-20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 transition-colors duration-1000`} />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* Navigation Bar */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 z-10 bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-gradient-to-br", slide.color)}>
                        <slide.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-wide">{slide.title}</span>
                </div>

                <div className="flex items-center gap-2">
                    {isTeacher ? (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={prevSlide}
                                disabled={currentSlide === 0}
                                className="text-slate-400 hover:text-white hover:bg-white/10"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <span className="text-sm font-mono text-slate-400 min-w-[60px] text-center">
                                {currentSlide + 1} / {LESSON_SLIDES.length}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={nextSlide}
                                disabled={currentSlide === LESSON_SLIDES.length - 1}
                                className="text-slate-400 hover:text-white hover:bg-white/10"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </>
                    ) : (
                        <span className="text-sm font-mono text-slate-400 min-w-[60px] text-center">
                            Slide {currentSlide + 1} / {LESSON_SLIDES.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 z-10 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                    >
                        {/* Text & Code Side */}
                        <div className="space-y-8">
                            <div>
                                <h1 className="text-4xl lg:text-5xl font-black mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                    {slide.subtitle}
                                </h1>
                                <p className="text-lg lg:text-xl text-slate-300 leading-relaxed">
                                    {slide.content}
                                </p>
                            </div>

                            {slide.code && (
                                <div className="relative group">
                                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${slide.color} opacity-30 group-hover:opacity-50 blur rounded-2xl transition duration-500`} />
                                    <div className="relative bg-slate-950 rounded-xl border border-white/10 p-6 shadow-2xl">
                                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                                            <div className="flex gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                            </div>
                                            <span className="text-xs text-slate-500 font-mono ml-2">main.cpp</span>
                                        </div>
                                        <pre className="font-mono text-sm lg:text-base leading-relaxed overflow-x-auto text-blue-200">
                                            <code>{slide.code}</code>
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {slide.isLab && (
                                <Button className={`w-full h-12 text-lg font-bold bg-gradient-to-r ${slide.color} hover:opacity-90 transition-all shadow-lg`}>
                                    <Play className="w-5 h-5 mr-2 fill-current" />
                                    Код бичиж турших
                                </Button>
                            )}
                        </div>

                        {/* Visual Side */}
                        <div className="relative flex justify-center items-center">
                            {slide.image ? (
                                <div className="relative w-full aspect-square max-w-[500px]">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-20 blur-[80px] rounded-full`} />
                                    <Image
                                        src={slide.image}
                                        alt={slide.title}
                                        fill
                                        className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            ) : (
                                <div className="w-full aspect-square max-w-[400px] flex items-center justify-center bg-white/5 rounded-3xl border border-white/10">
                                    <Code className={`w-32 h-32 text-slate-600`} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

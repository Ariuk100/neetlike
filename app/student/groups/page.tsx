// app/student/groups/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, Users, PlayCircle, Home, LayoutGrid } from 'lucide-react'; // Home болон LayoutGrid иконыг импортлосон
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton'; // Skeleton компонент
import { Button } from '@/components/ui/button'; // Button компонент
import Link from 'next/link'; // Link компонентыг импортлосон

// 🎨 PhysX Өнгөний Палитр
const PHYSX_COLORS = {
  primaryBg: 'bg-[#F0F2F5]', // Цайвар саарал дэвсгэр
  cardBg: 'bg-white', // Картны дэвсгэр
  textPrimary: 'text-gray-800', // Үндсэн текст
  textSecondary: 'text-gray-600', // Хоёрдогч текст
  textAccent1: 'text-[#00BFFF]', // Цахилгаан хөх
  textAccent2: 'text-[#64FFDA]', // Цахилгаан ногоон
  textAccent3: 'text-[#8A2BE2]', // Хар ягаан
  buttonBg: 'bg-[#00BFFF]', // Товчны дэвсгэр (accent1-тэй ижил)
  buttonHoverBg: 'hover:bg-blue-700', // Товчны hover өнгө
  buttonText: 'text-white', // Товчны текст
};


// Бүлгийн жишээ дата - Одоо физикийн сэдвүүдээр
interface Group {
  id: string;
  title: string;
  description: string;
  subUnits: number; // Дэд бүлэг
  problems: number; // Даалгавар/Бодлого
  videos: number; // Видео хичээл
}

const sampleGroups: Group[] = [
  {
    id: 'mechanics',
    title: '1. Механик',
    description: 'Биесийн хөдөлгөөн, үйлчлэлцэл, хуулиудыг судална. Кинематик, динамик, статик, хадгалагдах хуулиуд багтана.',
    subUnits: 10,
    problems: 250,
    videos: 15,
  },
  {
    id: 'molecular_thermal',
    title: '2. Молекул физик, Дулааны үзэгдэл',
    description: 'Материйн бүтэц, дулааны тэнцвэр, термодинамикийн үндсэн хуулиудыг гүнзгийрүүлэн судална.',
    subUnits: 8,
    problems: 180,
    videos: 12,
  },
  {
    id: 'electrodynamics',
    title: '3. Электродинамик',
    description: 'Цахилгаан ба соронзон орны үндсэн ойлголтууд, хуулиуд, цахилгаан гүйдэл, соронзон индукцийг судална.',
    subUnits: 12,
    problems: 300,
    videos: 20,
  },
  {
    id: 'optics',
    title: '4. Оптик',
    description: 'Гэрлийн шинж чанар, тусгал, хугарал, дифракци, интерференцийг судалж, оптик багажуудтай танилцана.',
    subUnits: 6,
    problems: 120,
    videos: 8,
  },
  {
    id: 'atomic_nuclear',
    title: '5. Атомын болон Цөмийн физик',
    description: 'Атомын бүтэц, цөмийн шинж чанар, радиоидэвхт чанар, цөмийн урвалыг судална.',
    subUnits: 7,
    problems: 90,
    videos: 10,
  },
];

export default function StudentGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Intersection Observer states and refs for fade-in effect
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [groupVisibilities, setGroupVisibilities] = useState<boolean[]>([]);

  useEffect(() => {
    // Live data татах логикийг энд нэмнэ. Одоогоор жишээ дата ашиглаж байна.
    setGroups(sampleGroups);
    setLoading(false);
    setGroupVisibilities(new Array(sampleGroups.length).fill(false)); // Бүх бүлгийг эхлээд харагдахгүй болгоно
  }, []);

  useEffect(() => {
    if (loading || groups.length === 0) return;

    const observerOptions: IntersectionObserverInit = { // Интерфейсийг тодорхой заасан
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observers: IntersectionObserver[] = [];

    groupRefs.current.forEach((ref: HTMLDivElement | null, index: number) => { // Хувьсагчдын төрлийг тодорхой заасан
      if (ref) {
        const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => { // Entry-ийн төрлийг тодорхой заасан
          entries.forEach((entry: IntersectionObserverEntry) => { // Entry-ийн төрлийг тодорхой заасан
            if (entry.isIntersecting) {
              setGroupVisibilities((prev: boolean[]) => { // prev-ийн төрлийг тодорхой заасан
                const newVisibilities = [...prev];
                newVisibilities[index] = true;
                return newVisibilities;
              });
              // observer.unobserve(entry.target); // Нэг удаа ажиллах бол үүнийг идэвхжүүлнэ
            } else {
              setGroupVisibilities((prev: boolean[]) => { // prev-ийн төрлийг тодорхой заасан
                const newVisibilities = [...prev];
                newVisibilities[index] = false;
                return newVisibilities;
              });
            }
          });
        }, observerOptions);
        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [loading, groups]);


  return (
    <div className={`min-h-screen ${PHYSX_COLORS.primaryBg} p-4 pt-20`}> {/* Дэвсгэр өнгийг PHYSX_COLORS.primaryBg-оос авна */}
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb / Path indicator */}
        <div className={`text-sm ${PHYSX_COLORS.textSecondary} mb-6 flex items-center`}> {/* Хоёрдогч текстийн өнгийг PHYSX_COLORS.textSecondary-оос авна */}
          <Link href="/" className={`flex items-center hover:${PHYSX_COLORS.textAccent1} transition-colors duration-200`}> {/* Акцент өнгийг PHYSX_COLORS.textAccent1-ээс авна */}
            <Home size={16} className="mr-1" /> Нүүр хуудас
          </Link>
          <span className="mx-2">/</span>
          <span className={`font-semibold ${PHYSX_COLORS.textPrimary}`}>Бүлгүүд</span> {/* Үндсэн текстийн өнгийг PHYSX_COLORS.textPrimary-аас авна */}
        </div>

        <h1 className={`text-3xl font-bold ${PHYSX_COLORS.textPrimary} mb-8 text-center flex items-center justify-center gap-3`}> {/* Icon-ыг нэмэхийн тулд justify-center, gap-3-г нэмсэн */}
          <LayoutGrid size={32} className={`${PHYSX_COLORS.textAccent1}`} /> {/* Icon нэмсэн */}
          Бүлгүүд
        </h1> {/* Үндсэн текстийн өнгийг PHYSX_COLORS.textPrimary-аас авна */}

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_: unknown, i: number) => ( // '_' хувьсагчид unknown төрлийг заасан
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group: Group, index: number) => ( // group болон index-ийн төрлийг тодорхой заасан
              <motion.div
                key={group.id}
                ref={(el: HTMLDivElement | null) => { // Ref callback-ийн буцаах утга void байна
                  groupRefs.current[index] = el;
                  return; // Засвар: void буцаана
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={groupVisibilities[index] ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`flex flex-col md:flex-row items-center p-6 space-y-4 md:space-y-0 md:space-x-6 ${PHYSX_COLORS.cardBg} rounded-lg shadow-lg hover:shadow-xl transition-all duration-300`}> {/* Картны дэвсгэр өнгийг PHYSX_COLORS.cardBg-оос авна */}
                  <div className={`flex-shrink-0 ${PHYSX_COLORS.textAccent1}`}> {/* Иконы өнгийг PHYSX_COLORS.textAccent1-ээс авна */}
                    <BookOpen size={48} /> {/* Иконыг томруулсан */}
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <CardTitle className={`text-xl font-semibold ${PHYSX_COLORS.textPrimary} mb-2`}>{group.title}</CardTitle> {/* Үндсэн текстийн өнгийг PHYSX_COLORS.textPrimary-аас авна */}
                    <CardDescription className={`text-sm ${PHYSX_COLORS.textSecondary} mb-4`}>{group.description}</CardDescription> {/* Хоёрдогч текстийн өнгийг PHYSX_COLORS.textSecondary-оос авна */}
                    <CardContent className={`p-0 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2 text-sm ${PHYSX_COLORS.textSecondary}`}> {/* Хоёрдогч текстийн өнгийг PHYSX_COLORS.textSecondary-оос авна */}
                      <span className="flex items-center gap-1">
                        <BookOpen size={16} className={`${PHYSX_COLORS.textAccent1}`} /> {group.subUnits} дэд бүлэг {/* Иконы өнгийг PHYSX_COLORS.textAccent1-ээс авна */}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={16} className={`${PHYSX_COLORS.textAccent2}`} /> {group.problems} даалгавар/бодлого {/* Иконы өнгийг PHYSX_COLORS.textAccent2-оос авна */}
                      </span>
                      <span className="flex items-center gap-1">
                        <PlayCircle size={16} className={`${PHYSX_COLORS.textAccent3}`} /> {group.videos} видео хичээл {/* Иконы өнгийг PHYSX_COLORS.textAccent3-ээс авна */}
                      </span>
                    </CardContent>
                  </div>
                  <Button className={`flex-shrink-0 ${PHYSX_COLORS.buttonBg} ${PHYSX_COLORS.buttonHoverBg} ${PHYSX_COLORS.buttonText} px-6 py-2 rounded-full shadow-md`}> {/* Товчны өнгийг PHYSX_COLORS.buttonBg, hover өнгийг PHYSX_COLORS.buttonHoverBg, текстийн өнгийг PHYSX_COLORS.buttonText-ээс авна */}
                    Дэлгэрэнгүй
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

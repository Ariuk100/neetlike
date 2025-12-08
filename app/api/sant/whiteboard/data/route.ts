import { NextResponse } from 'next/server';

export const DUMMY_DATA = {
    classes: ['9А', '9Б', '9В', '9Г'],
    // Assign teachers to classes. Key = ClassName, Value = TeacherCode
    // TEACH01 -> 9A, 9B; TEACH02 -> 9C; TEACH03 -> 9D (Example)
    teacherAssignments: {
        '9А': 'TEACH01',
        '9Б': 'TEACH01',
        '9В': 'TEACH01',
        '9Г': 'ARIUNBOLD.G',
    },
    // Mock students
    students: {
        '9А': ['Bat-Erdene', 'Bold', 'Saruul', 'Tsetseg'],
        '9Б': ['Anar', 'Bilguun', 'Khulan', 'Naran'],
        '9В': ['Temuulen', 'Zolboo'],
        '9Г': [
            'Алтантүрүү', 'Анир', 'Анужин', 'Анузаяа', 'Батмөнх', 'Бүжинлхам',
            'Есөн', 'Ивээлт', 'Мишээл', 'Мөнх-Од', 'Мөнх-Эрдэнэ', 'Мөнхтулга',
            'Наранбаатар', 'Саранцацрал', 'Содномдорж', 'Суубилгүүн', 'Тамир',
            'Тэргэл', 'Түвшинbilэг', 'Ургахнаран', 'Хангарьд', 'Чинхүслэн',
            'Энхзаяа', 'Энхмөнх', 'М.Энэрэл', 'Эрхэс', 'Үржинтэлмүүн',
            'Бямбацог', 'Энэрэл', 'Бадмаараг'
        ]
    }
};

export async function GET() {
    return NextResponse.json(DUMMY_DATA);
}

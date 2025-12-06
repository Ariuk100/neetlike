import { NextResponse } from 'next/server';

export const DUMMY_DATA = {
    classes: ['9A', '9B', '9C', '9D'],
    // Assign teachers to classes. Key = ClassName, Value = TeacherCode
    // TEACH01 -> 9A, 9B; TEACH02 -> 9C; TEACH03 -> 9D (Example)
    teacherAssignments: {
        '9A': 'TEACH01',
        '9B': 'TEACH01',
        '9C': 'TEACH02',
        '9D': 'TEACH03',
    },
    // Mock students
    students: {
        '9A': ['Bat-Erdene', 'Bold', 'Saruul', 'Tsetseg'],
        '9B': ['Anar', 'Bilguun', 'Khulan', 'Naran'],
        '9C': ['Gantulga', 'Enkhjin', 'Munkh-Od'],
        '9D': ['Temuulen', 'Zolboo'],
    }
};

export async function GET() {
    return NextResponse.json(DUMMY_DATA);
}

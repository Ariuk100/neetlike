import { NextResponse } from 'next/server';

// Harcoded teachers
const TEACHERS = [
    { code: 'TEACH01', name: 'Багш 1' },
    { code: 'TEACH02', name: 'Багш 2' },
    { code: 'ARIUNBOLD.G', name: 'Ариунbold.G' },
];

export async function POST(req: Request) {
    try {
        const { code } = await req.json();

        const teacher = TEACHERS.find((t) => t.code === code);

        if (teacher) {
            return NextResponse.json({ success: true, teacher });
        } else {
            return NextResponse.json({ success: false, message: 'Код буруу байна' }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
    }
}

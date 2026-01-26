import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const usersSnapshot = await adminFirestore.collection('users').get();

        interface UserInfo {
            fullName: string;
            email: string;
            role?: string;
        }

        const students: Record<string, UserInfo[]> = {};
        const teachers: UserInfo[] = [];
        const classes = new Set<string>();

        // To keep track of processed names to avoid duplicates
        const seenNames = new Set<string>();

        usersSnapshot.forEach((doc) => {
            const data = doc.data();
            const fullName = (data.fullDisplay || `${data.lastName || ''} ${data.firstName || ''}`).trim();
            const email = data.email?.toLowerCase().trim();
            const role = data.role;

            if (!email || !fullName) return;

            if (role === 'student') {
                const studentClass = data.class || 'Unknown';
                const key = `student-${studentClass}-${fullName}`;
                if (seenNames.has(key)) return;
                seenNames.add(key);

                classes.add(studentClass);
                if (!students[studentClass]) {
                    students[studentClass] = [];
                }
                students[studentClass].push({ fullName, email });
            } else if (role === 'teacher' || role === 'admin') {
                const key = `teacher-${fullName}`;
                if (seenNames.has(key)) return;
                seenNames.add(key);

                // Add to teachers list, we'll sort admin to top later
                teachers.push({ fullName, email, role });
            }
        });

        // Sort classes and names
        const sortedClasses = Array.from(classes).sort();

        // Sort names within each class
        Object.keys(students).forEach((cls) => {
            students[cls].sort((a, b) => a.fullName.localeCompare(b.fullName));
        });

        // Sort teacher names: Admin first, then alphabetically
        teachers.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            return a.fullName.localeCompare(b.fullName);
        });

        return NextResponse.json({
            classes: sortedClasses,
            students,
            teachers
        });
    } catch (error) {
        console.error('Error fetching users for login:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

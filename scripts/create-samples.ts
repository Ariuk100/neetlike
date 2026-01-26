import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountBase64) {
        console.error('FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64 missing');
        process.exit(1);
    }
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const auth = admin.auth();
const db = admin.firestore();

// Хичээлүүд
const SUBJECTS = [
    { id: 'physics', name: 'Физик', nameEn: 'Physics', color: '#3B82F6' },
    { id: 'math', name: 'Математик', nameEn: 'Mathematics', color: '#10B981' },
    { id: 'chemistry', name: 'Хими', nameEn: 'Chemistry', color: '#F59E0B' },
    { id: 'biology', name: 'Биологи', nameEn: 'Biology', color: '#8B5CF6' },
];

const SAMPLE_STUDENTS = [
    { lastName: "Батбаяр", firstName: "Болд", grade: 11, group: "А" },
    { lastName: "Өнөржаргал", firstName: "Сарна", grade: 10, group: "В" },
    { lastName: "Мөнхбат", firstName: "Төмөр", grade: 11, group: "Д" },
];

const SAMPLE_TEACHERS = [
    {
        lastName: "Доржсүрэн",
        firstName: "Баяр",
        email: "dorjsuren.bayar@physx.mn",
        phone: "99112233",
        subjectId: "physics",
        classes: ["10А", "10Б", "11А"]
    },
    {
        lastName: "Цэцэгмаа",
        firstName: "Оюун",
        email: "tsetsegmaa.oyun@physx.mn",
        phone: "88334455",
        subjectId: "math",
        classes: ["10В", "11В", "11Д"]
    },
    {
        lastName: "Ганзориг",
        firstName: "Эрдэм",
        email: "ganzorig.erdem@physx.mn",
        phone: "77556688",
        subjectId: "chemistry",
        classes: ["10Б", "11А", "11Б"]
    },
];

function generateUniqueCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function main() {
    console.log('Creating subjects collection and sample users...\n');

    const codes = new Set<string>();
    const password = "123123";

    // 1. Create Subjects Collection
    console.log('=== CREATING SUBJECTS ===');
    for (const subject of SUBJECTS) {
        try {
            await db.collection('subjects').doc(subject.id).set({
                id: subject.id,
                name: subject.name,
                nameEn: subject.nameEn,
                color: subject.color,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ Subject: ${subject.name} (${subject.nameEn})`);
        } catch (error: any) {
            console.error(`❌ Failed to create subject ${subject.name}:`, error.message);
        }
    }

    // 2. Create Students
    console.log('\n=== CREATING STUDENTS ===');
    for (const student of SAMPLE_STUDENTS) {
        let studentCode = generateUniqueCode();
        while (codes.has(studentCode)) {
            studentCode = generateUniqueCode();
        }
        codes.add(studentCode);

        const email = `${studentCode}@physx.local`;

        try {
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: `${student.lastName} ${student.firstName}`,
            });

            await auth.setCustomUserClaims(userRecord.uid, { role: 'student' });

            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                lastName: student.lastName,
                firstName: student.firstName,
                name: student.firstName,
                ovog: student.lastName,
                fullDisplay: `${student.lastName} ${student.firstName}`,
                class: `${student.grade}${student.group}`,
                grade: student.grade,
                group: student.group,
                studentCode: studentCode,
                role: 'student',
                email: email,
                passwordHint: password,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ Student: ${student.lastName} ${student.firstName} (${student.grade}${student.group}) - Code: ${studentCode}`);
        } catch (error: any) {
            console.error(`❌ Failed to create student ${student.lastName} ${student.firstName}:`, error.message);
        }
    }

    // 3. Create Teachers
    console.log('\n=== CREATING TEACHERS ===');
    for (const teacher of SAMPLE_TEACHERS) {
        try {
            const userRecord = await auth.createUser({
                email: teacher.email,
                password,
                displayName: `${teacher.lastName} ${teacher.firstName}`,
            });

            await auth.setCustomUserClaims(userRecord.uid, { role: 'teacher' });

            // Get subject name for display
            const subjectDoc = await db.collection('subjects').doc(teacher.subjectId).get();
            const subjectName = subjectDoc.exists ? subjectDoc.data()?.name : teacher.subjectId;

            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                lastName: teacher.lastName,
                firstName: teacher.firstName,
                name: teacher.firstName,
                ovog: teacher.lastName,
                fullDisplay: `${teacher.lastName} ${teacher.firstName}`,
                email: teacher.email,
                phone: teacher.phone,
                subjectId: teacher.subjectId, // Store reference to subject
                classes: teacher.classes,
                role: 'teacher',
                passwordHint: password,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ Teacher: ${teacher.lastName} ${teacher.firstName} (${subjectName}) - Email: ${teacher.email}`);
            console.log(`   Classes: ${teacher.classes.join(', ')}`);
        } catch (error: any) {
            console.error(`❌ Failed to create teacher ${teacher.lastName} ${teacher.firstName}:`, error.message);
        }
    }

    console.log('\n✅ Setup completed!');
}

main().catch(console.error);

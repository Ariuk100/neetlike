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

const db = admin.firestore();

// Mapping from subject names to IDs
const subjectMapping: Record<string, string> = {
    'Физик': 'physics',
    'Математик': 'math',
    'Хими': 'chemistry',
    'Биологи': 'biology',
};

async function main() {
    console.log('Updating teachers with subjectId...\n');

    // Get all teacher users
    const teachersSnapshot = await db.collection('users')
        .where('role', '==', 'teacher')
        .get();

    console.log(`Found ${teachersSnapshot.size} teachers`);

    for (const doc of teachersSnapshot.docs) {
        const data = doc.data();
        const subject = data.subject;

        if (subject && subjectMapping[subject]) {
            const subjectId = subjectMapping[subject];

            await doc.ref.update({
                subjectId: subjectId,
            });

            console.log(`✅ Updated ${data.lastName} ${data.firstName}: ${subject} -> ${subjectId}`);
        } else {
            console.log(`⚠️  Skipped ${data.lastName} ${data.firstName}: No subject mapping found`);
        }
    }

    console.log('\n✅ Teacher updates completed!');
}

main().catch(console.error);

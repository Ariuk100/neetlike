import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
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

async function main() {
    console.log('Starting cleanup of students...');

    // 1. Get all students from Firestore
    const snapshot = await db.collection('users')
        .where('role', '==', 'student')
        .get();

    console.log(`Found ${snapshot.size} potential student records.`);

    const deletionPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const email = data.email as string;
        const uid = data.uid as string;

        // Only delete if it matches our pattern
        if (email && email.endsWith('@physx.local')) {
            try {
                // Delete Auth User
                await auth.deleteUser(uid);
                // Delete Firestore Doc
                await db.collection('users').doc(uid).delete();
                console.log(`[DELETED] ${data.name} (${email})`);
                return true;
            } catch (err: any) {
                if (err.code === 'auth/user-not-found') {
                    // If auth user already gone, still delete firestore doc
                    await db.collection('users').doc(uid).delete();
                    console.log(`[DELETED FS ONLY] ${data.name} (Auth user not found)`);
                    return true;
                }
                console.error(`[ERROR] Failed to delete ${uid}:`, err.message);
                return false;
            }
        }
        return false;
    });

    const results = await Promise.all(deletionPromises);
    const deletedCount = results.filter(Boolean).length;

    console.log(`Cleanup completed. Deleted ${deletedCount} records.`);
}

main().catch(console.error);

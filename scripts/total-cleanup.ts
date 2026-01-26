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

async function deleteAllUsers() {
    console.log('Starting total cleanup of Auth and Firestore Users...');

    // 1. Delete all users from Firestore 'users' collection
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} documents in 'users' collection.`);

    const fsPromises = usersSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(fsPromises);
    console.log('Firestore documents deleted.');

    // 2. Delete all users from Firebase Auth
    let totalDeleted = 0;

    async function deleteBatch(nextPageToken?: string) {
        const listUsersResult = await auth.listUsers(100, nextPageToken);
        const uids = listUsersResult.users.map(user => user.uid);

        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            totalDeleted += uids.length;
            console.log(`Deleted batch of ${uids.length} users. Total: ${totalDeleted}`);
        }

        if (listUsersResult.pageToken) {
            await deleteBatch(listUsersResult.pageToken);
        }
    }

    await deleteBatch();
    console.log(`Total Auth users deleted: ${totalDeleted}`);
}

deleteAllUsers().catch(console.error);

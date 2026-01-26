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

const ADMIN_DATA = {
    email: "ariunbold.bless@gmail.com",
    firstName: "Ариунболд",
    lastName: "Ганболд",
    phone: "86068650",
    password: "123123",
    role: "admin"
};

async function main() {
    console.log(`Creating admin account for ${ADMIN_DATA.email}...`);

    try {
        // 1. Check if user already exists
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(ADMIN_DATA.email);
            console.log('User already exists. Updating...');
            // Update password
            await auth.updateUser(userRecord.uid, {
                password: ADMIN_DATA.password,
                displayName: `${ADMIN_DATA.lastName} ${ADMIN_DATA.firstName}`
            });
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                userRecord = await auth.createUser({
                    email: ADMIN_DATA.email,
                    password: ADMIN_DATA.password,
                    displayName: `${ADMIN_DATA.lastName} ${ADMIN_DATA.firstName}`,
                });
            } else {
                throw e;
            }
        }

        // 2. Set Custom Claims
        await auth.setCustomUserClaims(userRecord.uid, { role: ADMIN_DATA.role });

        // 3. Create/Update Firestore Document
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: ADMIN_DATA.email,
            name: `${ADMIN_DATA.lastName} ${ADMIN_DATA.firstName}`,
            firstName: ADMIN_DATA.firstName,
            lastName: ADMIN_DATA.lastName,
            phone: ADMIN_DATA.phone,
            role: ADMIN_DATA.role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`[SUCCESS] Admin account created/updated for ${ADMIN_DATA.email}`);
    } catch (error: any) {
        console.error(`[ERROR] Failed to create admin:`, error.message);
    }
}

main().catch(console.error);

import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json(); // sessionId is now the Teacher Code/ID

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const sessionRef = adminFirestore.collection('whiteboard_sessions').doc(sessionId);

        // 1. Set isActive: false
        // We update instead of delete so the doc remains (prevents 404s on listeners temporarily)
        await sessionRef.set({ isActive: false }, { merge: true });

        // 2. Delete all pages (with their paths), students, and cursors
        const batch = adminFirestore.batch();

        // Delete students
        const studentsSnapshot = await sessionRef.collection('students').get();
        studentsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Delete cursors
        const cursorsSnapshot = await sessionRef.collection('cursors').get();
        cursorsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // NEW: Delete pages and their nested paths collections
        // We fetching 'totalPages' to know how many pages to scan, because 'pages' docs might be phantom (non-existent parent)
        const sessionDoc = await sessionRef.get();
        const totalPages = sessionDoc.exists ? (sessionDoc.data()?.totalPages || 10) : 10; // Default to 10 if not found, just in case

        // Iterate known pages
        for (let i = 0; i < totalPages; i++) {
            const pageRef = sessionRef.collection('pages').doc(String(i));

            // Delete 'paths' subcollection
            const pathsSnapshot = await pageRef.collection('paths').get();
            if (pathsSnapshot.docs.length > 0) {
                const pathBatch = adminFirestore.batch();
                pathsSnapshot.docs.forEach((pathDoc) => {
                    pathBatch.delete(pathDoc.ref);
                });
                await pathBatch.commit();
            }

            // Delete 'elements' subcollection
            const elementsSnapshot = await pageRef.collection('elements').get();
            if (elementsSnapshot.docs.length > 0) {
                const elementBatch = adminFirestore.batch();
                elementsSnapshot.docs.forEach((elementDoc) => {
                    elementBatch.delete(elementDoc.ref);
                });
                await elementBatch.commit();
            }

            // Attempt to delete the page doc itself (if it exists)
            // Note: In batch or individually. Since it might not exist, this is harmless.
            // We use a small batch or just ignore await to speed up? safely await.
            await pageRef.delete();
        }

        return NextResponse.json({ success: true, message: `Session ${sessionId} ended and cleaned up.` });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 });
    }
}

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
        // Firestore doesn't auto-delete nested collections, so we need to do it manually
        const pagesSnapshot = await sessionRef.collection('pages').get();

        for (const pageDoc of pagesSnapshot.docs) {
            // Delete all paths in this page
            const pathsSnapshot = await pageDoc.ref.collection('paths').get();

            if (pathsSnapshot.docs.length > 0) {
                const pathBatch = adminFirestore.batch();
                pathsSnapshot.docs.forEach((pathDoc) => {
                    pathBatch.delete(pathDoc.ref);
                });
                await pathBatch.commit();
            }

            // NEW: Delete all elements (images/text/video) in this page
            const elementsSnapshot = await pageDoc.ref.collection('elements').get();

            if (elementsSnapshot.docs.length > 0) {
                const elementBatch = adminFirestore.batch();
                elementsSnapshot.docs.forEach((elementDoc) => {
                    elementBatch.delete(elementDoc.ref);
                });
                await elementBatch.commit();
            }

            // Delete the page document itself
            await pageDoc.ref.delete();
        }

        return NextResponse.json({ success: true, message: `Session ${sessionId} ended and cleaned up.` });
    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 });
    }
}

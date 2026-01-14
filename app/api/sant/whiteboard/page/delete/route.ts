import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
    try {
        const { sessionId, pageIndex, collectionName = 'whiteboard_sessions' } = await req.json();

        if (!sessionId || typeof pageIndex !== 'number') {
            return NextResponse.json({ error: 'Missing sessionId or pageIndex' }, { status: 400 });
        }

        const sessionRef = adminFirestore.collection(collectionName).doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const totalPages = sessionDoc.data()?.totalPages || 1;

        if (totalPages <= 1) {
            return NextResponse.json({ error: 'Cannot delete the only remaining page' }, { status: 400 });
        }

        if (pageIndex < 0 || pageIndex >= totalPages) {
            return NextResponse.json({ error: 'Invalid page index' }, { status: 400 });
        }

        // Helper to delete a collection content
        const deleteCollection = async (ref: FirebaseFirestore.CollectionReference) => {
            const snapshot = await ref.get();
            if (snapshot.empty) return;
            const batch = adminFirestore.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        };

        // Helper to move collection content from source to dest
        const moveCollection = async (sourceRef: FirebaseFirestore.CollectionReference, destRef: FirebaseFirestore.CollectionReference) => {
            const snapshot = await sourceRef.get();
            if (snapshot.empty) return;

            // Read all
            const items = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

            // Write to dest
            if (items.length > 0) {
                const writeBatch = adminFirestore.batch();
                items.forEach(item => {
                    writeBatch.set(destRef.doc(item.id), item.data);
                });
                await writeBatch.commit();
            }

            // Delete from source (using previous helper would require fetching again, but we have refs)
            // Efficient delete
            const deleteBatch = adminFirestore.batch();
            snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
        };

        // 1. Delete the target page contents
        const targetPageRef = sessionRef.collection('pages').doc(String(pageIndex));
        await deleteCollection(targetPageRef.collection('paths'));
        await deleteCollection(targetPageRef.collection('elements'));
        // We don't delete the page doc itself yet, or we assume it's phantom.

        // 2. Shift subsequent pages
        // If we deleted page 1, and there is page 2: Move 2 -> 1, 3 -> 2
        for (let i = pageIndex + 1; i < totalPages; i++) {
            const sourcePageRef = sessionRef.collection('pages').doc(String(i));
            const destPageRef = sessionRef.collection('pages').doc(String(i - 1));

            await moveCollection(sourcePageRef.collection('paths'), destPageRef.collection('paths'));
            await moveCollection(sourcePageRef.collection('elements'), destPageRef.collection('elements'));
        }

        // 3. Decrement totalPages
        await sessionRef.update({
            totalPages: totalPages - 1,
            // If the user was on the deleted page or higher, client should adjust navigation.
            // Client side logic usually handles this, but we can clamp currentPage here if we wanted.
            // Let's rely on client listeners to clamp currentPage.
        });

        return NextResponse.json({ success: true, newTotal: totalPages - 1 });

    } catch (error) {
        console.error('Delete page error:', error);
        return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
    }
}

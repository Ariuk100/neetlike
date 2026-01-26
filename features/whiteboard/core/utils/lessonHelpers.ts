import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, setDoc, query, orderBy } from 'firebase/firestore';
import { WhiteboardElement } from '@/features/whiteboard/types';

// Types
export interface LessonTemplate {
    id: string;
    title: string;
    subject: string;
    grade: string;
    authorName: string;
    createdAt: string;
    totalPages: number;
    data: {
        [pageIndex: string]: {
            elements: WhiteboardElement[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paths: any[];
        }
    }
}

// 1. Save Current Session as Template
export async function saveSessionAsTemplate(
    sessionId: string,
    metadata: { title: string; subject: string; grade: string; authorName: string },
    totalPages: number,
    collectionName: string = 'whiteboard_sessions'
): Promise<void> {
    const lessonId = doc(collection(db, 'prepared_lessons')).id;
    const lessonData: LessonTemplate['data'] = {};

    // Iterate through all pages to fetch content
    for (let i = 0; i < totalPages; i++) {
        const pageKey = String(i);
        lessonData[pageKey] = { elements: [], paths: [] };

        // Fetch Elements
        const elQuery = await getDocs(collection(db, collectionName, sessionId, 'pages', pageKey, 'elements'));
        elQuery.forEach(d => {
            lessonData[pageKey].elements.push(d.data() as WhiteboardElement);
        });

        // Fetch Paths (Optional, but good for completeness)
        const pathQuery = await getDocs(query(collection(db, collectionName, sessionId, 'pages', pageKey, 'paths'), orderBy('createdAt')));
        pathQuery.forEach(d => {
            lessonData[pageKey].paths.push(d.data());
        });
    }

    const template: LessonTemplate = {
        id: lessonId,
        ...metadata,
        createdAt: new Date().toISOString(),
        totalPages,
        data: lessonData
    };

    await setDoc(doc(db, 'prepared_lessons', lessonId), template);
}

// 2. Load Template into Session
export async function loadTemplateToSession(
    sessionId: string,
    template: LessonTemplate,
    collectionName: string = 'whiteboard_sessions'
): Promise<void> {
    const batch = writeBatch(db);

    // Update Session Metadata (totalPages)
    const sessionRef = doc(db, collectionName, sessionId);
    batch.update(sessionRef, { totalPages: template.totalPages, currentPage: 0 });

    // Assuming we want to OVERWRITE or MERGE? 
    // User implies "load and show", usually implies replacing blank state.
    // Ideally we should clear existing, but Firestore delete collection is hard from client.
    // For now, we'll just write on top. If the session was empty, it's a clean write.

    // Process Data
    Object.entries(template.data).forEach(([pageKey, pageData]) => {
        // Elements
        pageData.elements.forEach(el => {
            // New ID for the fresh copy to ensure independence
            const newRef = doc(collection(db, collectionName, sessionId, 'pages', pageKey, 'elements'));
            batch.set(newRef, { ...el, id: newRef.id });
        });

        // Paths
        pageData.paths.forEach(path => {
            const newRef = doc(collection(db, collectionName, sessionId, 'pages', pageKey, 'paths'));
            batch.set(newRef, { ...path, id: newRef.id });
        });
    });

    await batch.commit();
}

// 3. Clear Session (Helper for "Prepare -> Save -> Clear")
export async function clearSessionContent(sessionId: string, totalPages: number, collectionName: string = 'whiteboard_sessions') {
    // Note: Client-side deletion of subcollections is expensive. 
    // We will do a best-effort clear for the current page(s) or just reset the totalPages to 1 and clear page 0?
    // A robust app would use a Cloud Function for recursive delete. 
    // Here we will just iterate and batch delete for visible pages.

    // Simplification: Just clear elements/paths for ALL pages known.
    for (let i = 0; i < totalPages; i++) {
        const pageKey = String(i);
        const batch = writeBatch(db);

        const elQuery = await getDocs(collection(db, collectionName, sessionId, 'pages', pageKey, 'elements'));
        elQuery.forEach(d => batch.delete(d.ref));

        const pathQuery = await getDocs(collection(db, collectionName, sessionId, 'pages', pageKey, 'paths'));
        pathQuery.forEach(d => batch.delete(d.ref));

        await batch.commit(); // Commit per page to avoid limit of 500
    }

    // Reset page count
    await setDoc(doc(db, collectionName, sessionId), { totalPages: 1, currentPage: 0 }, { merge: true });
}

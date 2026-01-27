'use server';

import { getSpreadsheetData, updateSpreadsheetRow, appendSpreadsheetRow } from '@/lib/google-sheets';
import { adminStorage, adminFirestore, adminAuth } from '@/lib/firebaseAdmin'; // Import Firebase Admin
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { cookies } from 'next/headers';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

async function getAuthorizedUser() {
    const sessionCookie = (await cookies()).get('__session')?.value;
    if (!sessionCookie) throw new Error('Unauthorized');
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchQuestionsFromFirestore = cache(async (filters?: any, lastDocId?: string, limitCount = 20) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = adminFirestore.collection('questions');

        // Always exclude deleted questions for teachers
        if (filters?.status && filters.status !== 'all') {
            query = query.where('status', '==', filters.status);
        } else {
            query = query.where('status', 'in', ['active', 'inactive', '']);
        }

        if (filters?.subject && filters.subject !== 'all') {
            query = query.where('subject', '==', filters.subject);
        }
        if (filters?.grade && filters.grade !== 'all') {
            query = query.where('grade', '==', filters.grade);
        }
        if (filters?.difficulty && filters.difficulty !== 'all') {
            query = query.where('difficulty', '==', filters.difficulty);
        }
        if (filters?.qType && filters.qType !== 'all') {
            query = query.where('qType', '==', filters.qType);
        }
        if (filters?.bloom && filters.bloom !== 'all') {
            query = query.where('bloom', '==', filters.bloom);
        }

        query = query.orderBy('updatedAt', 'desc');

        if (lastDocId) {
            const lastDoc = await adminFirestore.collection('questions').doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.limit(limitCount + 1).get();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = snapshot.docs.map((doc: any) => doc.data());

        const hasMore = results.length > limitCount;
        const finalResults = hasMore ? results.slice(0, limitCount) : results;

        // Client-side text search fallback
        let filteredResults = finalResults;

        if (filters?.searchQuery) {
            const sq = filters.searchQuery.toLowerCase();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filteredResults = filteredResults.filter((q: any) =>
                String(q.id || '').toLowerCase().includes(sq) ||
                (q.topic || '').toLowerCase().includes(sq) ||
                (q.subTopic || '').toLowerCase().includes(sq)
            );
        }

        return {
            items: filteredResults,
            nextCursor: hasMore ? finalResults[finalResults.length - 1].id : null,
            total: snapshot.size
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('fetchQuestionsFromFirestore Error:', error);
        // If it's a missing index error, the error message will contain a link
        if (error.message?.includes('index')) {
            console.error('MISSING INDEX ERROR: Go to Firebase Console to create the required composite index.');
        }
        return { items: [], nextCursor: null, total: 0, error: error.message };
    }
});

export const syncAllQuestionsFromSheets = cache(async () => {
    // 🛡️ Admin ONLY
    const user = await getAuthorizedUser();
    if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const [mcqRows, problemRows] = await Promise.all([
        getSpreadsheetData(SPREADSHEET_ID, 'MCQ!A2:X1000'),
        getSpreadsheetData(SPREADSHEET_ID, 'Problem!A2:N1000')
    ]);

    const batch = adminFirestore.batch();
    const timestamp = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processRows = (rows: any[] | null, type: 'MCQ' | 'Problem') => {
        if (!rows) return;
        rows.forEach((row, index) => {
            if (!row[0]) return; // Skip empty rows
            const id = row[0];
            const ref = adminFirestore.collection('questions').doc(id);
            batch.set(ref, {
                id,
                rowIndex: index + 2,
                status: String(row[1] || 'active').trim().toLowerCase(),
                subject: row[2] || '',
                topic: row[3] || '',
                subTopic: row[4] || '',
                grade: row[5] || '',
                bloom: row[6] || '',
                difficulty: row[7] || '',
                qType: type,
                updatedAt: row[23] || row[13] || timestamp
            }, { merge: true });
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processRows(mcqRows as any[] || [], 'MCQ');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processRows(problemRows as any[] || [], 'Problem');

    await batch.commit();
    revalidatePath('/teacher/tasks');
    return { success: true };
});

export const fetchQuestions = cache(async () => {
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SHEET_ID is not defined');
    }

    try {
        const [mcqRows, problemRows] = await Promise.all([
            getSpreadsheetData(SPREADSHEET_ID, 'MCQ!A2:X'),
            getSpreadsheetData(SPREADSHEET_ID, 'Problem!A2:N')
        ]);

        const mcqs = (mcqRows || []).map((row, index) => ({
            rowIndex: index + 2,
            qType: 'MCQ',
            id: row[0] || `mcq-${index}`,
            status: row[1] || '',
            subject: row[2] || '',
            topic: row[3] || '',
            subTopic: row[4] || '',
            grade: row[5] || '',
            bloom: row[6] || '',
            difficulty: row[7] || '',
            questionText: row[8] || '',
            questionImage: row[9] || '',
            opt1: row[10] || '',
            opt2: row[11] || '',
            opt3: row[12] || '',
            opt4: row[13] || '',
            opt5: row[14] || '',
            opt1Image: row[15] || '',
            opt2Image: row[16] || '',
            opt3Image: row[17] || '',
            opt4Image: row[18] || '',
            opt5Image: row[19] || '',
            correctAnswer: row[20] || '',
            solutionText: row[21] || '',
            solutionImage: row[22] || '',
            updatedAt: row[23] || '',
        })).filter(q => q.status !== 'deleted' && q.status !== '');

        const problems = (problemRows || []).map((row, index) => ({
            rowIndex: index + 2,
            qType: 'Problem',
            id: row[0] || `prob-${index}`,
            status: row[1] || '',
            subject: row[2] || '',
            topic: row[3] || '',
            subTopic: row[4] || '',
            grade: row[5] || '',
            bloom: row[6] || '',
            difficulty: row[7] || '',
            questionText: row[8] || '',
            questionImage: row[9] || '',
            correctAnswer: row[10] || '', // Single answer for Problem type
            solutionText: row[11] || '',
            solutionImage: row[12] || '',
            updatedAt: row[13] || '',
        })).filter(q => q.status !== 'deleted' && q.status !== '');

        return [...mcqs, ...problems].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    } catch (error: unknown) {
        console.error('Error fetching questions:', error);
        return [];
    }
});

export const fetchCategories = cache(async () => {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    try {
        const rows = await getSpreadsheetData(SPREADSHEET_ID, 'Categories!A2:C1000');
        if (!rows || rows.length === 0) return [];

        return rows.map(r => ({
            subject: r[0] || '',
            topic: r[1] || '',
            subTopic: r[2] || ''
        })).filter(c => c.subject || c.topic);
    } catch (error: unknown) {
        console.error('Error fetching categories:', error);
        return [];
    }
});

const subjectPrefixMap: Record<string, string> = {
    'Физик': 'PHYS',
    'Математик': 'MATH',
    'Хими': 'CHEM',
    'Биологи': 'BIO',
    'Мэдээлэл технологи': 'TECH',
    'Мэдээлэл зүй': 'CS',
};

async function getNextQuestionId(subject: string) {
    const prefix = subjectPrefixMap[subject] || 'SIM';
    const counterRef = adminFirestore.collection('counters').doc('question_ids');

    return await adminFirestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(counterRef);
        const data = doc.data() || {};
        const nextNumber = (data[prefix] || 0) + 1;

        transaction.set(counterRef, { [prefix]: nextNumber }, { merge: true });

        return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertQuestion(question: any) {
    // 🛡️ Teacher or Admin
    const user = await getAuthorizedUser();
    if (user.role !== 'admin' && user.role !== 'teacher') throw new Error('Forbidden');

    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const isMCQ = question.qType === 'MCQ';
    const sheetName = isMCQ ? 'MCQ' : 'Problem';

    // Ensure ID exists and sync timestamps
    const timestamp = new Date().toISOString();

    // Generate logical ID if it's a new question
    let id = question.id;
    if (!id) {
        id = await getNextQuestionId(question.subject || '');
    }

    // Prepare the unified data object
    const finalQuestionData = {
        ...question,
        id,
        updatedAt: timestamp,
        status: String(question.status || 'active').trim().toLowerCase(),
        subject: question.subject || '',
        topic: question.topic || '',
        subTopic: question.subTopic || '',
        grade: question.grade || '',
        bloom: question.bloom || '',
        difficulty: question.difficulty || '',
        questionText: question.questionText || '',
        questionImage: question.questionImage || '',
        correctAnswer: question.correctAnswer || '',
        solutionText: question.solutionText || '',
        solutionImage: question.solutionImage || '',
    };

    // Prepare Sheet Values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let values: any[][];
    if (isMCQ) {
        values = [[
            finalQuestionData.id,
            finalQuestionData.status,
            finalQuestionData.subject,
            finalQuestionData.topic,
            finalQuestionData.subTopic,
            finalQuestionData.grade,
            finalQuestionData.bloom,
            finalQuestionData.difficulty,
            finalQuestionData.questionText,
            finalQuestionData.questionImage,
            question.opt1 || '',
            question.opt2 || '',
            question.opt3 || '',
            question.opt4 || '',
            question.opt5 || '',
            question.opt1Image || '',
            question.opt2Image || '',
            question.opt3Image || '',
            question.opt4Image || '',
            question.opt5Image || '',
            finalQuestionData.correctAnswer,
            finalQuestionData.solutionText,
            finalQuestionData.solutionImage,
            finalQuestionData.updatedAt
        ]];
    } else {
        values = [[
            finalQuestionData.id,
            finalQuestionData.status,
            finalQuestionData.subject,
            finalQuestionData.topic,
            finalQuestionData.subTopic,
            finalQuestionData.grade,
            finalQuestionData.bloom,
            finalQuestionData.difficulty,
            finalQuestionData.questionText,
            finalQuestionData.questionImage,
            finalQuestionData.correctAnswer,
            finalQuestionData.solutionText,
            finalQuestionData.solutionImage,
            finalQuestionData.updatedAt
        ]];
    }

    try {
        let finalRowIndex = question.rowIndex;

        // 1. Save to Google Sheets
        const rangePrefix = `${sheetName}!A`;
        if (question.rowIndex) {
            // Update existing row
            const range = isMCQ ? `${rangePrefix}${question.rowIndex}:X${question.rowIndex}` : `${rangePrefix}${question.rowIndex}:N${question.rowIndex}`;
            await updateSpreadsheetRow(SPREADSHEET_ID, range, values);
        } else {
            // Append new row
            const appendRange = isMCQ ? `${rangePrefix}2:X` : `${rangePrefix}2:N`;
            const appendResponse = await appendSpreadsheetRow(SPREADSHEET_ID, appendRange, values);

            if (appendResponse.updates?.updatedRange) {
                const rangeMatch = appendResponse.updates.updatedRange.match(/![A-Z]+(\d+):/);
                if (rangeMatch && rangeMatch[1]) {
                    finalRowIndex = parseInt(rangeMatch[1], 10);
                }
            }
        }

        // 2. Save to Firestore (Metadata ONLY - NO CONTENT)
        const metadataToSave = {
            id: finalQuestionData.id,
            rowIndex: finalRowIndex || null,
            status: finalQuestionData.status,
            updatedAt: finalQuestionData.updatedAt,
            subject: finalQuestionData.subject,
            grade: finalQuestionData.grade,
            topic: finalQuestionData.topic,
            subTopic: finalQuestionData.subTopic,
            difficulty: finalQuestionData.difficulty,
            bloom: finalQuestionData.bloom,
            qType: finalQuestionData.qType || (isMCQ ? 'MCQ' : 'Problem'),
        };

        await adminFirestore.collection('questions').doc(finalQuestionData.id).set(metadataToSave, { merge: true });

        revalidatePath('/teacher/tasks');

        // 4. Save Version History
        await adminFirestore.collection('questions').doc(id).collection('history').add({
            ...finalQuestionData,
            versionTimestamp: timestamp
        });

        return { success: true, rowIndex: finalRowIndex, id: finalQuestionData.id };
    } catch (error: unknown) {
        console.error('upsertQuestion Error:', error);
        throw new Error(`Failed to save question: ${(error as Error).message}`);
    }
}

export async function softDeleteQuestion(rowIndex: number, qType: string) {
    // 🛡️ Teacher or Admin
    const user = await getAuthorizedUser();
    if (user.role !== 'admin' && user.role !== 'teacher') throw new Error('Forbidden');

    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    try {
        const sheetName = qType === 'MCQ' ? 'MCQ' : 'Problem';
        // Mark in Sheet
        await updateSpreadsheetRow(SPREADSHEET_ID, `${sheetName}!B${rowIndex}:B${rowIndex}`, [['deleted']]);

        // Mark in Firestore? We might need the ID. 
        // For now, let's assume UI filters by status. 
        // Ideally we should update Firestore too, but we only have rowIndex here.
        // We'd need to fetch the ID first to update Firestore. 
        // Let's implement that fetch for robustness.

        let idToUpdate = '';
        try {
            const rowData = await getSpreadsheetData(SPREADSHEET_ID, `${sheetName}!A${rowIndex}:A${rowIndex}`);
            if (rowData && rowData[0] && rowData[0][0]) {
                idToUpdate = rowData[0][0];
            }
        } catch (e) { console.warn("Could not fetch ID for Firestore deletion", e); }

        if (idToUpdate) {
            await adminFirestore.collection('questions').doc(idToUpdate).set({ status: 'deleted' }, { merge: true });
        }

        revalidatePath('/teacher/tasks');
        return { success: true };
    } catch (error: unknown) {
        console.error('softDeleteQuestion Error:', error);
        throw new Error(`Failed to delete question: ${(error as Error).message}`);
    }
}

export async function bulkDeleteQuestions(questionsToDelete: { rowIndex: number, qType: string, id: string }[]) {
    // 🛡️ Teacher or Admin
    const user = await getAuthorizedUser();
    if (user.role !== 'admin' && user.role !== 'teacher') throw new Error('Forbidden');

    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    try {
        const batch = adminFirestore.batch();

        for (const q of questionsToDelete) {
            const sheetName = q.qType === 'MCQ' ? 'MCQ' : 'Problem';
            // Mark in Sheet
            await updateSpreadsheetRow(SPREADSHEET_ID, `${sheetName}!B${q.rowIndex}:B${q.rowIndex}`, [['deleted']]);

            // Mark in Firestore
            const ref = adminFirestore.collection('questions').doc(q.id);
            batch.update(ref, { status: 'deleted', updatedAt: new Date().toISOString() });
        }

        await batch.commit();
        revalidatePath('/teacher/tasks');
        return { success: true, count: questionsToDelete.length };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('bulkDeleteQuestions Error:', error);
        throw new Error(error.message);
    }
}

export async function bulkUpdateStatus(ids: string[], status: string) {
    // 🛡️ Teacher or Admin
    const user = await getAuthorizedUser();
    if (user.role !== 'admin' && user.role !== 'teacher') throw new Error('Forbidden');

    try {
        const batch = adminFirestore.batch();
        const timestamp = new Date().toISOString();

        for (const id of ids) {
            const ref = adminFirestore.collection('questions').doc(id);
            batch.update(ref, { status, updatedAt: timestamp });
        }

        await batch.commit();
        revalidatePath('/teacher/tasks');
        return { success: true };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('bulkUpdateStatus Error:', error);
        throw new Error(error.message);
    }
}

export async function checkImageHash(hash: string) {
    try {
        const doc = await adminFirestore.collection('image_hashes').doc(hash).get();
        if (doc.exists) {
            return { url: doc.data()?.url };
        }
        return { url: null };
    } catch (error) {
        console.error('checkImageHash Error:', error);
        return { url: null };
    }
}

export async function uploadImage(formData: FormData) {
    const file = formData.get('file') as File;
    const hash = formData.get('hash') as string;
    if (!file) return { error: 'Файл сонгогдоогүй байна' };

    try {
        // Double check hash on server if provided
        if (hash) {
            const existing = await checkImageHash(hash);
            if (existing.url) return { url: existing.url };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const bucket = adminStorage.bucket();
        const filename = `questions/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fileRef = bucket.file(filename);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make the file public
        await fileRef.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        // Save hash if provided
        if (hash) {
            await adminFirestore.collection('image_hashes').doc(hash).set({
                url: publicUrl,
                createdAt: new Date().toISOString()
            });
        }

        return { url: publicUrl };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Firebase Upload Error:', error);
        return { error: `Зураг хуулахад алдаа гарлаа: ${error.message}` };
    }
}

export async function fetchDeletedCount() {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    try {
        const [mcqData, probData] = await Promise.all([
            getSpreadsheetData(SPREADSHEET_ID, 'MCQ!B2:B'),
            getSpreadsheetData(SPREADSHEET_ID, 'Problem!B2:B')
        ]);

        const mcqCount = (mcqData || []).filter(row => row[0] === 'deleted').length;
        const probCount = (probData || []).filter(row => row[0] === 'deleted').length;

        return { mcqCount, probCount, total: mcqCount + probCount };
    } catch (error) {
        console.error('fetchDeletedCount Error:', error);
        return { mcqCount: 0, probCount: 0, total: 0, error: 'Failed to fetch' };
    }
}

// Helper function to delete images from storage by URL
async function deleteImageByUrl(url: string) {
    if (!url || !url.includes('storage.googleapis.com')) return;
    try {
        const bucket = adminStorage.bucket();
        const parts = url.split(`${bucket.name}/`);
        if (parts.length > 1) {
            const filename = parts[1];
            const file = bucket.file(filename);
            const [exists] = await file.exists();
            if (exists) await file.delete();
        }
    } catch (e) {
        console.error('Delete image error:', e);
    }
}

export async function purgeDeletedQuestions() {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    try {
        // 1. Fetch all data from Sheets to find image URLs of deleted questions
        const [mcqRows, problemRows] = await Promise.all([
            getSpreadsheetData(SPREADSHEET_ID, 'MCQ!A2:X'),
            getSpreadsheetData(SPREADSHEET_ID, 'Problem!A2:N')
        ]);

        const imageUrlsToDelete = new Set<string>();

        const mcqColIndices = { status: 1, qImg: 9, opt1Img: 15, opt2Img: 16, opt3Img: 17, opt4Img: 18, opt5Img: 19, solImg: 22 };
        const probColIndices = { status: 1, qImg: 9, solImg: 12 };

        (mcqRows || []).forEach(row => {
            if (row[mcqColIndices.status] === 'deleted') {
                [row[mcqColIndices.qImg], row[mcqColIndices.opt1Img], row[mcqColIndices.opt2Img],
                row[mcqColIndices.opt3Img], row[mcqColIndices.opt4Img], row[mcqColIndices.opt5Img],
                row[mcqColIndices.solImg]].forEach(url => url && imageUrlsToDelete.add(url));
            }
        });

        (problemRows || []).forEach(row => {
            if (row[probColIndices.status] === 'deleted') {
                [row[probColIndices.qImg], row[probColIndices.solImg]].forEach(url => url && imageUrlsToDelete.add(url));
            }
        });

        // 2. Delete images from Storage
        console.log(`Purging ${imageUrlsToDelete.size} images...`);
        await Promise.all(Array.from(imageUrlsToDelete).map(url => deleteImageByUrl(url)));

        // 3. Clear from Firestore
        const deletedQuery = await adminFirestore.collection('questions').where('status', '==', 'deleted').get();
        const batch = adminFirestore.batch();
        deletedQuery.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        revalidatePath('/teacher/tasks');
        return {
            success: true,
            message: `Firestore цэвэрлэгээ хийгдлээ. ${imageUrlsToDelete.size} зураг устгагдлаа. Sheet-ээс админ өөрөө \"deleted\" статустай мөрүүдийг шүүж устгана уу.`
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('purgeDeletedQuestions Error:', error);
        return { error: error.message };
    }
}

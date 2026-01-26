'use server';

import { getSpreadsheetData, updateSpreadsheetRow, appendSpreadsheetRow } from '@/lib/google-sheets';
import { uploadToDrive } from '@/lib/google-drive';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

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
        console.error('Error fetching questions:', (error as Error).message);
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
        console.error('Error fetching categories:', (error as Error).message);
        return [];
    }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertQuestion(question: any) {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const isMCQ = question.qType === 'MCQ';
    const sheetName = isMCQ ? 'MCQ' : 'Problem';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let values: any[][];
    if (isMCQ) {
        values = [[
            question.id || `MCQ-${Date.now()}`,
            question.status || 'active',
            question.subject || '',
            question.topic || '',
            question.subTopic || '',
            question.grade || '',
            question.bloom || '',
            question.difficulty || '',
            question.questionText || '',
            question.questionImage || '',
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
            question.correctAnswer || '',
            question.solutionText || '',
            question.solutionImage || '',
            new Date().toISOString()
        ]];
    } else {
        values = [[
            question.id || `PROB-${Date.now()}`,
            question.status || 'active',
            question.subject || '',
            question.topic || '',
            question.subTopic || '',
            question.grade || '',
            question.bloom || '',
            question.difficulty || '',
            question.questionText || '',
            question.questionImage || '',
            question.correctAnswer || '',
            question.solutionText || '',
            question.solutionImage || '',
            new Date().toISOString()
        ]];
    }

    try {
        const rangePrefix = `${sheetName}!A`;
        if (question.rowIndex) {
            const range = isMCQ ? `${rangePrefix}${question.rowIndex}:X${question.rowIndex}` : `${rangePrefix}${question.rowIndex}:N${question.rowIndex}`;
            await updateSpreadsheetRow(SPREADSHEET_ID, range, values);
        } else {
            const appendRange = isMCQ ? `${rangePrefix}2:X` : `${rangePrefix}2:N`;
            await appendSpreadsheetRow(SPREADSHEET_ID, appendRange, values);
        }
        revalidatePath('/teacher/tasks');
        return { success: true };
    } catch (error: unknown) {
        console.error('upsertQuestion Error:', error);
        throw new Error(`Failed to save question: ${(error as Error).message}`);
    }
}

export async function softDeleteQuestion(rowIndex: number, qType: string) {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    try {
        const sheetName = qType === 'MCQ' ? 'MCQ' : 'Problem';
        await updateSpreadsheetRow(SPREADSHEET_ID, `${sheetName}!B${rowIndex}:B${rowIndex}`, [['deleted']]);
        revalidatePath('/teacher/tasks');
        return { success: true };
    } catch (error: unknown) {
        console.error('softDeleteQuestion Error:', error);
        throw new Error(`Failed to delete question: ${(error as Error).message}`);
    }
}

export async function uploadImage(formData: FormData) {
    if (!DRIVE_FOLDER_ID) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID is not defined. Please add it to .env.local');
    }

    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    try {
        const result = await uploadToDrive(file, DRIVE_FOLDER_ID);
        return { url: result.webViewLink, fileId: result.id };
    } catch (error: unknown) {
        console.error('uploadImage Error:', error);
        throw new Error(`Failed to upload image: ${(error as Error).message}`);
    }
}

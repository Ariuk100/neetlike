import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
    // This endpoint is designed for sendBeacon usage (keepalive)
    // It accepts JSON or text payload. sendBeacon sends Blob/Form data usually, 
    // but we can send JSON Blob.

    try {
        let body;
        try {
            body = await req.json();
        } catch {
            // Fallback if content-type isn't application/json (sendBeacon sometimes sends plain text/blob)
            const text = await req.text();
            if (text) body = JSON.parse(text);
        }

        const { sessionId, studentName } = body || {};

        if (!sessionId || !studentName) {
            return NextResponse.json({ error: 'Missing sessionId or studentName' }, { status: 400 });
        }

        console.log(`[EXIT-API] Student ${studentName} exiting session ${sessionId}`);

        const userRef = adminFirestore
            .collection('whiteboard_sessions')
            .doc(sessionId)
            .collection('students')
            .doc(studentName);

        await userRef.set({
            status: 'offline',
            leftAt: new Date().toISOString()
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[EXIT-API] Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

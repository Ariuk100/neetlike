// app/api/admin/delete-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebaseAdmin'; // Firestore-г нэмж импортлосон

export async function POST(req: NextRequest) {
  try {
    // 🔴 ЧУХАЛ АЮУЛГҮЙ БАЙДЛЫН ШАЛГАЛТ: Энэ API-г зөвхөн админ хэрэглэгч дуудах ёстой.
    const sessionCookie = req.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized: Session cookie not found' }, { status: 401 });
    }
    const decodedCookie = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (decodedCookie.role !== 'admin') { // Зөвхөн админ үүрэгтэй хэрэглэгч энэ API-г дуудах боломжтой
      return NextResponse.json({ error: 'Forbidden: Only admins can delete users' }, { status: 403 });
    }

    const { uid } = await req.json() as { uid?: string };

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    // Firebase Authentication-аас хэрэглэгчийг устгах
    await adminAuth.deleteUser(uid);

    // Firestore-оос хэрэглэгчийн document-г устгах
    await adminFirestore.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true, message: `User ${uid} successfully deleted.` });
  } catch (error: unknown) { // Changed 'any' to 'unknown'
    console.error('Error deleting user:', error);
    let errorMessage = 'Failed to delete user';
    let errorCode: string | undefined;

    // Safely check error properties
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if the error object has a 'code' property, common in Firebase errors
      if ('code' in error) {
        errorCode = (error as { code: string }).code; // Type assertion to access 'code'
      }
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as { message: string }).message;
      if ('code' in error) {
        errorCode = (error as { code: string }).code;
      }
    }

    // Firebase Admin SDK-ийн алдааг илүү тодорхой харуулах
    if (errorCode === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found in Firebase Auth.' }, { status: 404 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

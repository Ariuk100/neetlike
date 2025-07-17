// app/api/admin/set-user-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin'; // Firebase Admin SDK-г импортлох

export async function POST(req: NextRequest) {
  try {
    // 🔴 ЧУХАЛ АЮУЛГҮЙ БАЙДЛЫН ШАЛГАЛТ: Энэ API-г зөвхөн админ хэрэглэгч дуудах ёстой.
    // Та энд нэвтэрсэн хэрэглэгчийн эрхийг шалгах логик нэмэх ёстой.
    // Жишээ нь:
    const sessionCookie = req.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized: Session cookie not found' }, { status: 401 });
    }
    const decodedCookie = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (decodedCookie.role !== 'admin') { // Зөвхөн админ үүрэгтэй хэрэглэгч энэ API-г дуудах боломжтой
      return NextResponse.json({ error: 'Forbidden: Only admins can change user roles' }, { status: 403 });
    }

    const { uid, role } = await req.json() as { uid?: string; role?: string };

    if (!uid || !role) {
      return NextResponse.json({ error: 'UID and role are required' }, { status: 400 });
    }

    // Хэрэглэгчийн Custom Claim-г тохируулна
    await adminAuth.setCustomUserClaims(uid, { role: role });

    // ID Token-г дахин шинэчлэхийг шаардах
    // Энэ нь хэрэглэгч дараагийн удаа нэвтрэх эсвэл ID Token-г шинэчлэх үед шинэ Custom Claim идэвхжихэд тусална.
    await adminAuth.revokeRefreshTokens(uid);

    return NextResponse.json({ success: true, message: `User ${uid}'s role set to ${role}. User needs to re-login.` });
  } catch (error: unknown) { // Changed 'any' to 'unknown'
    console.error('Error setting user role:', error);
    let errorMessage = 'Failed to set user role';

    // Safely check error properties
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as { message: string }).message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

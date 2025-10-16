import { NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/lib/firebaseAdmin';
// ✅ ЗАСВАРЛАСАН: Timestamp төрлийг зөв импортлов.
import { Timestamp as FirebaseFirestoreTimestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Энэ функц нь зөвхөн хамгийн сүүлд бүртгүүлсэн хэрэглэгчийн
// огноог (бидний "ETag") буцаах хөнгөн үүрэгтэй.
export async function GET(request: Request) {
  try {
    // Админ эсэхийг шалгана
    const sessionCookie = request.headers.get('cookie')?.match(/__session=([^;]+)/)?.[1];
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const usersRef = adminFirestore.collection('users');
    const lastUserQuery = usersRef.orderBy('createdAt', 'desc').limit(1);
    const snapshot = await lastUserQuery.get();

    if (snapshot.empty) {
      // ✅ ЗАСВАРЛАСАН: Илүүц 'ч' тэмдэгтийг устгав.
      return NextResponse.json({ version: null });
    }

    const lastUser = snapshot.docs[0].data();
    const lastTimestamp = lastUser.createdAt as FirebaseFirestoreTimestamp;
    
    // Хувилбарын дугаар болгон миллисекундыг буцаана
    return NextResponse.json({ version: lastTimestamp.toMillis() });

  } catch (error) {
    console.error("Failed to get users version:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
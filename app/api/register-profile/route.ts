// app/api/register-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin'; // Firebase Admin SDK Firestore instance
import { FieldValue } from 'firebase-admin/firestore'; // FieldValue-г ашиглахын тулд импортлоно

export async function POST(req: NextRequest) {
  try {
    const { uid, email, profileData } = await req.json(); // profileData нь нэр, овог, утас гэх мэт мэдээллийг агуулна

    if (!uid || !email || !profileData) {
      return NextResponse.json({ error: 'Missing uid, email, or profile data' }, { status: 400 });
    }

    // Transaction ашиглах шаардлагагүй болсон, учир нь readableId-г Cloud Function үүсгэж байна.
    // Зөвхөн хэрэглэгчийн профайл мэдээллийг merge хийж байна.
    const userDocRef = adminFirestore.collection('users').doc(uid);

    await userDocRef.set({
      uid: uid,
      email: email,
      // role болон readableId-г Cloud Function онооно, энд давхардахгүй
      createdAt: FieldValue.serverTimestamp(), // Сервер талын цагийн тэмдэг ашиглах
      ...profileData, // Бусад профайл талбаруудыг нэмэх
    }, { merge: true }); // Merge: Cloud Function-аас ирсэн readableId болон role-г дарж бичихгүй

    console.log(`✅ Server: User profile data updated in Firestore for UID: ${uid}`);

    return NextResponse.json({ success: true, message: 'User profile updated successfully' });
  } catch (err: unknown) { // 'any' -> 'unknown' болгосон
    // Алдааны мессежийг аюулгүйгээр авахын тулд type guard ашиглана.
    let errorMessage = 'Үл мэдэгдэх алдаа гарлаа.';
    if (err instanceof Error) {
        errorMessage = err.message;
    } else if (typeof err === 'string') {
        errorMessage = err;
    }
    console.error('🔥 Server: Firestore Write Error:', errorMessage);
    return NextResponse.json({ error: errorMessage || 'Failed to write to Firestore' }, { status: 500 });
  }
}

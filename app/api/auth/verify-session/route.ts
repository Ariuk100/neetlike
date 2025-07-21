// app/api/auth/verify-session/route.ts
// Энэ API маршрут нь Firebase Admin SDK ашиглан сешн кукиг баталгаажуулж, хэрэглэгчийн ролыг буцаана.
import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Firebase Admin SDK-г эхлүүлэх (зөвхөн нэг удаа)
// FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64-г .env.local-оос авна.
const serviceAccountKeyBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64;
let serviceAccount;

try {
  if (serviceAccountKeyBase64) {
    // Base64-ээс декод хийж, JSON болгон хувиргана.
    const decodedString = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decodedString);
  } else {
    // Хэрэв environment variable байхгүй бол анхааруулга өгнө.
    console.warn("FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64 environment variable not set. Firebase Admin SDK might not initialize correctly in production.");
  }
} catch (e: unknown) { // 'any' -> 'unknown' болгосон
  // Алдааны мессежийг аюулгүйгээр авах
  let errorMessage = 'Үл мэдэгдэх алдаа гарлаа.';
  if (e instanceof Error) {
    errorMessage = e.message;
  } else if (typeof e === 'string') {
    errorMessage = e;
  }
  console.error("Failed to decode or parse FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64:", errorMessage);
}

// Firebase Admin SDK-г эхлүүлнэ.
// getApps().length нь Firebase app аль хэдийн эхэлсэн эсэхийг шалгана.
if (!getApps().length && serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount),
  });
} else if (!serviceAccount) {
    console.error("Firebase Admin SDK not initialized: Service account key is missing or invalid.");
}

export async function POST(request: Request) {
  const { sessionCookie } = await request.json();

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Session cookie шаардлагатай.' }, { status: 400 });
  }

  try {
    // Firebase Admin SDK ашиглан session cookie-г баталгаажуулна.
    // checkRevoked: true нь token хүчингүй болсон эсэхийг шалгана.
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    
    // Хэрэглэгчийн UID болон үүргийг буцаана.
    // Custom claim 'role' байхгүй бол 'student' гэсэн анхдагч утгыг өгнө.
    return NextResponse.json({ user: { uid: decodedClaims.uid, role: decodedClaims.role || 'student' } }, { status: 200 });
  } catch (error: unknown) { // 'any' -> 'unknown' болгосон
    // Алдааны мессежийг аюулгүйгээр авахын тулд type guard ашиглана.
    let errorMessage = 'Үл мэдэгдэх алдаа гарлаа.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    console.error('API: Session cookie баталгаажуулах амжилтгүй боллоо:', errorMessage);
    
    // Сешн хүчингүй болсон тохиолдолд алдаа буцаана.
    return NextResponse.json({ error: 'Session cookie хүчингүй эсвэл хугацаа нь дууссан байна.', details: errorMessage }, { status: 401 });
  }
}

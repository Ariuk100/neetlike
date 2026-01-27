// lib/firebaseAdmin.ts
// 🔴 ЭНЭ МӨРИЙГ ӨӨРЧИЛЛӨӨ:
import admin from 'firebase-admin'; // * as admin-ийг admin болгон өөрчлөв

// Firebase Admin SDK-г нэг л удаа эхлүүлэхийг шалгана
if (!admin.apps.length) {
  try {
    // Base64 кодлогдсон Service Account Key-г орчны хувьсагчаас авна
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64;

    if (!serviceAccountBase64) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64 орчны хувьсагчид тохируулагдаагүй байна.');
    }

    // Base64-ээс буцааж JSON string болгоно
    // Энэ нь private_key доторх \\n-ийг \n болгон автоматаар хувиргана.
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');

    // JSON string-ийг объект болгон парс хийнэ
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Firebase Admin SDK-г эхлүүлнэ
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Firebase Admin эхлүүлэхэд алдаа гарлаа:', error);
  }
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export const adminStorage = admin.storage();
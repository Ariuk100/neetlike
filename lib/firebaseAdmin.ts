// lib/firebaseAdmin.ts
// 🔴 ЭНЭ МӨРИЙГ ӨӨРЧИЛЛӨӨ:
import admin from 'firebase-admin'; // * as admin-ийг admin болгон өөрчлөв

// Firebase Admin SDK-г нэг л удаа эхлүүлэхийг шалгана
if (!admin.apps.length) {
  try {
    console.log('Attempting to initialize Firebase Admin SDK...');

    // Base64 кодлогдсон Service Account Key-г орчны хувьсагчаас авна
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64;

    // Дибаг логууд (асуудал шийдэгдсэний дараа хасаж болно)
    console.log('1. serviceAccountBase64 (first 50 chars):', serviceAccountBase64 ? serviceAccountBase64.substring(0, 50) + '...' : 'UNDEFINED or EMPTY');
    console.log('1. serviceAccountBase64 length:', serviceAccountBase64 ? serviceAccountBase64.length : 'N/A');

    if (!serviceAccountBase64) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_BASE64 орчны хувьсагчид тохируулагдаагүй байна.');
    }

    // Base64-ээс буцааж JSON string болгоно
    // Энэ нь private_key доторх \\n-ийг \n болгон автоматаар хувиргана.
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    
    // Дибаг логууд
    console.log('2. serviceAccountJson (first 100 chars):', serviceAccountJson.substring(0, 100) + '...');
    console.log('2. serviceAccountJson length:', serviceAccountJson.length);

    // JSON string-ийг объект болгон парс хийнэ
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Дибаг логууд
    console.log('3. serviceAccount object keys:', Object.keys(serviceAccount));
    console.log('3. serviceAccount.project_id:', serviceAccount.project_id);
    console.log('3. serviceAccount.private_key_id (first 10 chars):', serviceAccount.private_key_id.substring(0, 10) + '...');

    // Firebase Admin SDK-г эхлүүлнэ
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
      // storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
    });
    console.log('Firebase Admin SDK амжилттай эхлүүллээ!');
  } catch (error) {
    console.error('Firebase Admin эхлүүлэхэд алдаа гарлаа:', error);
  }
}

export const adminAuth = admin.auth();
// export const adminFirestore = admin.firestore(); // Хэрэв Firestore ашиглах бол uncomment хийнэ

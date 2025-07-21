// functions/src/index.ts
import { auth } from "firebase-functions/v1"; // v1 auth-г импортлоно
import * as admin from "firebase-admin";
import { UserRecord } from 'firebase-admin/auth'; // UserRecord-ийн төрлийг импортлоно

// Firebase Admin SDK-г эхлүүлнэ
admin.initializeApp();

// Firestore Reference for storing the last readable ID (or a counter)
const countersDocRef = admin.firestore().collection('metadata').doc('counters');

// Firebase Authentication-д шинэ хэрэглэгч бүртгэгдэх үед ажиллана
export const setStudentRoleAndReadableId = auth.user().onCreate(async (user: UserRecord) => {
  const firestore = admin.firestore(); // Firestore instance-г авах

  let finalReadableId: number;

  try {
    // 1. Readable ID-г Transaction ашиглан нэгээр нэмэгдүүлж, Firestore дээрх user document-д хадгалах
    await firestore.runTransaction(async (transaction) => {
      const countersDoc = await transaction.get(countersDocRef);

      let currentId = 0;
      if (countersDoc.exists) {
        currentId = (countersDoc.data()?.nextReadableId as number) || 0;
      }
      finalReadableId = currentId + 1;

      // Тоолуурыг шинэчилнэ
      transaction.set(countersDocRef, { nextReadableId: finalReadableId });

      // Firestore дээр хэрэглэгчийн баримтыг үүсгэх эсвэл шинэчлэх
      const userDocRef = firestore.collection('users').doc(user.uid);
      transaction.set(userDocRef, {
        uid: user.uid,
        email: user.email || null,
        role: "student", // ✅ Role-г энд онооно
        readableId: finalReadableId, // ✅ ReadableId-г энд онооно
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // 🔴 ЭНДЭЭС name, lastName, phone, school, grade, gender, birthYear, province, district-г ХАСАХ ёстой!
        // Эдгээрийг /api/register-profile API хариуцна.
      }, { merge: true }); // merge: true нь одоо байгаа талбаруудыг дарж бичихгүй

      console.log(`✅ Transaction completed for user: ${user.uid} with readableId: ${finalReadableId}`);
    });

    // 2. Custom Claims-д зөвхөн "student" role-г оноох
    const existingClaims = (await admin.auth().getUser(user.uid)).customClaims || {};
    await admin.auth().setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: "student",
    });
    console.log(`✅ Custom claims updated for user: ${user.uid} with only role.`);

  } catch (error) {
    console.error(`❌ Error processing user creation for ${user.uid}:`, error);
  }
});
// functions/src/index.ts

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { UserRecord } from 'firebase-admin/auth';

admin.initializeApp();

// =================================================================
// 1. NEW USER REGISTRATION FUNCTION
// =================================================================
const countersDocRef = admin.firestore().collection('metadata').doc('counters');

export const setStudentRoleAndReadableId = functions.auth.user().onCreate(async (user: UserRecord) => {
  const firestore = admin.firestore();
  let finalReadableId: number;

  try {
    await firestore.runTransaction(async (transaction) => {
      // ✅ Using 'countersDocRef' here, which will fix the warning.
      const countersDoc = await transaction.get(countersDocRef);
      
      let currentId = 0;
      if (countersDoc.exists) {
        currentId = (countersDoc.data()?.nextReadableId as number) || 0;
      }
      finalReadableId = currentId + 1;

      transaction.set(countersDocRef, { nextReadableId: finalReadableId });

      const userDocRef = firestore.collection('users').doc(user.uid);
      transaction.set(userDocRef, {
        uid: user.uid,
        email: user.email || null,
        role: "student",
        readableId: finalReadableId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const existingClaims = (await admin.auth().getUser(user.uid)).customClaims || {};
    await admin.auth().setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: "student",
    });
    console.log(`✅ Custom claims updated for user: ${user.uid} with role.`);

  } catch (error) {
    console.error(`❌ Error processing user creation for ${user.uid}:`, error);
  }
});



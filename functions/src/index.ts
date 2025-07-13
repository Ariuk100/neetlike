
    import * as functions from 'firebase-functions/v1'; 
    import * as admin from 'firebase-admin';


    if (!admin.apps.length) {
      admin.initializeApp();
    }


    const db = admin.firestore();

    export const assignReadableIdOnUserCreate = functions.auth.user().onCreate(async (user: functions.auth.UserRecord) => {

      if (!user || !user.uid) {
        console.error('Cloud Function: User object is undefined or missing UID.');
        return null; // Алдааг бүртгээд функцийг дуусгана
      }

      const userId = user.uid;
      const userEmail = user.email || ''; // Email байхгүй байж болно
      const userName = user.displayName || ''; // DisplayName байхгүй байж болно

      
      console.log(`New user created in Auth: ${userId}, Email: ${userEmail}`);

      try {
        const usersRef = db.collection('users');
        const lastUserQuery = usersRef.orderBy('createdAt', 'desc').limit(1); // 'createdAt'-аар эрэмбэлж, хамгийн сүүлийнхийг авна
        const querySnapshot = await lastUserQuery.get();

        let newReadableId = 'S0001'; // Анхны readableId (хэрэв хэрэглэгч байхгүй бол)

        if (!querySnapshot.empty) {
          const lastUserDoc = querySnapshot.docs[0];
          const lastUserData = lastUserDoc.data();
          const lastReadableId = lastUserData.readableId; // Хамгийн сүүлийн хэрэглэгчийн readableId-г авна

          // ReadableId-г парс хийж, дараагийн дугаарыг үүсгэх
          if (lastReadableId && typeof lastReadableId === 'string' && lastReadableId.startsWith('S') && lastReadableId.length === 5) {
            const numPart = parseInt(lastReadableId.substring(1), 10); // 'S' үсгийг хасаад тоог авна
            if (!isNaN(numPart)) { // Тоо зөв эсэхийг шалгана
              newReadableId = 'S' + String(numPart + 1).padStart(4, '0'); // Дараагийн тоог үүсгэж, 4 оронтой болгоно
            }
          }
        }

        await usersRef.doc(userId).set({
          uid: userId,
          email: userEmail,
          name: userName, // Google-ээр нэвтэрсэн бол displayName-г ашиглана
          role: 'student', // Шинэ хэрэглэгчдэд анхдагч үүргийг 'student' гэж өгнө
          createdAt: admin.firestore.FieldValue.serverTimestamp(), // Сервер талын цагийг ашиглана
          readableId: newReadableId, // Үүсгэсэн readableId-г нэмнэ
   
        }, { merge: true });

        console.log(`Assigned readableId ${newReadableId} to user ${userId}`);
        return null; 
      } catch (error) {
        console.error(`Error assigning readableId to user ${userId}:`, error);
        return null; 
      }
    });
    
'use client'; // ✅ Энэ модулийг зөвхөн клиент талд ашиглахыг заана

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

// Таны web app-ын Firebase тохиргоо
// Эдгээр утгуудыг .env.local файлаас уншина
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Firebase-г нэг л удаа эхлүүлнэ
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase үйлчилгээнүүдийг эхлүүлнэ
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// ✅ Analytics-г зөвхөн дэмждэг орчинд (браузер) эхлүүлнэ
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported().then((isSupported) => {
    if (isSupported) {
      analytics = getAnalytics(app);
    }
  });
}
export { analytics };


// (Сонголт) Хөгжүүлэлтийн орчинд Firebase Emulator-тэй холбогдох хэсэг
// .env.local файлд NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true гэж тохируулсан үед ажиллана
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  // ✅ Нэгэнт холбогдсон эсэхийг шалгах нь илүү найдвартай
  // emulatorConfig нь private property боловч шалгахад хэрэгтэй
  if (!auth.emulatorConfig) {
    try {
      console.log("==== FIREBASE AUTH EMULATOR-ТЭЙ ХОЛБОГДОЖ БАЙНА ====");
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    } catch (e) {
      console.error("Auth Emulator холболт алдаа:", e);
    }
  }

  // @ts-expect-error - _settings нь private property
  if (db.toJSON().settings.host !== '127.0.0.1:8080') {
    try {
      console.log("==== FIREBASE FIRESTORE EMULATOR-ТЭЙ ХОЛБОГДОЖ БАЙНА ====");
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch (e) {
      console.error("Firestore Emulator холболт алдаа:", e);
    }
  }

  // @ts-expect-error - _protocol нь private property
  if (storage.protocol !== 'http') {
    try {
      console.log("==== FIREBASE STORAGE EMULATOR-ТЭЙ ХОЛБОГДОЖ БАЙНА ====");
      connectStorageEmulator(storage, '127.0.0.1', 9199);
    } catch (e) {
      console.error("Storage Emulator холболт алдаа:", e);
    }
  }
}

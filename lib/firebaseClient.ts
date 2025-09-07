// lib/firebaseClient.ts
// Client-side Firebase init (Auth гэх мэт). SSR дээр ашиглахгүй.
// Энэ модулийг зөвхөн "use client" компонентуудаас импортлоорой.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";

// ⬇️ .env (public) хувьсагчдаас config уншина
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// App-ийг нэг л удаа үүсгэнэ
export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth instance
export const auth: Auth = getAuth(firebaseApp);

// (Сонголт) Эмулятор ашиглах бол:
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true үед http://localhost:9099 руу холбож болно.
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
) {
  try {
    // Хоёр удаа холбохоос сэргийлэх
    // @ts-expect-error — private flag, зөвхөн давхцлаас сэргийлэх зорилготой
    if (!auth._customEmulatorHost) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
  } catch {
    // no-op
  }
}
// lib/firebaseClient.ts
'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  // Зөвхөн browser дээр initialize хийнэ
  if (typeof window === 'undefined') return null;

  if (!app) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

    if (!apiKey || !projectId || !appId) {
      // Client-д ч гэсэн дутагдвал инициализ хийхгүй — runtime error-оос сэргийлнэ
      return null;
    }

    app = getApps()[0] ?? initializeApp({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    });
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}
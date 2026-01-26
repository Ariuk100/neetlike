'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut, signInWithCustomToken, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface CustomUser {
  displayName: string | null;
  uid: string;
  email: string | null;
  role?: 'admin' | 'teacher' | 'student' | 'moderator';
  readableId?: number;
  name?: string;
  photoURL?: string | null;
  lastName?: string;
  phone?: string;
  school?: string;
  grade?: string;
  gender?: '' | 'male' | 'female' | 'other';
  birthYear?: number | null;
  province?: string;
  district?: string;
  createdAt?: Timestamp;
  providerId?: string;
}

export interface AuthContextType {
  user: CustomUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const firestoreUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    const handleUserSnapshot = (uid: string, role: string, fbUser: FirebaseUser) => {
      const userDocRef = doc(db, 'users', uid);
      if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();

      firestoreUnsubscribeRef.current = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (!isMountedRef.current) return;

          let firestoreUserData: Partial<CustomUser> = {};
          if (docSnap.exists()) {
            firestoreUserData = docSnap.data() as Partial<CustomUser>;
          }

          const finalUser: CustomUser = {
            uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            providerId: fbUser.providerData?.[0]?.providerId ?? '',
            role: role as CustomUser['role'],
            ...firestoreUserData,
            name: firestoreUserData.name || fbUser.displayName || 'Хэрэглэгч',
          };

          setUser(finalUser);
          setFirebaseUser(fbUser);
          setLoading(false);
        },
        (firestoreError) => {
          console.error('Firestore snapshot error:', firestoreError);
          setError(firestoreError.message);
          setLoading(false);
        },
      );
    };

    const authStateSubscription = onAuthStateChanged(auth, async (fbUserCurrent) => {
      if (!isMountedRef.current) return;
      if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();

      if (fbUserCurrent) {
        // ✅ Клиент талд нэвтэрсэн үед: ID token-оо ашиглана (force refresh хийхгүй)
        const tokenResult = await fbUserCurrent.getIdTokenResult();

        // Session sync-ийг background-д хийнэ (await хийхгүйгээр UI-г хурдан харуулна)
        fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: tokenResult.token }),
        }).catch(e => console.error('Session sync (login) failed:', e));

        const role = (tokenResult.claims.role as string) || 'student';
        handleUserSnapshot(fbUserCurrent.uid, role, fbUserCurrent);
      } else {
        // ✅ Хөтчийг дахин нээх үед: серверийн session-оор сэргээх оролдлого
        try {
          const res = await fetch('/api/auth/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (res.ok && res.status !== 204) {
            const { customToken } = (await res.json()) as { customToken?: string };
            if (customToken && isMountedRef.current) {
              // Серверээс ирсэн custom token-оор клиент талд дахин нэвтэрнэ.
              await signInWithCustomToken(auth, customToken);

              // ⬇️ sign-in хийсний дараа шинэ ID token авч __session cookie-г тавина
              const freshIdToken = await auth.currentUser?.getIdToken(true);
              if (freshIdToken) {
                try {
                  await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ token: freshIdToken }),
                  });
                } catch (e) {
                  console.error('Session sync after custom sign-in failed:', e);
                }
              }
              return;
            }
          }

          // Сервер дээр ч session байхгүй бол бүрэн гарсан гэж үзнэ
          if (isMountedRef.current) {
            setUser(null);
            setFirebaseUser(null);
            setLoading(false);
          }
        } catch (e) {
          console.error('Session verification fetch failed:', e);
          if (isMountedRef.current) {
            setUser(null);
            setFirebaseUser(null);
            setLoading(false);
          }
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      authStateSubscription();
      if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();
    };
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout API failed:', e);
    }
    await signOut(auth);
    if (isMountedRef.current) {
      setUser(null);
      setFirebaseUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
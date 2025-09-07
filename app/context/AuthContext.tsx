'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
// Monitoring imports will be used when implementing performance tracking

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

  const STORAGE_KEY = 'auth_user';
  const isMountedRef = useRef(true); // ✅ Race condition засах

  useEffect(() => {
    isMountedRef.current = true;
    
    const cachedUser = localStorage.getItem(STORAGE_KEY);
    if (cachedUser && isMountedRef.current) {
      try {
        setUser(JSON.parse(cachedUser));
        setLoading(false);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    let firestoreUnsubscribe: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMountedRef.current) return; // ✅ Component unmount шалгах

      setLoading(true);
      setError(null);

      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = undefined;
      }

      if (fbUser) {
        setFirebaseUser(fbUser);

        try {
          if (!isMountedRef.current) return; // ✅ Async operation өмнө шалгах

          // 🔑 Токеноос role авч байна
          const token = await fbUser.getIdToken(true);
          
          if (!isMountedRef.current) return; // ✅ Token авсны дараа шалгах
          
          const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (!isMountedRef.current) return; // ✅ Fetch хийсний дараа шалгах
          
          const loginData = await loginRes.json();
          if (!loginRes.ok) throw new Error(loginData.error || 'Login API failed');

          const { uid, role } = loginData; // 👈 эндээс role ирж байна

          const userDocRef = doc(db, 'users', uid);
          firestoreUnsubscribe = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (!isMountedRef.current) return; // ✅ Firestore snapshot дээр шалгах

              let firestoreUserData: Partial<CustomUser> = {};
              if (docSnap.exists()) {
                firestoreUserData = docSnap.data() as Partial<CustomUser>;
              } else {
                console.warn(
                  `AuthContext: UID: ${fbUser.uid} -д Firestore баримт олдсонгүй.`
                );
              }

              // ✅ CustomUser үүсгэх
              const customUser: CustomUser = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName,
                role: role, // 👈 API-аас ирсэн role
                ...firestoreUserData,
                // Зураг override: эхлээд Firebase → Firestore → эцэст нь null
                photoURL: fbUser.photoURL || firestoreUserData.photoURL || null,
                name:
                  firestoreUserData.name ||
                  fbUser.displayName ||
                  fbUser.email?.split('@')[0] ||
                  'Хэрэглэгч',
                readableId: firestoreUserData.readableId as number | undefined,
              };

              if (isMountedRef.current) {
                setUser(customUser);
                setLoading(false);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(customUser));
              }
            },
            (firestoreError) => {
              if (!isMountedRef.current) return;
              
              console.error(
                '🔥 AuthContext: Firestore сонсоход алдаа:',
                firestoreError
              );
              setError(
                firestoreError.message || 'Firestore мэдээлэл татахад алдаа.'
              );
              setUser(null);
              setLoading(false);
            }
          );
        } catch (err: unknown) {
          if (!isMountedRef.current) return;
          
          console.error('AuthContext error:', err);
          setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
          setUser(null);
          setLoading(false);
        }
      } else {
        if (isMountedRef.current) {
          setUser(null);
          setFirebaseUser(null);
          setLoading(false);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    });

    return () => {
      isMountedRef.current = false; // ✅ Cleanup дээр false болгох
      unsubscribeAuth();
      if (firestoreUnsubscribe) firestoreUnsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, error, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
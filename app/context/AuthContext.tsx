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

      firestoreUnsubscribeRef.current = onSnapshot(userDocRef, (docSnap) => {
        if (!isMountedRef.current) return;
        
        let firestoreUserData: Partial<CustomUser> = {};
        if (docSnap.exists()) {
          firestoreUserData = docSnap.data() as Partial<CustomUser>;
        }

        const finalUser: CustomUser = {
          uid: uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          providerId: fbUser.providerData?.[0]?.providerId ?? "",
          role: role as CustomUser['role'],
          ...firestoreUserData,
          name: firestoreUserData.name || fbUser.displayName || "Хэрэглэгч",
        };
        
        setUser(finalUser);
        setFirebaseUser(fbUser);
        setLoading(false);
      }, (firestoreError) => {
        console.error("Firestore snapshot error:", firestoreError);
        setError(firestoreError.message);
        setLoading(false);
      });
    };

    const authStateSubscription = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMountedRef.current) return;
      if (firestoreUnsubscribeRef.current) firestoreUnsubscribeRef.current();

      if (fbUser) {
        // Хэрэглэгч клиент талд нэвтэрсэн үед
        const tokenResult = await fbUser.getIdTokenResult();
        const role = (tokenResult.claims.role as string) || 'student';
        handleUserSnapshot(fbUser.uid, role, fbUser);
      } else {
        // Хөтчийг дахин нээх үед энд ажиллана
        try {
          const res = await fetch('/api/auth/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          
          if (res.ok && res.status !== 204) {
            const { customToken } = await res.json() as { customToken?: string };
            if (customToken && isMountedRef.current) {
              // Серверээс ирсэн custom token-оор клиент талд дахин нэвтэрнэ.
              // Энэ нь onAuthStateChanged-г дахин ажиллуулж, fbUser-тэй болгоно.
              await signInWithCustomToken(auth, customToken);
              return; 
            }
          }
          
          // Сервер дээр ч session байхгүй бол бүрэн гарсан гэж үзнэ
          if(isMountedRef.current) {
            setUser(null);
            setFirebaseUser(null);
            setLoading(false);
          }
        } catch (e) {
            console.error("Session verification fetch failed:", e);
            if(isMountedRef.current) {
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
    } catch (error) {
      console.error("Logout API failed:", error);
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
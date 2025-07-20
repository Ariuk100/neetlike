'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { auth, db } from '@/lib/firebase'; 

// Хэрэглэгчийн мэдээллийн төрлийг тодорхойлно
// Firebase User обьектийг өргөжүүлсэн
interface CustomUser extends User {
  role?: string; 
  name?: string; 
  phone?: string; 
  school?: string; 
  lastName?: string; 
  teacherId?: string; 
  gender?: 'male' | 'female' | 'other'; 
  birthYear?: number | null; // null-ийг нэмсэн
  province?: string; 
  district?: string; 
  readableId?: string; 
}

// AuthContext-ийн утгын төрлийг тодорхойлно
interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  error: string | null;
}

// Context-ийг үүсгэнэ
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider компонент
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          console.log('AuthContext: Full ID Token Claims:', idTokenResult.claims);

          const customRole = idTokenResult.claims.role as string || 'student';

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let firestoreUserData: Partial<CustomUser> = {};
          if (userDocSnap.exists()) {
            firestoreUserData = userDocSnap.data() as Partial<CustomUser>;
            console.log('AuthContext: Firestore User Data:', firestoreUserData);
          } else {
            console.warn('AuthContext: User document not found in Firestore for UID:', firebaseUser.uid, '. Creating new document...');
            
            // � ЭНДХИЙГ ЗАСАВ: birthYear-ийг null утгаар шууд оноосон.
            const initialUserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Хэрэглэгч',
              role: customRole, 
              createdAt: new Date().toISOString(),
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Хэрэглэгч',
              lastName: '',
              phone: '',
              school: '',
              teacherId: '',
              gender: 'other' as 'male' | 'female' | 'other', 
              birthYear: null as number | null, // 🔴 ЭНДХИЙГ ЗАСАВ: null утгыг тодорхой оноосон
              province: '',
              district: '',
              readableId: '', 
            };
            await setDoc(userDocRef, initialUserData);
            firestoreUserData = initialUserData; 
            console.log('AuthContext: New user document created in Firestore for UID:', firebaseUser.uid);
          }

          const customUser: CustomUser = {
            ...firebaseUser, 
            ...firestoreUserData, 
            role: customRole, 
            name: firestoreUserData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Хэрэглэгч',
          };
          setUser(customUser);
          console.log('AuthContext: User state updated with merged data:', customUser);
        } catch (err: unknown) {
          const errorAsFirebaseError = err as { code?: string; message: string };
          console.error('AuthContext: Error getting user data or claims:', errorAsFirebaseError);
          setError(errorAsFirebaseError.message || 'Failed to get user data.');
          setUser(null);
        }
      } else {
        setUser(null);
        console.log('AuthContext: User is signed out.');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const contextValue: AuthContextType = { user, loading, error };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Context-ийг ашиглах custom hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

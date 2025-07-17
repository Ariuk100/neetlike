// app/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Firestore imports
import { auth, db } from '@/lib/firebase'; // Firebase auth and db instances

// Хэрэглэгчийн мэдээллийн төрлийг тодорхойлно
// Firebase User обьектийг өргөжүүлсэн
interface CustomUser extends User {
  role?: string; // Custom Claim-ээс ирэх role
  name?: string; // Firestore эсвэл displayName-ээс ирэх нэр
  phone?: string; // Firestore-оос ирэх утасны дугаар
  school?: string; // Firestore-оос ирэх сургууль
  lastName?: string; // Firestore-оос ирэх овог
  teacherId?: string; // Firestore-оос ирэх багшийн ID (сурагч бол)
  gender?: 'male' | 'female' | 'other'; // Firestore-оос ирэх хүйс
  birthYear?: number; // Firestore-оос ирэх төрсөн он
  province?: string; // Firestore-оос ирэх аймаг
  district?: string; // Firestore-оос ирэх сум
  readableId?: string; // Firestore-оос ирэх readableId
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
          // ID Token-г хүчээр шинэчилж, Custom Claims-г авна
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          
          console.log('AuthContext: Full ID Token Claims:', idTokenResult.claims);

          const customRole = idTokenResult.claims.role as string || 'student'; // Role-г Custom Claims-ээс авна

          // Firestore-оос хэрэглэгчийн нэмэлт мэдээллийг татах
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let firestoreUserData: Partial<CustomUser> = {};
          if (userDocSnap.exists()) {
            firestoreUserData = userDocSnap.data() as Partial<CustomUser>;
            console.log('AuthContext: Firestore User Data:', firestoreUserData);
          } else {
            console.warn('AuthContext: User document not found in Firestore for UID:', firebaseUser.uid);
            // Хэрэв Firestore-д байхгүй бол эхний бүртгэлийг хийх шаардлагатай байж болно.
            // Эсвэл Cloud Function нь readableId-г үүсгэхээс өмнө энд ачаалж байж болно.
          }

          // CustomUser объект үүсгэнэ
          const customUser: CustomUser = {
            ...firebaseUser, // Firebase User-ийн үндсэн талбарууд (uid, email, displayName, photoURL)
            ...firestoreUserData, // Firestore-оос ирсэн нэмэлт талбарууд (name, phone, school, lastName, gender, birthYear, province, district, readableId)
            role: customRole, // Custom Claims-ээс ирсэн role (Firestore-ын role-оос илүү нэгдүгээр эрэмбэтэй)
            // Name-ийг Firestore-оос эсвэл displayName-ээс авна
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

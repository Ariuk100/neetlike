// app/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'; 
import { auth, db } from '@/lib/firebase';

// Хэрэглэгчийн мэдээллийн төрлийг тодорхойлно (таныхтай ижил байна)
interface CustomUser {
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

// AuthContext-ийн төрлийг тодорхойлно
interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  error: string | null;
}

// Context-г үүсгэнэ
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider компонент
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect нь Firebase Auth-ийн төлөв өөрчлөгдөх бүрт ажиллана.
  useEffect(() => {
    // Firestore listener-г гадна зарлана. Ингэснээр 'onAuthStateChanged' доторх
    // өөрчлөлтүүдийг хянах боломжтой болно.
    let firestoreUnsubscribe: (() => void) | undefined; 

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Мэдээлэл ачаалж эхлэхэд loading-г true болгоно
      setError(null);    // Өмнөх алдааг цэвэрлэнэ

      // 🔴 ЭНЭ НЬ ЧУХАЛ: Өмнөх Firestore listener-г цэвэрлэнэ.
      // Хэрэглэгчийн төлөв өөрчлөгдөх бүрт (нэвтрэх, гарах, шинэчлэх г.м.)
      // хуучин listener-г зогсоож, шинээр үүсгэнэ.
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = undefined; // Цэвэрлэсний дараа undefined болгоно.
        console.log('AuthContext: Хуучин Firestore listener-г цэвэрлэв.');
      }

      if (firebaseUser) { // Хэрэв хэрэглэгч нэвтэрсэн бол
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          console.log('AuthContext: Full ID Token Claims:', idTokenResult.claims);

          const customRole = (idTokenResult.claims.role as 'admin' | 'teacher' | 'student' | 'moderator') || 'student';

          const userDocRef = doc(db, 'users', firebaseUser.uid);

          // onSnapshot-г ашиглан хэрэглэгчийн баримтыг real-time-аар сонсоно
          firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            let firestoreUserData: Partial<CustomUser> = {};
            if (docSnap.exists()) {
              firestoreUserData = docSnap.data() as Partial<CustomUser>;
              console.log('AuthContext: Firestore хэрэглэгчийн баримт шинэчлэгдлээ/олдлоо:', firestoreUserData);
            } else {
              console.warn(`AuthContext: UID: ${firebaseUser.uid} -д холбогдох хэрэглэгчийн баримт олдсонгүй (Firestore).`);
            }

            const customUser: CustomUser = {
              ...firebaseUser,
              ...firestoreUserData,
              role: customRole,
              name: firestoreUserData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Хэрэглэгч',
              readableId: firestoreUserData.readableId as number | undefined,
            };

            setUser(customUser);
            console.log('AuthContext: User state-г нэгтгэсэн мэдээллээр шинэчиллээ:', customUser);
            setLoading(false);
          }, (firestoreError) => {
            console.error('🔥 AuthContext: Firestore баримтыг сонсоход алдаа гарлаа:', firestoreError);
            // Firestore-оос алдаа гарвал, хэрэглэгчийг null болгож, эрхийн алдааг зогсооно.
            setError(firestoreError.message || 'Firestore мэдээлэл татахад алдаа гарлаа.');
            setUser(null); 
            setLoading(false);
            // Алдаа гарсан үед listener-г зогсоох нь чухал.
            if (firestoreUnsubscribe) {
                firestoreUnsubscribe();
                firestoreUnsubscribe = undefined;
            }
          });

        } catch (err: unknown) {
          const errorAsFirebaseError = err as { code?: string; message: string };
          console.error('🔥 AuthContext: Хэрэглэгчийн мэдээлэл эсвэл Claims авах үед алдаа гарлаа:', errorAsFirebaseError);
          setError(errorAsFirebaseError.message || 'Хэрэглэгчийн мэдээллийг татаж чадсангүй.');
          setUser(null);
          setLoading(false);
          // Алдаа гарсан үед Firestore listener-г зогсооно.
          if (firestoreUnsubscribe) {
              firestoreUnsubscribe();
              firestoreUnsubscribe = undefined;
          }
        }
      } else {
        // Хэрэв хэрэглэгч нэвтрээгүй бол (logout хийсэн эсвэл сесс байхгүй)
        setUser(null);
        setLoading(false);
        console.log('AuthContext: Хэрэглэгч нэвтрээгүй байна.');
        // Firestore listener нь дээр (onAuthStateChanged-ийн эхэнд) цэвэрлэгдсэн тул энд давхар цэвэрлэх шаардлагагүй.
      }
    });

    // useEffect-ийн үндсэн цэвэрлэх функц:
    // Компонент unmount хийгдэх эсвэл dependencies өөрчлөгдөх үед дуудагдана.
    // Firebase Auth listener болон хамгийн сүүлийн идэвхтэй Firestore listener-г цэвэрлэнэ.
    return () => {
      unsubscribeAuth(); // Firebase Auth listener-г зогсооно
      if (firestoreUnsubscribe) { // Сүүлийн идэвхтэй Firestore listener-г зогсооно
        firestoreUnsubscribe();
        console.log('AuthContext: useEffect cleanup: Firestore listener цэвэрлэв.');
      }
    };
  }, []); // Dependencies хоосон хэвээр, учир нь listener-уудыг дотор нь зохицуулж байна.

  const contextValue: AuthContextType = { user, loading, error };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth Hook: Context-г ашиглахын тулд
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth хукийг AuthProvider дотор ашиглах ёстой.');
  }
  return context;
}
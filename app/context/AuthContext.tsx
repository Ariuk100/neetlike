// app/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Таны Firebase auth instance

// Хэрэглэгчийн мэдээллийн төрлийг тодорхойлно
interface CustomUser extends User {
  role?: string; // Custom Claim-ээс ирэх role
  name?: string; // display name-ийг name болгож болно
  school?: string; // school талбар нэмэгдлээ
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
          // 🔴 ЧУХАЛ: ID Token-г хүчээр шинэчилж, Custom Claims-г авна
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          
          // 🔴 НЭМЭЛТ ЛОГ: ID Token-оос ирсэн бүх claims-ийг хэвлэх
          console.log('AuthContext: Full ID Token Claims:', idTokenResult.claims);

          const customRole = idTokenResult.claims.role as string || 'student'; // Role-г Custom Claims-ээс авна

          // CustomUser объект үүсгэнэ
          const customUser: CustomUser = {
            ...firebaseUser,
            role: customRole,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Хэрэглэгч', // Нэр байхгүй бол email-ээс авна
          };
          setUser(customUser);
          console.log('AuthContext: User state updated with role:', customUser.role);
        } catch (err: unknown) { // 'any' to 'unknown'
          const errorAsFirebaseError = err as { code?: string; message: string }; // Type assertion
          console.error('AuthContext: Error getting ID token result or claims:', errorAsFirebaseError);
          setError(errorAsFirebaseError.message || 'Failed to get user claims.');
          setUser(null); // Алдаа гарвал хэрэглэгчийг null болгоно
        }
      } else {
        setUser(null);
        console.log('AuthContext: User is signed out.');
      }
      setLoading(false);
    });

    // Компонент устгагдах үед listener-г зогсооно
    return () => unsubscribe();
  }, []);

  // Context-ийн утгыг буцаана
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

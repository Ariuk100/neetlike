"use client";

import { auth } from "@/lib/firebase"; // firebaseClient-ийн оронд firebase ашигласан нь зөв
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { Button } from "@/components/ui/button";

export default function LoginWithGoogleButton() {
  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // ✅ Зөвхөн нэвтрэх үйлдлийг эхлүүлнэ.
      await signInWithPopup(auth, provider);
      // Үүний дараа AuthProvider автоматаар бүхнийг хийнэ.
      // Эндээс /api/login дуудах, хуудас refresh хийх шаардлагагүй.
    } catch (error) {
      console.error("Popup failed, trying redirect...", error);
      // Popup блоклогдсон үед redirect хийх нь зөв хэвээрээ.
      await signInWithRedirect(auth, provider);
    }
  };

  return (
    <Button variant="outline" onClick={signIn} className="w-full">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="mr-2">
        {/* SVG path-ууд хэвээрээ */}
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.5 0 19.7-8.1 19.7-19.5 0-1.3-.1-2.2-.3-4z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.8 18.9 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 16 4 9.2 8.5 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 10.0-2 13.5-5.2l-6.2-5.1C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.6-11.3-8.5l-6.6 5.1C9.1 39.5 16 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.0 4.0-4.8 7-9.3 7-5.3 0-9.7-3.6-11.3-8.5l-6.6 5.1C9.1 39.5 16 44 24 44c11.5 0 19.7-8.1 19.7-19.5 0-1.3-.1-2.2-.3-4z"/>
      </svg>
      Continue with Google
    </Button>
  );
}
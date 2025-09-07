// components/LoginWithGoogleButton.tsx
"use client";

import { auth } from "@/lib/firebaseClient";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

export default function LoginWithGoogleButton() {
  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    // (сонголт) нэмэлт scope, prompt:
    // provider.addScope("profile");
    // provider.setCustomParameters({ prompt: "select_account" });

    try {
      // Popup (ихэнх desktop-д OK)
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken(/* forceRefresh? */ true);

      // Та бүрт API-даа илгээнэ
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Login failed");
      }

      // Амжилттай — нүүр/dashboard руу
      window.location.href = "/";
    } catch (e) {
      // Popup‑ийг блоклосон/сафари, iOS гэхэд redirect сонгох
      console.error(e);
      try {
        await signInWithRedirect(auth, provider);
      } catch (e2) {
        console.error(e2);
        alert("Google sign‑in failed");
      }
    }
  };

  return (
    <button
      onClick={signIn}
      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 hover:bg-gray-50"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.5 0 19.7-8.1 19.7-19.5 0-1.3-.1-2.2-.3-4z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.8 18.9 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 16 4 9.2 8.5 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 10.0-2 13.5-5.2l-6.2-5.1C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.6-11.3-8.5l-6.6 5.1C9.1 39.5 16 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.0 4.0-4.8 7-9.3 7-5.3 0-9.7-3.6-11.3-8.5l-6.6 5.1C9.1 39.5 16 44 24 44c11.5 0 19.7-8.1 19.7-19.5 0-1.3-.1-2.2-.3-4z"/>
      </svg>
      Continue with Google
    </button>
  );
}
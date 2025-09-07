// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebaseClient";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
} from "firebase/auth";

type Role = "admin" | "moderator" | "teacher" | "student";

export default function LoginPage() {
  const router = useRouter();

  // UI state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Аль хэдийн session байвал redirect
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { user?: { uid: string; role: Role } };
        const r = data.user?.role ?? "student";
        if (mounted) redirectByRole(r);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Helpers
  const redirectByRole = (role: Role) => {
    if (role === "admin") router.push("/admin");
    else if (role === "moderator") router.push("/moderator");
    else if (role === "teacher") router.push("/teacher");
    else router.push("/student");
  };

  const setAuthPersistence = async () => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  };

  const callLoginApiWithIdToken = async (idToken: string): Promise<Role> => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token: idToken }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error ?? `Login API failed (${res.status})`);
    }
    const data: { success: boolean; uid: string; role?: string } = await res.json();
    return ((data.role ?? "student") as string).toLowerCase() as Role;
  };

  // Email / Password
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setErrorMsg(null);
      setLoading(true);

      await setAuthPersistence();

      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken(true);

      const role = await callLoginApiWithIdToken(idToken);
      redirectByRole(role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.";
      setErrorMsg(msg);
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Google
  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    try {
      setErrorMsg(null);
      setGoogleLoading(true);

      await setAuthPersistence();

      const provider = new GoogleAuthProvider();
      // provider.setCustomParameters({ prompt: "select_account" });

      let idToken: string | null = null;
      try {
        const cred = await signInWithPopup(auth, provider);
        idToken = await cred.user.getIdToken(true);
      } catch (popupErr) {
        // Popup блоклогдвол redirect fallback
        console.warn("Popup failed, trying redirect…", popupErr);
        await signInWithRedirect(auth, provider);
        return; // redirect болно
      }

      if (!idToken) throw new Error("ID token авахад алдаа гарлаа.");
      const role = await callLoginApiWithIdToken(idToken);
      redirectByRole(role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google нэвтрэхэд алдаа гарлаа.";
      setErrorMsg(msg);
      console.error("Google login failed:", err);
    } finally {
      setGoogleLoading(false);
    }
  };

  // signInWithRedirect‑ээс буцаж ирэхэд автоматаар үргэлжлүүлэх (optional safety)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const idToken = await u.getIdToken(true);
          const role = await callLoginApiWithIdToken(idToken);
          redirectByRole(role);
        } catch (err) {
          console.error("Post-redirect login failed:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <>
      <Head>
        <title>PhysX — Нэвтрэх</title>
        <meta name="description" content="T-Wind-д нэвтэрч үргэлжлүүлнэ үү." />
      </Head>

      <div className="relative flex flex-col justify-center min-h-screen overflow-hidden">
        <div className="w-full m-auto bg-white dark:bg-slate-800/60 rounded shadow-lg ring-2 ring-slate-300/50 dark:ring-slate-700/50 lg:max-w-md">
          {/* Header */}
          <div className="text-center p-6 bg-slate-900 rounded-t">
            <Link href="/" className="inline-block">
              <Image
                src="/assets/images/logo-sm.png"
                alt="T-Wind"
                className="w-14 h-14 mx-auto mb-2"
                width={128}
                height={128}
              />
            </Link>
            <h3 className="font-semibold text-white text-xl mb-1">
              PhysX-т тавтай морил
            </h3>
            <p className="text-xs text-slate-400">
              Үргэлжлүүлэхийн тулд нэвтэрнэ үү.
            </p>
          </div>

          {/* Form */}
          <form className="p-6" onSubmit={onSubmit} noValidate>
            {/* Error banner */}
            {errorMsg && (
              <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Имэйл
              </label>
              <input
                id="email"
                type="email"
                className="form-control dark:bg-slate-800/60 dark:border-slate-700/50"
                placeholder="Имэйл хаяг"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="password" className="label">
                Нууц үг
              </label>
              <input
                id="password"
                type="password"
                className="form-control dark:bg-slate-800/60 dark:border-slate-700/50"
                placeholder="Нууц үг"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <Link href="/forgot" className="text-xs text-gray-600 hover:underline">
                Нууц үгээ мартсан уу?
              </Link>

              {/* Remember me */}
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <span className="bg-white dark:bg-slate-700 dark:border-slate-600 border border-slate-200 rounded w-4 h-4 inline-flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  {remember && (
                    <i className="fas fa-check text-xs text-slate-700 dark:text-slate-300" />
                  )}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  Намайг сана
                </span>
              </label>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
              </button>
            </div>

            {/* Зөвхөн Google товч нэмсэн (загварыг эвдэхгүй) */}
            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700/50"></div>
              <span className="mx-3 text-slate-500 text-xs">эсвэл</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700/50"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded border border-slate-300 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.5 0 19.7-8.1 19.7-19.5 0-1.3-.1-2.2-.3-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.8 18.9 14 24 14c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.2 29.6 4 24 4 16 4 9.2 8.5 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 10.0-2 13.5-5.2l-6.2-5.1C29.3 36 26.8 37 24 37c-5.3 0-9.7-3.6-11.3-8.5l-6.6 5.1C9.1 39.5 16 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.0 4.0-4.8 7-9.3 7-5.3 0-9.7-3.6-11.3-8.5l-6.6 5.1C9.1 39.5 16 44 24 44c11.5 0 19.7-8.1 19.7-19.5 0-1.3-.1-2.2-.3-4z"/>
              </svg>
              {googleLoading ? "Google‑ээр нэвтэрч байна…" : "Google‑ээр нэвтрэх"}
            </button>
          </form>

          <p className="mb-5 text-sm font-medium text-center text-slate-500">
            Бүртгэлгүй юу?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              Бүртгүүлэх
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
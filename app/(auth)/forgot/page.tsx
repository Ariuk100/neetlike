// app/forgot/page.tsx
"use client";

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase"; // Adjusted import path
import { sendPasswordResetEmail } from "firebase/auth";
import toast from "react-hot-toast";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const emailError =
    touched && !email
      ? "Имэйл хоосон байна."
      : touched && !isEmail(email)
      ? "Имэйл буруу байна."
      : "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setErrorMsg(null);

    if (!isEmail(email)) {
      return;
    }

    setLoading(true);
    try {
      // хүсвэл энд deep link ашиглах бол handleCodeInApp:true + Dynamic Links тохируул
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);

      // Нууцлалын үүднээс: "хэрэв бүртгэлтэй бол илгээгдсэн" гэж ойлгохоор мессеж
      setDone(true);
      toast.success("Хэрэв энэ и‑мэйл бүртгэлтэй бол сэргээх холбоос илгээгдсэн.");
    } catch (err) {
      // Firebase кодуудыг хүмүүн readable болгоё
      let msg = "Нууц үг сэргээхэд алдаа гарлаа.";
      if (typeof err === "object" && err !== null) {
        const e = err as { code?: unknown; message?: unknown };
        const code = typeof e.code === "string" ? e.code : undefined;
        if (code === "auth/invalid-email") msg = "Имэйл хаяг буруу байна.";
        else if (code === "auth/too-many-requests")
          msg = "Хэт олон оролдлого. Дараа дахин оролдоно уу.";
        else if (code === "auth/network-request-failed")
          msg = "Сүлжээний алдаа. Интернэтээ шалгаад дахин оролдоно уу.";
      }
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>PhysX — Нууц үг сэргээх</title>
        <meta name="description" content="Нууц үгээ и‑мэйлээр сэргээх" />
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
              Нууц үг сэргээх
            </h3>
            <p className="text-xs text-slate-400">
              Имэйлээ оруулаад сэргээх холбоос авна уу.
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

            {/* Success banner (optional) */}
            {done && !errorMsg && (
              <div className="mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
                Хэрэв энэ и‑мэйл бүртгэлтэй бол сэргээх холбоос илгээгдсэн.
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Имэйл
              </label>
              <input
                id="email"
                type="email"
                className={
                  "form-control dark:bg-slate-800/60 dark:border-slate-700/50 " +
                  (emailError ? "border-red-500 focus:ring-red-200" : "")
                }
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                required
                autoComplete="email"
              />
              {emailError ? (
                <p className="text-red-600 text-xs mt-1">{emailError}</p>
              ) : touched && isEmail(email) ? (
                <p className="text-green-600 text-xs mt-1">Зөв байна</p>
              ) : null}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Илгээж байна…" : "Сэргээх имэйл илгээх"}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                Буцах — Нэвтрэх
              </Link>
            </div>
          </form>

          <p className="mb-5 text-sm font-medium text-center text-slate-500">
            Шинэ хэрэглэгч үү?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:underline">
              Бүртгүүлэх
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

// app/register/page.tsx
"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase"; // auth экспорт

type AimagSoum = {
  aimag: string;
  soums: string[];
};

// ---- Types & helpers (any хэрэглэхгүй) ----
type RegisterProfileOk = {
  success: true;
  message: string;
  isNew: boolean;
  claimUpdated: boolean;
  forceTokenRefresh: boolean;
};

type RegisterProfileErr = { error: string };

type RegisterProfileResponse = RegisterProfileOk | RegisterProfileErr;

async function safeJson<R>(res: Response): Promise<R | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as R;
  } catch {
    return null;
  }
}

function toMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const m = e as { message?: unknown; code?: unknown };
    if (typeof m.message === "string") return m.message;
    if (typeof m.code === "string") return m.code;
  }
  return "Алдаа гарлаа.";
}

function isErrorPayload(x: unknown): x is RegisterProfileErr {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in (x as Record<string, unknown>) &&
    typeof (x as Record<string, unknown>).error === "string"
  );
}
// ------------------------------------------

export default function RegisterPage() {
  const [data, setData] = useState<AimagSoum[]>([]);
  const [aimag, setAimag] = useState("");
  const [soum, setSoum] = useState("");

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((s) => ({ ...s, [k]: true }));

  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isPasswordStrong = (v: string) => /[A-Za-z]/.test(v) && /\d/.test(v) && v.length >= 6;
  const isPhoneValid = (v: string) => /^\d{8}$/.test(v);
  const G_LETTER = "[A-Za-zА-ЯЁӨҮ]";
  const gradeRegex = new RegExp(`^([1-9]|1[0-2])${G_LETTER}$`);
  const isGradeValid = (v: string) => gradeRegex.test(v);

  const emailError =
    touched.email && !email
      ? "Имэйл хоосон байна."
      : touched.email && !isEmailValid(email)
      ? "Имэйл буруу байна."
      : "";

  const passError =
    touched.password && !password
      ? "Нууц үг хоосон байна."
      : touched.password && !isPasswordStrong(password)
      ? "Дор хаяж 6 тэмдэгт, 1 үсэг, 1 тоо агуулсан байх ёстой."
      : "";

  const confirmError =
    touched.confirm && confirmPassword !== password ? "Нууц үг таарахгүй байна." : "";

  const phoneError =
    touched.mobile && !mobile
      ? "Утас хоосон байна."
      : touched.mobile && !isPhoneValid(mobile)
      ? "Утасны дугаар 8 оронтой байх ёстой."
      : "";

  const gradeError =
    touched.grade && !grade
      ? "Анги хоосон байна."
      : touched.grade && !isGradeValid(grade)
      ? "Анги 1–12 + 1 үсэг (ж: 10А) байх ёстой."
      : "";

  const allValid =
    isEmailValid(email) &&
    isPasswordStrong(password) &&
    confirmPassword === password &&
    isPhoneValid(mobile) &&
    isGradeValid(grade) &&
    !!lastName &&
    !!firstName &&
    !!school &&
    !!aimag &&
    !!soum &&
    agree;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/mn_aimag_soum_min.json", { cache: "force-cache" });
        const json = (await res.json()) as AimagSoum[];
        setData(json);
      } catch (e) {
        console.error("Аймаг/сумын мэдээлэл уншихад алдаа:", e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setSoum("");
  }, [aimag]);

  const selectedSoums = data.find((d) => d.aimag === aimag)?.soums ?? [];

  const normalizeGrade = (raw: string) => {
    const v = raw.replace(/\s+/g, "");
    const m = v.match(/^(\d{1,2})([A-Za-zА-Яа-яЁёӨөҮү])?$/);
    if (!m) return v.toUpperCase();
    const num = m[1];
    const letter = (m[2] ?? "").toUpperCase();
    return `${num}${letter}`;
  };

  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      email: true,
      password: true,
      confirm: true,
      mobile: true,
      lastName: true,
      firstName: true,
      school: true,
      grade: true,
      aimag: true,
      soum: true,
    });

    if (!allValid) {
      toast.error("Бүх шаардлагатай талбарыг зөв бөглөнө үү!");
      return;
    }

    setLoading(true);
    try {
       // ✅ 2) Имэйл бүртгэл
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // ✅ 3) ID токен авч API руу profile-аа илгээнэ
      const idToken = await user.getIdToken(true);
      const profileData = {
        name: firstName.trim(),
        lastName: lastName.trim(),
        phone: mobile.trim(),
        province: aimag,
        district: soum,
        school: school.trim(),
        grade: grade.trim(),
      };

      const res = await fetch("/api/register-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ profileData }),
      });

      // Серверийн хариуг тайпжуулж уншина (204/хоосон бол null)
      const payload = await safeJson<RegisterProfileResponse>(res);

      if (!res.ok) {
        if (res.status === 401) {
          toast.error((isErrorPayload(payload) && payload.error) || "Нэвтрэлт хүчингүй байна. Дахин оролдоно уу.");
        } else if (res.status === 409) {
          // 🔔 Утас давхцал (серверийн баталгаатай)
          toast.error((isErrorPayload(payload) && payload.error) || "Энэ утасны дугаар аль хэдийн бүртгэлтэй байна.");
        } else {
          const msg = isErrorPayload(payload) ? payload.error : `Алдаа: HTTP ${res.status}`;
          toast.error(msg);
        }
        setLoading(false);
        return;
      }

      // ✅ 4) Custom claim role=student оноосон тул signOut → Login руу
      await signOut(auth);
      toast.success("Бүртгэл амжилттай! Дахин нэвтэрч орно уу.");
      router.replace("/login");
    } catch (err: unknown) {
      // Firebase алдааны code/message зэргийг цэвэрхэн харуулна
      toast.error(toMessage(err) || "Сервертэй холбогдоход алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  const ctl = (base: string, error: boolean, ok: boolean) =>
    `${base} ${error ? "border-red-500 focus:ring-red-200" : ok ? "border-green-500 focus:ring-green-200" : ""}`;

  return (
    <>
      <Head>
        <title>PhysX — Бүртгүүлэх</title>
        <meta name="description" content="PhysX-д бүртгүүлэх" />
      </Head>

      <div className="relative flex flex-col justify-center min-h-screen overflow-hidden">
        <div className="m-auto bg-white dark:bg-slate-800/60 rounded shadow-lg ring-2 ring-slate-300/50 dark:ring-slate-700/50 max-w-sm">
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
            <h3 className="font-semibold text-white text-xl mb-1">PhysX-д тавтай морил</h3>
            <p className="text-xs text-slate-400">Бүртгүүлээд ашиглаж эхлээрэй.</p>
          </div>

          <form className="p-6" onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Овог */}
              <div>
                <label htmlFor="lastName" className="label">Овог *</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!(touched.lastName && !lastName), !!(touched.lastName && !!lastName))}
                  placeholder="Овогоо оруулна уу"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => touch("lastName")}
                  required
                  aria-required="true"
                  aria-invalid={!!(touched.lastName && !lastName)}
                  aria-describedby={touched.lastName && !lastName ? "lastName-error" : undefined}
                />
                {touched.lastName && !lastName && (
                  <p id="lastName-error" className="text-red-600 text-xs mt-1" role="alert">Овог заавал бөглөх шаардлагатай</p>
                )}
                {touched.lastName && lastName && <p className="text-green-600 text-xs mt-1">Зөв байна</p>}
              </div>

              {/* Нэр */}
              <div>
                <label htmlFor="firstName" className="label">Нэр</label>
                <input
                  id="firstName"
                  type="text"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!(touched.firstName && !firstName), !!(touched.firstName && !!firstName))}
                  placeholder="Нэр"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => touch("firstName")}
                  required
                />
                {touched.firstName && firstName && <p className="text-green-600 text-xs mt-1">Зөв байна</p>}
              </div>

              {/* Имэйл */}
              <div>
                <label htmlFor="email" className="label">Цахим шуудан / Email</label>
                <input
                  id="email"
                  type="email"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!emailError, !!(touched.email && isEmailValid(email)))}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => touch("email")}
                  required
                />
                {emailError ? (
                  <p className="text-red-600 text-xs mt-1">{emailError}</p>
                ) : touched.email && isEmailValid(email) ? (
                  <p className="text-green-600 text-xs mt-1">Зөв байна</p>
                ) : null}
              </div>

              {/* Утас */}
              <div>
                <label htmlFor="mobile" className="label">Утасны дугаар</label>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!phoneError, !!(touched.mobile && isPhoneValid(mobile)))}
                  placeholder="Утас (8 орон)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  onBlur={() => touch("mobile")}
                  maxLength={8}
                  required
                />
                {touched.mobile && mobile && !phoneError && <p className="text-green-600 text-xs mt-1">Зөв байна</p>}
                {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
              </div>

              {/* Аймаг */}
              <div>
                <label htmlFor="aimag" className="label">Аймаг / Нийслэл</label>
                <select
                  id="aimag"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!(touched.aimag && !aimag), !!(touched.aimag && !!aimag))}
                  value={aimag}
                  onChange={(e) => setAimag(e.target.value)}
                  onBlur={() => touch("aimag")}
                  required
                >
                  <option value="" disabled>Сонгох</option>
                  {data.map((d) => (
                    <option key={d.aimag} value={d.aimag}>{d.aimag}</option>
                  ))}
                </select>
                {touched.aimag && aimag && <p className="text-green-600 text-xs mt-1">Зөв байна</p>}
              </div>

              {/* Сум / Дүүрэг */}
              <div>
                <label htmlFor="soum" className="label">Сум / Дүүрэг</label>
                <select
                  id="soum"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!(touched.soum && !soum), !!(touched.soum && !!soum))}
                  value={soum}
                  onChange={(e) => setSoum(e.target.value)}
                  onBlur={() => touch("soum")}
                  required
                  disabled={!aimag}
                >
                  <option value="" disabled>{aimag ? "Сонгох" : "Эхлээд аймаг сонго"}</option>
                  {selectedSoums.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {touched.soum && soum && <p className="text-green-600 text-xs mt-1">Зөв байна</p>}
              </div>

              {/* Сургууль */}
              <div>
                <label htmlFor="school" className="label">Сургууль</label>
                <input
                  id="school"
                  type="text"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!(touched.school && !school), !!(touched.school && !!school))}
                  placeholder="Сургуулийн нэр"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  onBlur={() => touch("school")}
                  required
                />
                {touched.school && school && <p className="text-green-600 text-xs mt-1">Зөв байна</p>}
              </div>

              {/* Анги */}
              <div>
                <label htmlFor="grade" className="label">Анги</label>
                <input
                  id="grade"
                  type="text"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!gradeError, !!(touched.grade && isGradeValid(grade)))}
                  placeholder="Ж: 10А"
                  value={grade}
                  onChange={(e) => setGrade(normalizeGrade(e.target.value))}
                  onBlur={() => touch("grade")}
                  required
                />
                {gradeError ? (
                  <p className="text-red-600 text-xs mt-1">{gradeError}</p>
                ) : touched.grade && isGradeValid(grade) ? (
                  <p className="text-green-600 text-xs mt-1">Зөв байна (жишээ: {grade})</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Жишээ: 12А</p>
                )}
              </div>

              {/* Нууц үг */}
              <div>
                <label htmlFor="password" className="label">Нууц үг</label>
                <input
                  id="password"
                  type="password"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!passError, !!(touched.password && isPasswordStrong(password)))}
                  placeholder="Нууц үг"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => touch("password")}
                  required
                  autoComplete="new-password"
                />
                {passError ? (
                  <p className="text-red-600 text-xs mt-1">{passError}</p>
                ) : touched.password && isPasswordStrong(password) ? (
                  <p className="text-green-600 text-xs mt-1">Зөв байна</p>
                ) : null}
              </div>

              {/* Нууц үг давтах */}
              <div>
                <label htmlFor="confirmPassword" className="label">Нууц үг давтах</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={ctl("form-control dark:bg-slate-800/60 dark:border-slate-700/50", !!confirmError, !!(touched.confirm && confirmPassword === password && !!confirmPassword))}
                  placeholder="Нууц үг давтах"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => touch("confirm")}
                  required
                  autoComplete="new-password"
                />
                {confirmError ? (
                  <p className="text-red-600 text-xs mt-1">{confirmError}</p>
                ) : touched.confirm && confirmPassword === password && !!confirmPassword ? (
                  <p className="text-green-600 text-xs mt-1">Зөв байна</p>
                ) : null}
              </div>
            </div>

            <div className="block mt-4">
              <label className="custom-label cursor-pointer inline-flex items-start">
                <div className="bg-white border dark:bg-slate-700 dark:border-slate-600 border-slate-200 rounded w-4 h-4 inline-flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  {agree && <i className="fas fa-check text-xs text-slate-700 dark:text-slate-300" />}
                </div>
                <span className="text-sm text-slate-500 font-medium ml-2">
                  Бүртгүүлэхийн тулд PhysX-ийн ашиглалтын нөхцөлийг зөвшөөрч байна
                </span>
              </label>
            </div>

            {allValid && (
              <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
                Бүх талбар зөв бөглөгдсөн байна. Илгээхэд бэлэн!
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center"
              >
                {loading ? "Бүртгэж байна…" : "Бүртгүүлэх"}
              </button>
            </div>
          </form>

          <p className="mb-5 text-sm font-medium text-center text-slate-500">
            Аль хэдийн бүртгэлтэй юу?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Нэвтрэх
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

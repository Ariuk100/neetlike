"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // ✅ react-hot-toast-г sonner-оор солив
import { auth } from "@/lib/firebase"; 

// ✅ Shadcn/UI компонент-уудыг импортлох
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

type AimagSoum = {
  aimag: string;
  soums: string[];
};

// ---- Types & helpers (логик өөрчлөгдөөгүй) ----
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
  try { return JSON.parse(text) as R; } catch { return null; }
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
    typeof x === "object" && x !== null && "error" in (x as Record<string, unknown>) && typeof (x as Record<string, unknown>).error === "string"
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
  const isGradeValid = (v: string) => gradeRegex.test(v.toUpperCase());

  const emailError = touched.email && !isEmailValid(email) ? "Имэйл буруу байна." : "";
  const passError = touched.password && !isPasswordStrong(password) ? "6+ тэмдэгт, 1 үсэг, 1 тоо агуулна." : "";
  const confirmError = touched.confirm && confirmPassword !== password ? "Нууц үг таарахгүй байна." : "";
  const phoneError = touched.mobile && !isPhoneValid(mobile) ? "Утасны дугаар 8 оронтой байх ёстой." : "";
  const gradeError = touched.grade && !isGradeValid(grade) ? "Анги буруу байна (жишээ: 10А)." : "";
  
  const requiredFields = [lastName, firstName, school, aimag, soum, mobile, grade, email, password, confirmPassword];
  const emptyFields = requiredFields.some(field => !field.trim());

  const allValid =
    !emptyFields &&
    isEmailValid(email) &&
    isPasswordStrong(password) &&
    confirmPassword === password &&
    isPhoneValid(mobile) &&
    isGradeValid(grade) &&
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

  useEffect(() => { setSoum(""); }, [aimag]);
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
    setTouched({ email: true, password: true, confirm: true, mobile: true, lastName: true, firstName: true, school: true, grade: true, aimag: true, soum: true, });
    if (!allValid) {
      toast.error("Бүртгэлийн мэдээлэл", { description: "Бүх талбарыг зөв бөглөнө үү!" });
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await user.getIdToken(true);
      const profileData = {
        name: firstName.trim(), lastName: lastName.trim(), phone: mobile.trim(), province: aimag, district: soum, school: school.trim(), grade: normalizeGrade(grade),
      };
      const res = await fetch("/api/register-profile", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}`, }, body: JSON.stringify({ profileData }),
      });
      const payload = await safeJson<RegisterProfileResponse>(res);
      if (!res.ok) {
        const defaultError = "Бүртгэлийн серверт алдаа гарлаа.";
        const message = isErrorPayload(payload) ? payload.error : defaultError;
        if (res.status === 409) {
          toast.error("Бүртгэл амжилтгүй", { description: "Энэ утасны дугаар аль хэдийн бүртгэлтэй байна." });
        } else {
          toast.error("Бүртгэл амжилтгүй", { description: message });
        }
        return;
      }
      await signOut(auth);
      toast.success("Бүртгэл амжилттай!", { description: "Нэвтрэх хуудас руу шилжиж байна..." });
      router.replace("/login");
    } catch (err: unknown) {
      toast.error("Бүртгэл амжилтгүй", { description: toMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  // ✅ UI-г shadcn компонент-уудаар солив.
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
            <Link href="/" className="inline-block mx-auto mb-4">
              <Image src="/assets/images/logo-sm.png" alt="PhysX Logo" width={56} height={56} />
            </Link>
          <CardTitle className="text-2xl font-bold">PhysX-д Бүртгүүлэх</CardTitle>
          <CardDescription>
            Хувийн мэдээллээ оруулж бүртгэлээ үүсгэнэ үү.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Овог */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Овог *</Label>
                <Input id="lastName" placeholder="Овогоо оруулна уу" value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch("lastName")} required />
                {touched.lastName && !lastName && <p className="text-sm text-destructive">Овог хоосон байж болохгүй.</p>}
              </div>
              {/* Нэр */}
              <div className="space-y-2">
                <Label htmlFor="firstName">Нэр *</Label>
                <Input id="firstName" placeholder="Нэрээ оруулна уу" value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch("firstName")} required />
                 {touched.firstName && !firstName && <p className="text-sm text-destructive">Нэр хоосон байж болохгүй.</p>}
              </div>
              {/* Имэйл */}
              <div className="space-y-2">
                <Label htmlFor="email">Цахим шуудан *</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch("email")} required />
                {emailError && <p className="text-sm text-destructive">{emailError}</p>}
              </div>
              {/* Утас */}
              <div className="space-y-2">
                <Label htmlFor="mobile">Утасны дугаар *</Label>
                <Input id="mobile" type="tel" placeholder="8 оронтой тоо" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} onBlur={() => touch("mobile")} maxLength={8} required />
                {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
              </div>
              {/* Аймаг */}
              <div className="space-y-2">
                <Label htmlFor="aimag">Аймаг / Нийслэл *</Label>
                <Select value={aimag} onValueChange={setAimag}>
                  <SelectTrigger id="aimag" onBlur={() => touch("aimag")}><SelectValue placeholder="Сонгох" /></SelectTrigger>
                  <SelectContent>
                    {data.map((d) => (<SelectItem key={d.aimag} value={d.aimag}>{d.aimag}</SelectItem>))}
                  </SelectContent>
                </Select>
                 {touched.aimag && !aimag && <p className="text-sm text-destructive">Аймаг сонгоно уу.</p>}
              </div>
              {/* Сум */}
              <div className="space-y-2">
                <Label htmlFor="soum">Сум / Дүүрэг *</Label>
                <Select value={soum} onValueChange={setSoum} disabled={!aimag}>
                  <SelectTrigger id="soum" onBlur={() => touch("soum")}><SelectValue placeholder={aimag ? "Сонгох" : "Эхлээд аймаг сонго"} /></SelectTrigger>
                  <SelectContent>
                    {selectedSoums.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
                 {touched.soum && !soum && <p className="text-sm text-destructive">Сум сонгоно уу.</p>}
              </div>
              {/* Сургууль */}
              <div className="space-y-2">
                <Label htmlFor="school">Сургууль *</Label>
                <Input id="school" placeholder="Сургуулийн нэр" value={school} onChange={(e) => setSchool(e.target.value)} onBlur={() => touch("school")} required />
                {touched.school && !school && <p className="text-sm text-destructive">Сургуулиа оруулна уу.</p>}
              </div>
              {/* Анги */}
              <div className="space-y-2">
                <Label htmlFor="grade">Анги *</Label>
                <Input id="grade" placeholder="Жишээ: 10А" value={grade} onChange={(e) => setGrade(e.target.value)} onBlur={() => touch("grade")} required />
                {gradeError && <p className="text-sm text-destructive">{gradeError}</p>}
              </div>
              {/* Нууц үг */}
              <div className="space-y-2">
                <Label htmlFor="password">Нууц үг *</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => touch("password")} required />
                {passError && <p className="text-sm text-destructive">{passError}</p>}
              </div>
              {/* Нууц үг давтах */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Нууц үг давтах *</Label>
                <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onBlur={() => touch("confirm")} required />
                {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
              </div>
            </div>

            <div className="flex items-start space-x-2 mt-6">
              <Checkbox id="terms" checked={agree} onCheckedChange={(checked) => setAgree(Boolean(checked))} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="terms" className="text-sm font-medium">Үйлчилгээний нөхцөл зөвшөөрөх</Label>
                <p className="text-sm text-muted-foreground">Та манай <Link href="/terms" className="underline">үйлчилгээний нөхцөл</Link> болон <Link href="/privacy" className="underline">нууцлалын бодлогыг</Link> хүлээн зөвшөөрч байна.</p>
              </div>
            </div>

            <div className="mt-6">
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Бүртгэж байна…" : "Бүртгүүлэх"}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Аль хэдийн бүртгэлтэй юу?{" "}
            <Link href="/login" className="underline hover:text-primary">
              Нэвтрэх
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

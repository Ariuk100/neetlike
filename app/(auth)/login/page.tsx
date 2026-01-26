"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from "firebase/auth";

// Shadcn/UI компонент-уудыг импортлох
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, GraduationCap, Users } from "lucide-react";

type Role = "admin" | "moderator" | "teacher" | "student";

// Firebase-ийн алдааны кодыг ойлгомжтой Монгол мессеж болгох функц
const getFirebaseErrorMessage = (error: FirebaseError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Имэйл хаяг эсвэл нууц үг буруу байна.';
    case 'auth/invalid-email':
      return 'Имэйл хаягийн формат буруу байна.';
    case 'auth/too-many-requests':
      return 'Хэт олон удаагийн амжилтгүй оролдлого. Та түр хүлээгээд дахин оролдоно уу.';
    case 'auth/network-request-failed':
      return 'Интернэт холболтоо шалгана уу. Сүлжээний алдаа гарлаа.';
    default:
      return 'Тодорхойгүй алдаа гарлаа. Системтэй холбогдоно уу.';
  }
};

export default function LoginPage() {
  const router = useRouter();

  // UI state
  const [userType, setUserType] = useState<"student" | "teacher">("student");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Data state
  const [classes, setClasses] = useState<string[]>([]);
  const [studentsData, setStudentsData] = useState<Record<string, { fullName: string; email: string }[]>>({});
  const [teachersData, setTeachersData] = useState<{ fullName: string; email: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Selection state
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedEmail, setSelectedEmail] = useState<string>("");

  // Fetch users on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        if (mounted) {
          setClasses(data.classes);
          setStudentsData(data.students);
          setTeachersData(data.teachers);
          setDataLoading(false);
        }
      } catch (err) {
        console.error("Error fetching login data:", err);
        if (mounted) setDataLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Reset selections when user type changes
  useEffect(() => {
    setSelectedClass("");
    setSelectedEmail("");
  }, [userType]);

  // Функцүүд
  const redirectByRole = useCallback((role: Role) => {
    if (role === "admin") router.push("/admin");
    else if (role === "moderator") router.push("/moderator");
    else if (role === "teacher") router.push("/teacher");
    else router.push("/student");
  }, [router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!res.ok || res.status === 204) {
          return;
        }

        const data = (await res.json()) as { user?: { uid: string; role: Role } };
        const r = data.user?.role ?? "student";
        if (mounted) redirectByRole(r);
      } catch (err) {
        if (!(err instanceof SyntaxError)) {
          // console.error("Session check failed:", err); // Session шалгах үеийн алдааг нуух
        }
      }
    })();
    return () => { mounted = false; };
  }, [redirectByRole]);

  const callLoginApiWithIdToken = useCallback(async (idToken: string): Promise<Role> => {
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
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!selectedEmail) {
      toast.error("Нэрээ сонгоно уу");
      return;
    }

    try {
      setLoading(true);
      // Default to session persistence
      await setPersistence(auth, browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, selectedEmail, password);
      const idToken = await cred.user.getIdToken(true);
      const role = await callLoginApiWithIdToken(idToken);

      toast.success("Амжилттай нэвтэрлээ", {
        description: "Хянах самбар луу шилжиж байна...",
      });
      redirectByRole(role);
    } catch (err) {
      const errorMessage = err instanceof FirebaseError ? getFirebaseErrorMessage(err) : "Тодорхойгүй алдаа гарлаа.";
      toast.error("Нэвтрэхэд алдаа гарлаа", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };


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
  }, [redirectByRole, callLoginApiWithIdToken]);


  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-sm bg-card/75 backdrop-blur-sm">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mx-auto mb-4">
            <Image
              src="/assets/images/logo-sm.png"
              alt="PhysX Logo"
              width={56}
              height={56}
            />
          </Link>

          {/* Role Selection Tabs */}
          <div className="mb-4">
            <Tabs value={userType} onValueChange={(value) => setUserType(value as "student" | "teacher")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Сурагч
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Багш
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <CardTitle className="text-2xl font-bold">
            {userType === "student" ? "Сурагчийн нэвтрэх" : "Багшийн нэвтрэх"}
          </CardTitle>
          <CardDescription>
            {userType === "student"
              ? "Хичээлд орохын тулд нэвтэрнэ үү."
              : "Хичээлээ удирдахын тулд нэвтэрнэ үү."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <div className="space-y-4">
              {userType === "student" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="class">Анги сонгох</Label>
                    <Select
                      disabled={dataLoading}
                      value={selectedClass}
                      onValueChange={(val) => {
                        setSelectedClass(val);
                        setSelectedEmail(""); // Reset name when class changes
                      }}
                    >
                      <SelectTrigger id="class">
                        <SelectValue placeholder={dataLoading ? "Ачаалж байна..." : "Анги сонгох"} />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student">Нэр сонгох</Label>
                    <Select
                      disabled={!selectedClass || dataLoading}
                      value={selectedEmail}
                      onValueChange={setSelectedEmail}
                    >
                      <SelectTrigger id="student">
                        <SelectValue placeholder={!selectedClass ? "Эхлээд анги сонгоно уу" : "Нэр сонгох"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(studentsData[selectedClass] || []).map((s) => (
                          <SelectItem key={s.email} value={s.email}>{s.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="teacher">Нэр сонгох</Label>
                  <Select
                    disabled={dataLoading}
                    value={selectedEmail}
                    onValueChange={setSelectedEmail}
                  >
                    <SelectTrigger id="teacher">
                      <SelectValue placeholder={dataLoading ? "Ачаалж байна..." : "Нэр сонгох"} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachersData.map((t) => (
                        <SelectItem key={t.email} value={t.email}>{t.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Нууц үг</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Нууц үг"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading
                    ? "Нэвтэрч байна…"
                    : userType === "student"
                      ? "Сурагчаар нэвтрэх"
                      : "Багшаар нэвтрэх"
                  }
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


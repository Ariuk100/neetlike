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
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react"; 

// ✅ CacheContext-г импортлох
import { useCacheContext } from "@/lib/CacheContext";

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
    case 'auth/popup-closed-by-user':
        return 'Google-ээр нэвтрэх цонхыг хаалаа. Дахин оролдоно уу.';
    default:
      return 'Тодорхойгүй алдаа гарлаа. Системтэй холбогдоно уу.';
  }
};

export default function LoginPage() {
  const router = useRouter();
  const cache = useCacheContext(); 

  // UI state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Функцүүд
  const redirectByRole = useCallback((role: Role) => {
    if (role === "admin") router.push("/admin");
    else if (role === "moderator") router.push("/moderator");
    else if (role === "teacher") router.push("/teacher");
    else router.push("/student");
  }, [router]);

  useEffect(() => {
    const loadRememberedEmail = async () => {
      if (cache) {
        const rememberedEmail = await cache.get<string>('remembered_email', { storage: 'local' });
        if (rememberedEmail) {
          setEmail(rememberedEmail);
          setRemember(true);
        }
      }
    };
    loadRememberedEmail();
  }, [cache]);
  
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

  const setAuthPersistence = async () => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  };

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

    try {
      setLoading(true);
      await setAuthPersistence();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken(true);
      const role = await callLoginApiWithIdToken(idToken);
      
      if (remember) {
        await cache.set('remembered_email', email.trim(), { storage: 'local' });
      } else {
        await cache.remove('remembered_email', { storage: 'local' });
      }

      toast.success("Амжилттай нэвтэрлээ", {
        description: "Хянах самбар луу шилжиж байна...",
      });
      redirectByRole(role);
    } catch (err) {
      const errorMessage = err instanceof FirebaseError ? getFirebaseErrorMessage(err) : "Тодорхойгүй алдаа гарлаа.";
      toast.error("Нэвтрэхэд алдаа гарлаа", {
        description: errorMessage,
      });
      // ✅ ЗАСВАРЛАСАН: Консол дээрх алдааны мэдээллийг устгав.
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    try {
      setGoogleLoading(true);
      await setAuthPersistence();
      const provider = new GoogleAuthProvider();
      let idToken: string | null = null;
      try {
        const cred = await signInWithPopup(auth, provider);
        idToken = await cred.user.getIdToken(true);
        if (remember) {
          await cache.set('remembered_email', cred.user.email || '', { storage: 'local' });
        } else {
          await cache.remove('remembered_email', { storage: 'local' });
        }
      } catch (popupErr: unknown) { 
        if (popupErr instanceof FirebaseError && popupErr.code === 'auth/popup-closed-by-user') {
            throw popupErr;
        }
        // console.warn("Popup failed, trying redirect…", popupErr); // Redirect хийх үеийн анхааруулгыг нуух
        await signInWithRedirect(auth, provider);
        return;
      }
      if (!idToken) throw new Error("ID token авахад алдаа гарлаа.");
      const role = await callLoginApiWithIdToken(idToken);
      toast.success("Амжилттай нэвтэрлээ", {
        description: "Хянах самбар луу шилжиж байна...",
      });
      redirectByRole(role);
    } catch (err) {
      const errorMessage = err instanceof FirebaseError ? getFirebaseErrorMessage(err) : "Google-ээр нэвтрэхэд алдаа гарлаа.";
       toast.error("Google нэвтрэлт амжилтгүй", {
        description: errorMessage,
      });
       // ✅ ЗАСВАРЛАСАН: Консол дээрх алдааны мэдээллийг устгав.
    } finally {
      setGoogleLoading(false);
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
          <CardTitle className="text-2xl font-bold">PhysX-т тавтай морил</CardTitle>
          <CardDescription>
            Үргэлжлүүлэхийн тулд нэвтэрнэ үү.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Имэйл</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Нууц үг</Label>
                    <Link href="/forgot" className="text-xs text-muted-foreground hover:underline">
                        Нууц үгээ мартсан уу?
                    </Link>
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
              <div className="flex items-center space-x-2">
                <Checkbox 
                    id="remember" 
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(Boolean(checked))}
                />
                <Label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Намайг сана
                </Label>
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
                </Button>
              </div>
            </div>
          </form>

          {/* ✅ ЗАСВАРЛАСАН: Google-н товчийг буцааж нэмэв */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/75 px-2 text-muted-foreground">
                Эсвэл
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={googleLoading}>
            {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                // ✅ ЗАСВАРЛАСАН: Google-н логог зөв хувилбараар солив.
                <svg className="mr-2 h-4 w-4" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
            )}
            {googleLoading ? "Нэвтэрч байна…" : "Google-ээр нэвтрэх"}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Бүртгэлгүй юу?{" "}
            <Link href="/register" className="underline hover:text-primary">
              Бүртгүүлэх
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


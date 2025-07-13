'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button' // Энэ мөрийг зассан
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { getIdToken } from 'firebase/auth'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth'
import { auth, db, googleProvider } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore' // Нэмэлт импортууд

export default function AuthPage() { // Энэ мөрийг зассан
  const router = useRouter()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [error, setError] = useState<string | null>(null) // Error state-г энд нэмсэн

  useEffect(() => {
    // Firebase тохиргоог хэвлэх (өмнө нь нэмсэн)
    console.log('Client-side Firebase Config:');
    console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    // ... бусад тохиргоо

    // 🔴 НЭМЭЛТ ДИБАГ ЛОГ: Нэвтэрсний дараа user_role cookie-г шалгах
    const checkRoleCookie = () => {
      const cookies = document.cookie.split(';');
      let userRoleCookie = null;
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim(); // 'let' to 'const'
        if (cookie.startsWith('user_role=')) {
          userRoleCookie = cookie.substring('user_role='.length, cookie.length);
          break;
        }
      }
      console.log('Client-side user_role cookie after page load:', userRoleCookie);
    };

    // Хуудас ачаалагдах үед болон нэвтэрсний дараа ч шалгахын тулд
    // setTimeout ашиглан бага зэрэг хойшлуулж болно.
    setTimeout(checkRoleCookie, 1000); // 1 секундын дараа шалгана
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null); // Алдааг цэвэрлэх
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔴 НЭМЭЛТ ДИБАГ ЛОГ: User объект болон ID Token-ийг хэвлэх
      console.log('User object after sign-in (Email/Password):', user);
      console.log('ID Token after sign-in (Email/Password):', await getIdToken(user));

      // Session cookie үүсгэх `/api/login` дуудлага
      const token = await getIdToken(user);
      const apiResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to set session cookie on server.');
      }

      const data = await apiResponse.json() as { status: string; role: string };
      console.log('Login successful:', data);
      // 🔴 НЭМЭЛТ ДИБАГ ЛОГ: Login API-аас ирсэн role-г шалгах
      console.log('Role received from /api/login:', data.role);

      // Cookie-г шинэчилсний дараа дахин шалгах
      setTimeout(() => {
        const cookies = document.cookie.split(';');
        let userRoleCookie = null;
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim(); // 'let' to 'const'
          if (cookie.startsWith('user_role=')) {
            userRoleCookie = cookie.substring('user_role='.length, cookie.length);
            break;
          }
        }
        console.log('Client-side user_role cookie after /api/login call:', userRoleCookie);
      }, 500);

      toast.success('Амжилттай нэвтэрлээ!');
      setFadeOut(true);
      setTimeout(() => {
        router.push('/'); // Үндсэн хуудас руу шилжүүлж, Middleware-ийг ажиллуулна.
      }, 400);

    } catch (error: unknown) {
      const err = error as { code?: string; message: string };
      let message = 'Нэвтрэхэд алдаа гарлаа.';
      switch (err.code) {
        case 'auth/user-not-found': message = 'Ийм и-мэйлтэй хэрэглэгч олдсонгүй.'; break;
        case 'auth/wrong-password': message = 'Нууц үг буруу байна.'; break;
        case 'auth/invalid-email': message = 'И-мэйл хаяг буруу байна.'; break;
        case 'auth/invalid-credential': message = 'Нэвтрэх мэдээлэл буруу эсвэл хүчингүй байна.'; break;
        default: message = `Алдаа: ${err.message}`;
      }
      setError(message); // Error state-д алдааг хадгалах
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null); // Алдааг цэвэрлэх
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken(); // Энэ нь одоо шинэ Custom Claim-тай байх ёстой

      // 🔴 НЭМЭЛТ ДИБАГ ЛОГ: User объект болон ID Token-ийг хэвлэх
      console.log('User object after sign-in (Google):', user);
      console.log('ID Token after sign-in (Google):', idToken);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Шинэ Google хэрэглэгч бол Firestore-д бүртгэнэ
        let newReadableId = 'S0001'; // Анхны ID
        // Хамгийн сүүлийн сурагчийн ID-г авах (давхцал үүсгэх эрсдэлтэйг анхаарна уу!)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const lastUser = querySnapshot.docs[0].data();
          const lastId = lastUser.readableId;
          if (lastId && lastId.startsWith('S') && lastId.length === 5) {
            const num = parseInt(lastId.substring(1)) + 1;
            newReadableId = 'S' + String(num).padStart(4, '0');
          }
        }

        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || '',
          phone: '',
          email: user.email || '',
          role: 'student', // Default-ээр 'student' өгч байна.
          school: '',
          grade: '',
          readableId: newReadableId, // 🔴 Шинээр үүсгэсэн ID-г хадгална
          createdAt: new Date(), // Үүссэн огноог нэмсэн
        });
      }

      // Session cookie үүсгэхийн тулд API дуудна
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: idToken }),
      });

      if (response.ok) {
        const data = await response.json() as { status: string; role: string };
        console.log('Login successful:', data);
        // 🔴 НЭМЭЛТ ДИБАГ ЛОГ: Login API-аас ирсэн role-г шалгах
        console.log('Role received from /api/login:', data.role);

        // Cookie-г шинэчилсний дараа дахин шалгах
        setTimeout(() => {
          const cookies = document.cookie.split(';');
          let userRoleCookie = null;
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim(); // 'let' to 'const'
            if (cookie.startsWith('user_role=')) {
              userRoleCookie = cookie.substring('user_role='.length, cookie.length);
              break;
            }
          }
          console.log('Client-side user_role cookie after /api/login call:', userRoleCookie);
        }, 500); // 0.5 секундын дараа шалгана

        toast.success('Google-ээр амжилттай нэвтэрлээ!');
        setFadeOut(true);
        setTimeout(() => {
          router.push('/'); // Үндсэн хуудас руу шилжүүлж, Middleware-ийг ажиллуулна.
        }, 400);

      } else {
        const errorData = await response.json() as { error?: string };
        setError(errorData.error || 'Google нэвтрэлт амжилтгүй боллоо.');
        console.error('Login API failed:', errorData);
      }
    } catch (error: unknown) { // 'any' to 'unknown'
      const err = error as { code?: string; message: string }; // Type assertion
      console.error('Google Sign-In Error:', err); // Use 'err' here
      setError(err.message || 'Google нэвтрэлт амжилтгүй боллоо.'); // Use 'err.message'
      toast.error('Google нэвтрэлт амжилтгүй: ' + err.message); // Use 'err.message'
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!/^[\d]{8}$/.test(phone)) {
      toast.error('Утасны дугаар 8 оронтой байх ёстой!');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('И-мэйл хаяг буруу байна!');
      return;
    }

    setLoading(true);
    setError(null); // Алдааг цэвэрлэх
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🔴 НЭМЭЛТ ДИБАГ ЛОГ: User объект болон ID Token-ийг хэвлэх
      console.log('User object after registration:', user);
      console.log('ID Token after registration:', await getIdToken(user));

      let newReadableId = 'S0001'; // Анхны ID
      // 🔴 ЭНГИЙН ЖИШЭЭ: Хамгийн сүүлийн сурагчийн ID-г авах
      // Энэ нь олон хэрэглэгч зэрэг бүртгүүлэх үед давхцал үүсгэх эрсдэлтэйг анхаарна уу!
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1)); // Сүүлд үүссэн хэрэглэгчийг авна
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const lastUser = querySnapshot.docs[0].data();
        const lastId = lastUser.readableId; // Жишээ нь: "S0001"
        if (lastId && lastId.startsWith('S') && lastId.length === 5) {
          const num = parseInt(lastId.substring(1)) + 1;
          newReadableId = 'S' + String(num).padStart(4, '0');
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        phone,
        email,
        role: 'student', // Бүртгүүлэх үед default-ээр 'student' role өгч байна.
        school,
        grade,
        readableId: newReadableId, // 🔴 Шинээр үүсгэсэн ID-г хадгална
        createdAt: new Date(), // Үүссэн огноог нэмсэн нь дараалсан ID үүсгэхэд тустай
      });

      // Бүртгүүлсний дараа шууд нэвтэрсэн гэж үзэж, session cookie-г тохируулна.
      const token = await getIdToken(user);
      const apiResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to set session cookie after registration.');
      }

      const data = await apiResponse.json() as { status: string; role: string };
      console.log('Registration successful, role received:', data.role);

      setTimeout(() => {
        const cookies = document.cookie.split(';');
        let userRoleCookie = null;
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim(); // 'let' to 'const'
          if (cookie.startsWith('user_role=')) {
            userRoleCookie = cookie.substring('user_role='.length, cookie.length);
            break;
          }
        }
        console.log('Client-side user_role cookie after registration /api/login call:', userRoleCookie);
      }, 500);

      toast.success('Бүртгэл амжилттай үүслээ!');
      setFadeOut(true);
      setTimeout(() => {
        router.push('/'); // Үндсэн хуудас руу шилжүүлж, Middleware-ийг ажиллуулна.
      }, 400);
    } catch (error: unknown) {
      const err = error as { code?: string; message: string };
      let message = 'Бүртгэхэд алдаа гарлаа.';
      switch (err.code) {
        case 'auth/email-already-in-use': message = 'Энэ и-мэйл аль хэдийн бүртгэгдсэн байна.'; break;
        case 'auth/invalid-email': message = 'И-мэйл хаяг буруу байна.'; break;
        case 'auth/weak-password': message = 'Нууц үг хэт сул байна. Доод тал нь 6 тэмдэгт.'; break;
        case 'auth/missing-password': message = 'Нууц үгээ оруулна уу.'; break;
        default: message = `Алдаа: ${err.message}`;
      }
      setError(message); // Error state-д алдааг хадгалах
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="flex min-h-screen items-center justify-center bg-[#f7f7f7] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 text-xl font-bold text-blue-600 hover:underline z-50"
      >
        <span className="text-black">📚</span> MyApp
      </button>

      <div className="grid md:grid-cols-2 bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl w-full">
        <div className="hidden md:block bg-cover bg-center" style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1533907650686-70576141c030?auto=format&fit=crop&w=800&q=80)`
        }} />

        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-6">Нэвтрэх / Бүртгүүлэх</h1>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>} {/* 'error' state-г ашигласан */}
          <Tabs defaultValue="login" value={tab} onValueChange={(val) => setTab(val as 'login' | 'register')} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">Нэвтрэх</TabsTrigger>
              <TabsTrigger value="register">Бүртгүүлэх</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <div><Label>Имэйл</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Нууц үг</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button onClick={handleLogin} disabled={loading} className="w-full mt-2">
                  {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
                </Button>
                <Button variant="outline" onClick={handleGoogleLogin} className="w-full mt-2">
                  Google-ээр нэвтрэх
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <div><Label>Нэр</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Утас</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><Label>Имэйл</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Нууц үг</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <div><Label>Сургууль</Label><Input value={school} onChange={(e) => setSchool(e.target.value)} /></div>
                <div><Label>Анги</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
                <Button onClick={handleRegister} disabled={loading} className="w-full mt-2">
                  {loading ? 'Бүртгүүлж байна...' : 'Бүртгүүлэх'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </motion.div>
  )
}

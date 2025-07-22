// app/auth/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { getIdToken, updateProfile, sendPasswordResetEmail } from 'firebase/auth' // sendPasswordResetEmail нэмсэн

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'

// Select components import
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Mongolian province and district list (Монгол нэрээрээ байгаа)
const MONGOLIAN_LOCATIONS = [
  {
    province: 'Улаанбаатар',
    districts: [
      'Багануур', 'Багахангай', 'Баянгол', 'Баянзүрх', 'Налайх', 'Сонгинохайрхан',
      'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй'
    ],
  },
  {
    province: 'Архангай',
    districts: [
      'Батцэнгэл', 'Булган', 'Жаргалант', 'Ихтамир', 'Өгийнуур', 'Өлзийт',
      'Өндөр-Улаан', 'Тариат', 'Төвшрүүлэх', 'Түмэннаст', 'Улаан-Уул',
      'Хайрхан', 'Хангай', 'Хотонт', 'Цахир', 'Цэнхэр', 'Цэцэрлэг',
      'Чулуут', 'Эрдэнэмандал'
    ],
  },
  {
    province: 'Баян-Өлгий',
    districts: [
      'Алтанцөгц', 'Баяннуур', 'Бугат', 'Булган', 'Буянт', 'Дэлүүн',
      'Ногооннуур', 'Сагсай', 'Толбо', 'Улаанхус', 'Цагааннуур',
      'Цэнгэл', 'Өлгий'
    ],
  },
  {
    province: 'Баянхонгор',
    districts: [
      'Баацагаан', 'Баянговь', 'Баянлиг', 'Баянбулаг', 'Баян-Өндөр', 'Баянцагаан',
      'Баянхонгор', 'Богд', 'Дэлгэр', 'Жаргалант', 'Заг', 'Өлзийт',
      'Өргөн', 'Шинэжинст', 'Эрдэнэцогт'
    ],
  },
  {
    province: 'Булган',
    districts: [
      'Баян-Агт', 'Баяннуур', 'Бугат', 'Булган', 'Бүрэгхангай', 'Дашинчилэн',
      'Гурванбулаг', 'Могод', 'Орхон', 'Рашаант', 'Сайхан', 'Сэлэнгэ',
      'Тэшиг', 'Хишиг-Өндөр', 'Хутаг-Өндөр'
    ],
  },
  {
    province: 'Говь-Алтай',
    districts: [
      'Алтай', 'Баян-Уул', 'Баянхайрхан', 'Бигэр', 'Бугат', 'Дарви',
      'Дэлгэр', 'Есөнбулаг', 'Жаргалан', 'Тайшир', 'Тонхил', 'Төгрөг',
      'Халиун', 'Хөхморьт', 'Цогт', 'Чандмань', 'Эрдэнэ'
    ],
  },
  {
    province: 'Говьсүмбэр',
    districts: [
      'Баянтал', 'Шивээговь', 'Чойр'
    ],
  },
  {
    province: 'Дархан-Уул',
    districts: [
      'Дархан', 'Орхон', 'Хонгор', 'Шарынгол'
    ],
  },
  {
    province: 'Дорноговь',
    districts: [
      'Айраг', 'Алтанширээ', 'Даланжаргалан', 'Дэлгэрэх', 'Замын-Үүд', 'Иххэт',
      'Мандах', 'Өргөн', 'Сайхандулаан', 'Сайншанд', 'Улаанбадрах', 'Хатанбулаг',
      'Хөвсгөл', 'Эрдэнэ'
    ],
  },
  {
    province: 'Дорнод',
    districts: [
      'Баяндун', 'Баянтүмэн', 'Баян-Уул', 'Булган', 'Дашбалбар', 'Гурванзагал',
      'Халхгол', 'Хөлөнбуйр', 'Матад', 'Сэргэлэн', 'Цагаан-Овоо', 'Чойбалсан',
      'Чулуунхороот'
    ],
  },
  {
    province: 'Дундговь',
    districts: [
      'Адаацаг', 'Баянжаргалан', 'Говь-Угтаал', 'Гурвансайхан', 'Дэлгэрцогт', 'Дэрэн',
      'Луус', 'Өлзийт', 'Өндөршил', 'Сайнцагаан', 'Хулд', 'Цагаандэлгэр',
      'Эрдэнэдалай'
    ],
  },
  {
    province: 'Завхан',
    districts: [
      'Алдархаан', 'Асгат', 'Баянхайрхан', 'Баянхонгор', 'Баянтэс', 'Дөрвөлжин',
      'Идэр', 'Их-Уул', 'Номрог', 'Отгон', 'Сонгино', 'Тосонцэнгэл',
      'Түдэвтэй', 'Ургамал', 'Цагаанхайрхан', 'Цагаанчулуут', 'Цэцэн-Уул',
      'Шилүүстэй', 'Эрдэнэхайрхан', 'Яруу', 'Улиастай'
    ],
  },
  {
    province: 'Орхон',
    districts: [
      'Баян-Өндөр', 'Жаргалант'
    ],
  },
  {
    province: 'Өвөрхангай',
    districts: [
      'Баруунбаян-Улаан', 'Баян-Өндөр', 'Баянгол', 'Баянлиг', 'Бат-Өлзий', 'Богд',
      'Бурд', 'Гучин-Ус', 'Есөнзүйл', 'Хайрхандулаан', 'Хархорин', 'Хужирт',
      'Нарийнтээл', 'Өлзийт', 'Санкт', 'Тарагт', 'Төгрөг', 'Уянга',
      'Зүүнбаян-Улаан', 'Арвайхээр'
    ],
  },
  {
    province: 'Өмнөговь',
    districts: [
      'Баян-Овоо', 'Баяндалай', 'Булган', 'Гурвантэс', 'Даланзадгад', 'Ханбогд',
      'Ханхонгор', 'Манлай', 'Номгон', 'Ноён', 'Сэврэй', 'Цогт-Овоо',
      'Цогтцэций'
    ],
  },
  {
    province: 'Сэлэнгэ',
    districts: [
      'Алтанбулаг', 'Баруунбүрэн', 'Баянгол', 'Ерөө', 'Жавхлант', 'Зүүнбүрэн',
      'Мандал', 'Орхонтуул', 'Сант', 'Сайхан', 'Сүхбаатар', 'Түшиг',
      'Хушаат', 'Цагааннуур', 'Шаамар'
    ],
  },
  {
    province: 'Сүхбаатар',
    districts: [
      'Асгат', 'Баруун-Урт', 'Баяндэлгэр', 'Дарьганга', 'Мөнххаан', 'Наран',
      'Онгон', 'Сүхбаатар', 'Түмэнцогт', 'Уулбаян', 'Халзан', 'Эрдэнэцагаан'
    ],
  },
  {
    province: 'Төв',
    districts: [
      'Алтанбулаг', 'Аргалант', 'Баян', 'Баянбараат', 'Баянжаргалан', 'Баянцагаан',
      'Баянхангай', 'Баянцогт', 'Борнуур', 'Батсүмбэр', 'Бүрэн', 'Дэлгэрхаан',
      'Эрдэнэ', 'Жаргалант', 'Заамар', 'Лүн', 'Мөнгөнморьт', 'Өндөрширээт',
      'Сэргэлэн', 'Сүмбэр', 'Цээл', 'Угтаалцайдам', 'Эрдэнэсант', 'Зуунмод'
    ],
  },
  {
    province: 'Увс',
    districts: [
      'Баруунтуруун', 'Бөхмөрөн', 'Давст', 'Завхан', 'Зүүнговь', 'Зүүнхангай',
      'Малчин', 'Наранбулаг', 'Өмнөговь', 'Өлгий', 'Сагил', 'Тариалан',
      'Тэс', 'Түргэн', 'Улаангом', 'Ховд', 'Хяргас'
    ],
  },
  {
    province: 'Ховд',
    districts: [
      'Алтай', 'Булган', 'Буянт', 'Дарви', 'Дөргөн', 'Дуут',
      'Зэрэг', 'Манхан', 'Мөнххайрхан', 'Мөст', 'Мянгад', 'Үенч',
      'Ховд', 'Цэцэг', 'Чандмань', 'Эрдэнэбүрэн'
    ],
  },
  {
    province: 'Хөвсгөл',
    districts: [
      'Алаг-Эрдэнэ', 'Арбулаг', 'Баянзүрх', 'Бүрэнтогтох', 'Галт', 'Жаргалант',
      'Их-Уул', 'Мөрөн', 'Рашаант', 'Рэнчинлхүмбэ', 'Тариалан', 'Тосонцэнгэл',
      'Төмөрбулаг', 'Түнэл', 'Улаан-Уул', 'Ханх', 'Цагаан-Уул', 'Цагааннуур',
      'Цагаан-Үүр', 'Цэцэрлэг', 'Чандмань-Өндөр', 'Эрдэнэбулган'
    ],
  },
  {
    province: 'Хэнтий',
    districts: [
      'Батноров', 'Батширээт', 'Баян-Овоо', 'Баянмөнх', 'Баянхутаг', 'Биндэр',
      'Дадал', 'Дархан', 'Дэлгэрхаан', 'Жаргалтхаан', 'Өмнөдэлгэр', 'Хэрлэн',
      'Цэнхэрмандал'
    ],
  },
];


export default function AuthPage() {
  const router = useRouter()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [birthYear, setBirthYear] = useState<string>('')
  const [gender, setGender] = useState<string>('')
  const [province, setProvince] = useState<string>('')
  const [district, setDistrict] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectToRolePage = (role: string) => {
    let redirectPath = '/unauthorized';
    switch (role) {
      case 'student':
        redirectPath = '/student';
        break;
      case 'teacher':
        redirectPath = '/teacher';
        break;
      case 'admin':
        redirectPath = '/admin';
        break;
      case 'moderator':
        redirectPath = '/moderator';
        break;
      default:
        redirectPath = '/unauthorized';
        break;
    }
    setFadeOut(true);
    setTimeout(() => {
      router.push(redirectPath);
    }, 400);
  };

  useEffect(() => {
    // Debugging logs - enable if needed for troubleshooting Firebase config or cookie
    // console.log('Client-side Firebase Config:');
    // console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    // console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    // console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // const checkRoleCookie = () => {
    //   const cookies = document.cookie.split(';');
    //   let userRoleCookie = null;
    //   for (let i = 0; i < cookies.length; i++) {
    //     const cookie = cookies[i].trim();
    //     if (cookie.startsWith('user_role=')) {
    //       userRoleCookie = cookie.substring('user_role='.length, cookie.length);
    //       break;
    //     }
    //   }
    //   console.log('Client-side user_role cookie after page load:', userRoleCookie);
    // };
    // setTimeout(checkRoleCookie, 1000);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('User object after sign-in (Email/Password):', user);
      const idToken = await getIdToken(user, true); // true for force refresh
      console.log('ID Token after sign-in (Email/Password):', idToken);

      const apiLoginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });

      if (!apiLoginResponse.ok) {
        const errorData = await apiLoginResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Сервер дээр сешн куки тохируулахад алдаа гарлаа.');
      }

      const responseData = await apiLoginResponse.json() as { success: boolean; uid: string; role: string; };
      console.log('Login successful, role received:', responseData.role);

      toast.success('Амжилттай нэвтэрлээ!');
      redirectToRolePage(responseData.role);

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
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Нууц үг мартсан үед дуудагдах функц
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      toast.error('Нууц үг сэргээх и-мэйл хаягаа зөв оруулна уу.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      toast.success(`Нууц үг сэргээх холбоосыг ${trimmedEmail} хаяг руу илгээлээ. И-мэйлээ шалгана уу.`);
    } catch (error: unknown) {
      const err = error as { code?: string; message: string };
      console.error('Password Reset Error:', err);
      let message = 'Нууц үг сэргээхэд алдаа гарлаа.';
      switch (err.code) {
        case 'auth/user-not-found':
          message = 'Ийм и-мэйлтэй хэрэглэгч олдсонгүй.';
          break;
        case 'auth/invalid-email':
          message = 'И-мэйл хаяг буруу байна.';
          break;
        default:
          message = `Алдаа: ${err.message}`;
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Google-ээс ирсэн displayName болон photoURL-ийг Firebase User Profile-д update хийх
      // Энэ нь Firebase Auth User Record-д хадгалагдана.
      if (user.displayName && !user.photoURL) { // Зөвхөн displayName байгаа ч photoURL байхгүй бол update хийнэ.
        await updateProfile(user, { displayName: user.displayName });
      }

      const idToken = await getIdToken(user, true);
      console.log('User object after sign-in (Google):', user);
      console.log('ID Token after sign-in (Google):', idToken);

      // Google-ээр нэвтэрсэн хэрэглэгчийн мэдээллийг сервер талын API руу илгээх
      // Зөвхөн Google-ээс ирсэн мэдээллийг profileData руу оруулах
      const profileDataToSend: { name: string; photoURL?: string; } = { // Төрлийг зассан
        name: user.displayName || user.email?.split('@')[0] || '', // Нэр эсвэл и-мэйлийн эхний хэсэг
      };
      if (user.photoURL) {
        profileDataToSend.photoURL = user.photoURL; // Профайл зураг байвал нэмнэ
      }
      // Овог, утас, сургууль, анги, төрсөн он, хүйс, аймаг, дүүрэг зэрэг талбаруудыг Google-ээс авдаггүй тул энд оруулахгүй.
      // Ингэснээр, хэрэв хэрэглэгч өмнө нь и-мэйлээр бүртгүүлж эдгээр талбарыг бөглөсөн бол
      // Firestore дээрх `merge: true` үйлдэл нь тэдгээр утгыг хоосон болгож дарж бичихгүй.

      const registerProfileResponse = await fetch('/api/register-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          profileData: profileDataToSend // Оновчтой болгосон profileData-г илгээх
        })
      });

      if (!registerProfileResponse.ok) {
        const errorData = await registerProfileResponse.json();
        throw new Error(errorData.error || 'Google бүртгэлийн профайл үүсгэхэд алдаа гарлаа.');
      }
      console.log('✅ Server: Google user profile successfully sent to Firestore via API.');


      const apiLoginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: idToken }),
      });

      if (!apiLoginResponse.ok) {
        const errorData = await apiLoginResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Google нэвтрэлт амжилтгүй боллоо.');
      }

      const responseData = await apiLoginResponse.json() as { success: boolean; uid: string; role: string; };
      console.log('Google login successful, role received:', responseData.role);

      toast.success('Google-ээр амжилттай нэвтэрлээ!');
      redirectToRolePage(responseData.role);

    } catch (error: unknown) {
      const err = error as { code?: string; message: string };
      console.error('Google Sign-In Error:', err);
      let displayMessage = 'Google нэвтрэлт амжилтгүй боллоо.';
      if (err.code === 'auth/popup-blocked') {
        displayMessage = 'Попап цонх хаагдсан байна. Вэб хөтчийнхөө тохиргоог шалгана уу.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        displayMessage = 'Нэвтрэх хүсэлт цуцлагдлаа.';
      } else {
        displayMessage = `Google нэвтрэлт амжилтгүй: ${err.message}`;
      }
      setError(displayMessage);
      toast.error(displayMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const trimmedPhone = phone.trim()
    const trimmedEmail = email.trim()
    const trimmedName = name.trim()
    const trimmedLastName = lastName.trim()
    const trimmedSchool = school.trim()
    const trimmedGrade = grade.trim()
  
    if (!/^[5-9]\d{7}$/.test(trimmedPhone)) {
      toast.error('Утасны дугаар буруу байна. 8 оронтой, 5, 6, 7, 8, эсвэл 9-өөр эхэлнэ.');
      return;
    }
  
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      toast.error('И-мэйл хаяг буруу байна!');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Нууц үг доод тал нь 6 тэмдэгтээс бүрдсэн байна.');
      return;
    }
  
    if (!trimmedName || !trimmedLastName || !birthYear || !gender || !province || !district || !trimmedSchool || !trimmedGrade) {
      toast.error('Бүх шаардлагатай талбарыг бөглөнө үү!');
      return;
    }
  
    setLoading(true)
    setError(null)
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      const user = userCredential.user
  
      console.log('🔥 Registration form data prepared for API:', {
        uid: user.uid,
        email: trimmedEmail,
        profileData: { // API руу илгээх профайл мэдээлэл
          name: trimmedName,
          lastName: trimmedLastName,
          phone: trimmedPhone,
          school: trimmedSchool,
          grade: trimmedGrade,
          birthYear: birthYear ? parseInt(birthYear) : null,
          gender: gender,
          province: province,
          district: district,
        }
      });
      
      // Сервер талын API руу бүртгэлийн мэдээллийг илгээх
      const registerProfileResponse = await fetch('/api/register-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: trimmedEmail,
          profileData: {
            name: trimmedName,
            lastName: trimmedLastName,
            phone: trimmedPhone,
            school: trimmedSchool,
            grade: trimmedGrade,
            birthYear: birthYear ? parseInt(birthYear) : null,
            gender: gender,
            province: province,
            district: district,
            // readableId болон createdAt-г сервер тал үүсгэнэ
          }
        })
      });
  
      if (!registerProfileResponse.ok) {
        const errorData = await registerProfileResponse.json()
        throw new Error(errorData.error || 'Бүртгэлийн профайл үүсгэхэд алдаа гарлаа.')
      }
      console.log('✅ Server: User profile successfully sent to Firestore via API.');
  
      // Одоо API /api/login руу дуудах шаардлагагүй, учир нь бүртгүүлсний дараа шууд нэвтрэхгүй.
      // Зөвхөн хэрэглэгчийг нэвтрэх хуудас руу шилжүүлнэ.
      // const apiLoginResponse = await fetch('/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token: idToken })
      // })
      // if (!apiLoginResponse.ok) {
      //   const errorData = await apiLoginResponse.json()
      //   throw new Error(errorData.error || 'Сешн куки тохируулахад алдаа гарлаа.')
      // }
      // const responseData = await apiLoginResponse.json()

      toast.success('Бүртгэл амжилттай үүслээ! Одоо нэвтэрнэ үү.');
      
      // И-мэйлийг автоматаар бөглөөд, логин таб руу шилжүүлэх
      setEmail(trimmedEmail); // Бүртгүүлсэн и-мэйлийг логин талбарт автоматаар бөглөх
      setPassword(''); // Нууц үгийг цэвэрлэх (дахин оруулах шаардлагатай)
      setTab('login'); // Логин таб руу шилжүүлэх

    } catch (error: unknown) {
      const err = error as { code?: string; message: string }
      let message = 'Бүртгэхэд алдаа гарлаа.'
      switch (err.code) {
        case 'auth/email-already-in-use': message = 'Энэ и-мэйл аль хэдийн бүртгэгдсэн байна.'; break
        case 'auth/invalid-email': message = 'И-мэйл хаяг буруу байна.'; break
        case 'auth/weak-password': message = 'Нууц үг хэт сул байна. Доод тал нь 6 тэмдэгт.'; break
        case 'auth/missing-password': message = 'Нууц үгээ оруулна уу.'; break
        default: message = `Алдаа: ${err.message}`
      }
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 90 }, (_, i) => (currentYear - 17 - i).toString());

  const selectedProvinceData = MONGOLIAN_LOCATIONS.find(loc => loc.province === province);
  const districtsForSelectedProvince = selectedProvinceData ? selectedProvinceData.districts : [];

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
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
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
                {/* Нууц үг мартсан холбоос */}
                <Button variant="link" onClick={handleForgotPassword} disabled={loading} className="w-full text-sm text-blue-600 hover:underline">
                  Нууц үг мартсан?
                </Button>
                <Button variant="outline" onClick={handleGoogleLogin} className="w-full mt-2">
                  Google-ээр нэвтрэх
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <div><Label>Нэр</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Овог</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                <div><Label>Утас</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><Label>Имэйл</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Нууц үг</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>

                {/* Birth Year */}
                <div>
                  <Label>Төрсөн он</Label>
                  <Select value={birthYear} onValueChange={setBirthYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Төрсөн оноо сонгоно уу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Төрсөн он</SelectLabel>
                        {birthYears.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div>
                  <Label>Хүйс</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Хүйсээ сонгоно уу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Хүйс</SelectLabel>
                        <SelectItem value="male">Эрэгтэй</SelectItem>
                        <SelectItem value="female">Эмэгтэй</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Province */}
                <div>
                  <Label>Аймаг/Хот</Label>
                  <Select value={province} onValueChange={(value) => {
                    setProvince(value);
                    setDistrict(''); // Аймаг өөрчлөгдөхөд сум/дүүргэнийг цэвэрлэх
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Аймаг/Хотоо сонгоно уу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Аймаг/Хот</SelectLabel>
                        {MONGOLIAN_LOCATIONS.map((loc) => (
                          <SelectItem key={loc.province} value={loc.province}>
                            {loc.province}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* District */}
                <div>
                  <Label>Сум/Дүүрэг</Label>
                  <Select value={district} onValueChange={setDistrict} disabled={!province}>
                    <SelectTrigger>
                      <SelectValue placeholder="Сум/Дүүргээ сонгоно уу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Сум/Дүүрэг</SelectLabel>
                        {districtsForSelectedProvince.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

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

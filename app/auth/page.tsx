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
import { getIdToken } from 'firebase/auth'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup // Google Sign-In-д попап ашиглаж байна
} from 'firebase/auth'
import { auth, db, googleProvider } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

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

// Mongolian province and district list
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
    province: 'Dornogovi',
    districts: [
      'Ayrag', 'Altanshiree', 'Dalanjargalan', 'Delgerekh', 'Zamyn-Uud', 'Ikhkhet',
      'Mandakh', 'Orgon', 'Saikhandulaan', 'Sainshand', 'Ulaanbadrakh', 'Khatanbulag',
      'Khovsgol', 'Erdene'
    ],
  },
  {
    province: 'Dornod',
    districts: [
      'Bayandun', 'Bayantumun', 'Bayan-Uul', 'Bulgan', 'Dashbalbar', 'Gurvanzagal',
      'Khalkhgol', 'Kholonbuir', 'Matad', 'Sergelen', 'Tsagaan-Ovoo', 'Choibalsan',
      'Chuluunkhoroot'
    ],
  },
  {
    province: 'Dundgovi',
    districts: [
      'Adaatsag', 'Bayanjargalan', 'Govi-Ugtaal', 'Gurvansaikhan', 'Delgertsogt', 'Deren',
      'Luus', 'Ulziit', 'Ondorhil', 'Saintsagaan', 'Khuld', 'Tsagaandelger',
      'Erdenedalai'
    ],
  },
  {
    province: 'Zavkhan',
    districts: [
      'Aldarkhaan', 'Asgat', 'Bayankhairkhan', 'Bayankhongor', 'Bayantes', 'Dorvoljin',
      'Ider', 'Ikh-Uul', 'Nomrog', 'Otgon', 'Songino', 'Tosontsengel',
      'Tudevtei', 'Urgamal', 'Tsagaankhairkhan', 'Tsagaanchuluut', 'Tsetsen-Uul',
      'Shiluustei', 'Erdenehairkhan', 'Yaruu', 'Uliastai'
    ],
  },
  {
    province: 'Orkhon',
    districts: [
      'Bayan-Ondor', 'Jargalant'
    ],
  },
  {
    province: 'Ovorkhangai',
    districts: [
      'Baruunbayan-Ulaan', 'Bayan-Ondor', 'Bayangol', 'Bayanlig', 'Bat-Ulzii', 'Bogd',
      'Burd', 'Guchin-Us', 'Yosonzul', 'Khairkhandulaan', 'Kharkhorin', 'Khujirt',
      'Nariinteel', 'Ulziit', 'Sankt', 'Taragt', 'Togrog', 'Uyanga',
      'Zunbayan-Ulaan', 'Arvaikheer'
    ],
  },
  {
    province: 'Omnogovi',
    districts: [
      'Bayan-Ovoo', 'Bayandalai', 'Bulgan', 'Gurvantes', 'Dalanzadgad', 'Khanbogd',
      'Khanhongor', 'Manlai', 'Nomgon', 'Noyon', 'Sevrey', 'Tsogt-Ovoo',
      'Tsogttsetii'
    ],
  },
  {
    province: 'Selenge',
    districts: [
      'Altanbulag', 'Baruunburen', 'Bayangol', 'Yeroo', 'Javkhlant', 'Zunburen',
      'Mandal', 'Orkhontuul', 'Sant', 'Saikhan', 'Sukhbaatar', 'Tushig',
      'Khushaat', 'Tsagaannuur', 'Shaamar'
    ],
  },
  {
    province: 'Sukhbaatar',
    districts: [
      'Asgat', 'Baruun-Urt', 'Bayandelger', 'Dariganga', 'Monkhkhaan', 'Naran',
      'Ongon', 'Sukhbaatar', 'Tumentsogt', 'Uulbayan', 'Khalzan', 'Erdenetsagaan'
    ],
  },
  {
    province: 'Tuv',
    districts: [
      'Altanbulag', 'Argalant', 'Bayan', 'Bayanbaraat', 'Bayanjargalan', 'Bayantsagaan',
      'Bayankhangai', 'Bayantsogt', 'Bornuur', 'Batsumber', 'Buren', 'Delgerkhaan',
      'Erdene', 'Jargalant', 'Zaamar', 'Lun', 'Mongonmorit', 'Ondorshireet',
      'Sergelen', 'Sumber', 'Tseel', 'Ugtaaltsaidam', 'Erdenesan', 'Zunmod'
    ],
  },
  {
    province: 'Uvs',
    districts: [
      'Baruunturuun', 'Bokhmoron', 'Davst', 'Zavkhan', 'Zungovi', 'Zunkhangai',
      'Malchin', 'Naranbulag', 'Omnogovi', 'Ulgi', 'Sagil', 'Tarialan',
      'Tes', 'Turgen', 'Ulaangom', 'Khovd', 'Khyrgas'
    ],
  },
  {
    province: 'Khovd',
    districts: [
      'Altai', 'Bulgan', 'Buyant', 'Darvi', 'Dorgon', 'Duut',
      'Zereg', 'Mankhan', 'Monkhkhairkhan', 'Most', 'Myangad', 'Uyenchi',
      'Khovd', 'Tsetseg', 'Chandmani', 'Erdeneburen'
    ],
  },
  {
    province: 'Khovsgol',
    districts: [
      'Alag-Erdene', 'Arbulag', 'Bayanzurkh', 'Burentogtokh', 'Galt', 'Jargalant',
      'Ikh-Uul', 'Moron', 'Rashant', 'Renchinlkhumbe', 'Tarialan', 'Tosontsengel',
      'Tomorbulag', 'Tunel', 'Ulaan-Uul', 'Khanh', 'Tsagaan-Uul', 'Tsagaannuur',
      'Tsagaan-Uur', 'Tsetserleg', 'Chandmani-Ondor', 'Erdenebulgan'
    ],
  },
  {
    province: 'Khentii',
    districts: [
      'Batnorov', 'Batshireet', 'Bayan-Ovoo', 'Bayanmonkh', 'Bayankhutag', 'Binder',
      'Dadal', 'Darkhan', 'Delgerkhaan', 'Jargaltkhaan', 'Omondelger', 'Kherlen',
      'Tsenkhermandal'
    ],
  },
];


export default function AuthPage() {
  const router = useRouter()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('') // New state for last name
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [birthYear, setBirthYear] = useState<string>('') // New state for birth year
  const [gender, setGender] = useState<string>('') // New state for gender
  const [province, setProvince] = useState<string>('') // New state for province
  const [district, setDistrict] = useState<string>('') // New state for district
  const [loading, setLoading] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Хэрэглэгчийн үүрэгт тохирсон зам руу чиглүүлэх туслах функц
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
    // Firebase тохиргоог лог хийх (өмнө нь нэмэгдсэн)
    console.log('Client-side Firebase Config:');
    console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    // ... бусад тохиргоо

    // Нэвтэрсний дараа user_role кукиг шалгах (нэмэлт дибаг лог)
    const checkRoleCookie = () => {
      const cookies = document.cookie.split(';');
      let userRoleCookie = null;
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('user_role=')) {
          userRoleCookie = cookie.substring('user_role='.length, cookie.length);
          break;
        }
      }
      console.log('Client-side user_role cookie after page load:', userRoleCookie);
    };

    // Куки шинэчлэгдэхийг түр хүлээгээд шалгана
    setTimeout(checkRoleCookie, 1000);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null); // Өмнөх алдаануудыг арилгах
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Хэрэглэгчийн объект болон ID Token-ийг лог хийх (Имэйл/Нууц үгээр нэвтрэх)
      console.log('User object after sign-in (Email/Password):', user);
      const idToken = await getIdToken(user);
      console.log('ID Token after sign-in (Email/Password):', idToken);

      // Сешн куки үүсгэхээр `/api/login` руу дуудна
      const apiLoginResponse = await fetch('/api/login', { // Энд /api/login-г дуудаж байна
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }), // token-г idToken болгож өөрчилсөн
      });

      if (!apiLoginResponse.ok) {
        const errorData = await apiLoginResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Сервер дээр сешн куки тохируулахад алдаа гарлаа.');
      }

      // `/api/login` API-аас ирсэн хариултаас үүргийг шууд авна
      const responseData = await apiLoginResponse.json() as { success: boolean; uid: string; role: string; };
      console.log('Login successful, role received:', responseData.role);

      toast.success('Амжилттай нэвтэрлээ!');
      redirectToRolePage(responseData.role); // Үүрэгт тохирсон хуудас руу чиглүүлнэ

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
      setError(message); // Алдааг төлөвт хадгалах
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null); // Өмнөх алдаануудыг арилгах
    try {
      // 🔴 ЭНД ПОПАПТАЙ ХОЛБООТОЙ АЛДААНУУД ГАРЧ БАЙНА:
      // Firebase: Error (auth/cancelled-popup-request).
      // Firebase: Error (auth/popup-blocked).
      // Cross-Origin-Opener-Policy policy would block the window.closed call.
      // INTERNAL ASSERTION FAILED: Pending promise was never set
      //
      // Эдгээр алдаанууд нь ихээвчлэн вэб хөтчийн попап блоклогч,
      // эсвэл Cross-Origin-Opener-Policy (COOP) зэрэг аюулгүй байдлын бодлогоос үүсдэг.
      // Мөн хэрэглэгч попапыг хурдан хаах үед ч гарч болно.
      //
      // ХАМГИЙН НАЙДВАРТАЙ ШИЙДЭЛ: signInWithRedirect ашиглах.
      // signInWithRedirect нь попап цонх ашиглахгүйгээр хэрэглэгчийг Google-ийн нэвтрэх хуудас руу
      // чиглүүлж, нэвтэрсний дараа таны аппликешн руу буцаадаг.
      // Энэ нь попап блоклогч болон COOP-той холбоотой асуудлуудыг шийддэг.
      //
      // Таны хүсэлтээр "өөр өөрчлөлт хийж болохгүй" гэсэн тул, би signInWithPopup-ийг
      // эндээс шууд өөрчлөхгүй байна. Гэхдээ ирээдүйд энэ асуудлыг бүрэн шийдэхийн тулд
      // signInWithRedirect-ийг ашиглахыг зөвлөж байна.
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken(); // Энэ нь одоо шинэ Custom Claim-тай байх ёстой

      // Хэрэглэгчийн объект болон ID Token-ийг лог хийх (Google-ээр нэвтрэх)
      console.log('User object after sign-in (Google):', user);
      console.log('ID Token after sign-in (Google):', idToken);

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Хэрэв шинэ Google хэрэглэгч бол Firestore-д бүртгэнэ
        let newReadableId = 'S0001'; // Эхний ID
        // ЭНГИЙН ЖИШЭЭ: Хамгийн сүүлийн сурагчийн ID-г авах (олон хэрэглэгч зэрэг бүртгүүлэх үед race condition үүсэх магадлалтай!)
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
          lastName: '', // Google-ээр нэвтрэхэд овог хоосон байна
          phone: '',
          email: user.email || '',
          role: 'student', // Анхдагч үүрэг 'student'
          school: '',
          grade: '',
          birthYear: '', // Google-ээр нэвтрэхэд төрсөн он хоосон байна
          gender: '', // Google-ээр нэвтрэхэд хүйс хоосон байна
          province: '', // Google-ээр нэвтрэхэд аймаг хоосон байна
          district: '', // Google-ээр нэвтрэхэд сум хоосон байна
          readableId: newReadableId, // Шинээр үүсгэсэн ID-г хадгалах
          createdAt: new Date(), // Үүсгэсэн огноог нэмэх
        });
      }

      // Сешн куки үүсгэхээр API руу дуудна
      const apiLoginResponse = await fetch('/api/login', { // Энд /api/login-г дуудаж байна
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: idToken }), // token-г idToken болгож өөрчилсөн
      });

      if (!apiLoginResponse.ok) {
        const errorData = await apiLoginResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Google нэвтрэлт амжилтгүй боллоо.');
      }

      // `/api/login` API-аас ирсэн хариултаас үүргийг шууд авна
      const responseData = await apiLoginResponse.json() as { success: boolean; uid: string; role: string; };
      console.log('Login successful:', responseData);

      toast.success('Google-ээр амжилттай нэвтэрлээ!');
      redirectToRolePage(responseData.role); // Үүрэгт тохирсон хуудас руу чиглүүлнэ

    } catch (error: unknown) {
      const err = error as { code?: string; message: string };
      console.error('Google Sign-In Error:', err);
      // auth/popup-blocked, auth/cancelled-popup-request зэрэг алдааг хэрэглэгчид харуулах
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
    if (!/^[\d]{8}$/.test(phone)) {
      toast.error('Утасны дугаар 8 оронтой байх ёстой!');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('И-мэйл хаяг буруу байна!');
      return;
    }
    // Шинэ талбаруудыг баталгаажуулах
    if (!lastName || !birthYear || !gender || !province || !district) {
      toast.error('Бүх талбарыг бөглөнө үү!');
      return;
    }

    setLoading(true);
    setError(null); // Өмнөх алдаануудыг арилгах
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('User object after registration:', user);
      const idToken = await getIdToken(user);
      console.log('ID Token after registration:', idToken);

      let newReadableId = 'S0001'; // Эхний ID
      // ЭНГИЙН ЖИШЭЭ: Хамгийн сүүлийн сурагчийн ID-г авах
      // Олон хэрэглэгч зэрэг бүртгүүлэх үед race condition үүсэх магадлалтайг анхаарна уу!
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'), limit(1)); // Хамгийн сүүлд үүсгэгдсэн хэрэглэгчийг авах
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const lastUser = querySnapshot.docs[0].data();
        const lastId = lastUser.readableId; // Жишээ: "S0001"
        if (lastId && lastId.startsWith('S') && lastId.length === 5) {
          const num = parseInt(lastId.substring(1)) + 1;
          newReadableId = 'S' + String(num).padStart(4, '0');
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        lastName, // Шинэ талбар
        phone,
        email,
        role: 'student', // Бүртгүүлэх үед анхдагч үүрэг 'student'
        school,
        grade,
        birthYear: parseInt(birthYear), // Шинэ талбар, тоо хэлбэрээр хадгалах
        gender, // Шинэ талбар
        province, // Шинэ талбар
        district, // Шинэ талбар
        readableId: newReadableId, // Шинээр үүсгэсэн ID-г хадгалах
        createdAt: new Date(), // Үүсгэсэн огноог нэмэх, дараалсан ID үүсгэхэд ашигтай
      });

      // Бүртгүүлсний дараа нэвтэрсэн гэж үзээд сешн кукиг тохируулах
      const apiLoginResponse = await fetch('/api/login', { // Энд /api/login-г дуудаж байна
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }), // token-г idToken болгож өөрчилсөн
      });

      if (!apiLoginResponse.ok) {
        const errorData = await apiLoginResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Бүртгүүлсний дараа сешн куки тохируулахад алдаа гарлаа.');
      }

      // `/api/login` API-аас ирсэн хариултаас үүргийг шууд авна
      const responseData = await apiLoginResponse.json() as { success: boolean; uid: string; role: string; };
      console.log('Registration successful, role received:', responseData.role);

      toast.success('Бүртгэл амжилттай үүслээ!');
      redirectToRolePage(responseData.role); // Үүрэгт тохирсон хуудас руу чиглүүлнэ

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
      setError(message); // Алдааг төлөвт хадгалах
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Төрсөн оны сонголтуудыг үүсгэх
  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 100 }, (_, i) => (currentYear - 90 + i).toString()); // 90 жилийн өмнөөс одоогийн жил хүртэл

  // Сонгосон аймгийн сум/дүүргийг авах
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
                <Button variant="outline" onClick={handleGoogleLogin} className="w-full mt-2">
                  Google-ээр нэвтрэх
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <div><Label>Нэр</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Овог</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div> {/* New field */}
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
                    setDistrict(''); // Аймаг өөрчлөгдөхөд сум/дүүргийг цэвэрлэх
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

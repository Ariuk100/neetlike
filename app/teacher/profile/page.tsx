'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase' // Assuming db is correctly initialized from firebase config
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

// AuthContext-ээс CustomUser interface-ийг импортлох нь зүйтэй,
// ингэснээр user объектын төрөл зөв тодорхойлогдоно.
// Хэрэв AuthContext-д CustomUser-ийг экспортлосон бол энийг ашиглана:
// import { CustomUser } from '@/app/context/AuthContext';
interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  role?: string;
  name?: string;
  phone?: string;
  school?: string;
  lastName?: string;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
  province?: string;
  district?: string;
  readableId?: string; // readableId талбарыг нэмсэн
}

// Монголын аймаг, сум/дүүргийн жагсаалт
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
      'Баяндун', 'Баянтумэн', 'Баян-Уул', 'Булган', 'Дашбалбар', 'Гурванзагал',
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
      'Идэр', 'Их-Уул', 'Нөмрөг', 'Отгон', 'Сонгино', 'Тосонцэнгэл',
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
      'Бүрд', 'Гучин-Ус', 'Есөнзүйл', 'Хайрхандулаан', 'Хархорин', 'Хужирт',
      'Нарийнтээл', 'Өлзийт', 'Санкт', 'Тарагт', 'Төгрөг', 'Уянга',
      'Зуунбаян-Улаан', 'Арвайхээр'
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


export default function TeacherProfilePage() { // Компонентын нэрийг TeacherProfilePage болгож өөрчилсөн
  // useAuth-аас user, loading-г авна, CustomUser интерфейсээр төрлийг тодорхойлно
  const { user: authUser, loading: authLoading } = useAuth() as { user: CustomUser | null; loading: boolean };
  const router = useRouter()

  // Шинэ талбаруудын state хувьсагчид
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [birthYear, setBirthYear] = useState<string | number>('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');

  const [loading, setLoading] = useState(false)
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]); // Сонгосон аймгийн сум/дүүрэг

  useEffect(() => {
    if (authUser) {
      // authUser датагаар state-үүдийг эхлүүлнэ
      setName(authUser.name || authUser.displayName || '');
      setPhone(authUser.phone || authUser.phoneNumber || '');
      setSchool(authUser.school || '');
      setLastName(authUser.lastName || '');
      setGender((authUser.gender as 'male' | 'female' | 'other' | '') || '');
      setBirthYear(authUser.birthYear || '');
      setProvince(authUser.province || ''); // Аймаг утгыг оноосон
      setDistrict(authUser.district || ''); // Сум/дүүрэг утгыг оноосон
    }
  }, [authUser])

  // Аймаг сонгогдох үед сум/дүүргийг шинэчлэх
  useEffect(() => {
    const selectedProvinceData = MONGOLIAN_LOCATIONS.find(loc => loc.province === province);
    if (selectedProvinceData) {
      setAvailableDistricts(selectedProvinceData.districts);
      // Сонгосон сум/дүүрэг нь шинэ аймгийн жагсаалтад байхгүй бол хоосон болгоно
      if (district && !selectedProvinceData.districts.includes(district)) {
        setDistrict('');
      }
    } else {
      setAvailableDistricts([]);
      setDistrict('');
    }
  }, [province, district]);

  const handleSave = async () => {
    if (!authUser) return;
    try {
      setLoading(true);
      const userRef = doc(db, 'users', authUser.uid);

      // dataToUpdate объектын төрлийг Record<string, string | number | null | undefined> болгон зассан
      const dataToUpdate: Record<string, string | number | null | undefined> = {
        name: name,
        phone: phone,
        school: school,
        lastName: lastName,
        gender: gender === '' ? null : gender, // Хоосон бол null болгоно
        birthYear: typeof birthYear === 'number' ? birthYear : (birthYear === '' ? null : Number(birthYear)), // Хоосон эсвэл тоо биш бол null болгоно
        province: province === '' ? null : province, // Хоосон бол null болгоно
        district: district === '' ? null : district, // Хоосон бол null болгоно
      };

      await updateDoc(userRef, dataToUpdate);
      toast.success('Амжилттай хадгалагдлаа!'); // Амжилттай хадгалагдлаа!
      router.push('/teacher?updated=true'); // Багшийн самбар руу буцах
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Алдаа гарлаа'); // Алдаа гарлаа
    } finally {
      setLoading(false);
    }
  };

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Зөвхөн тоо эсвэл хоосон байвал утгыг онооно
    if (value === '' || /^\d+$/.test(value)) {
      setBirthYear(value === '' ? '' : Number(value));
    }
  };

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setDistrict(''); // Аймаг солигдох үед сум/дүүргийг цэвэрлэнэ
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Ачаалж байна...</div>; // Ачаалж байна...
  }

  // Зөвхөн багшийн эрхтэй хэрэглэгчдэд хандахыг зөвшөөрнө
  if (!authUser || authUser.role !== 'teacher') {
    return <div className="p-4 text-red-500">Зөвшөөрөлгүй хандалт</div>; // Зөвшөөрөлгүй хандалт
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 px-4">
      <h1 className="text-2xl font-bold">Багшийн профайл</h1> {/* Гарчгийг өөрчилсөн */}
      <div className="bg-white border p-4 rounded shadow space-y-4">
        {/* Имэйл хаяг (засах боломжгүй) */}
        <div>
          <Label className="block font-medium mb-1">Имэйл:</Label> {/* Имэйл: */}
          <p className="text-gray-700">{authUser.email}</p>
        </div>

        {/* readableId (засах боломжгүй) */}
        {authUser.readableId && (
          <div>
            <Label className="block font-medium mb-1">Хэрэглэгчийн ID:</Label> {/* Хэрэглэгчийн ID: */}
            <p className="text-gray-700">{authUser.readableId}</p>
          </div>
        )}

        <div>
          <Label htmlFor="name" className="block font-medium mb-1">Нэр:</Label> {/* Нэр: */}
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="lastName" className="block font-medium mb-1">Овог:</Label> {/* Овог: */}
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="phone" className="block font-medium mb-1">Утас:</Label> {/* Утас: */}
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="school" className="block font-medium mb-1">Харьяа сургууль:</Label> {/* Харьяа сургууль: */}
          <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="gender" className="block font-medium mb-1">Хүйс:</Label> {/* Хүйс: */}
          <Select value={gender} onValueChange={(value) => setGender(value as 'male' | 'female' | 'other' | '')}>
            <SelectTrigger id="gender"><SelectValue placeholder="Хүйс сонгоно уу" /></SelectTrigger> {/* Хүйс сонгоно уу */}
            <SelectContent>
              <SelectItem value="male">Эрэгтэй</SelectItem> {/* Эрэгтэй */}
              <SelectItem value="female">Эмэгтэй</SelectItem> {/* Эмэгтэй */}
              <SelectItem value="other">Бусад</SelectItem> {/* Бусад */}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="birthYear" className="block font-medium mb-1">Төрсөн он:</Label> {/* Төрсөн он: */}
          <Input id="birthYear" type="number" value={birthYear} onChange={handleBirthYearChange} />
        </div>

        {/* Аймаг сонгох хэсэг */}
        <div>
          <Label htmlFor="province" className="block font-medium mb-1">Аймаг:</Label> {/* Аймаг: */}
          <Select value={province} onValueChange={handleProvinceChange}>
            <SelectTrigger id="province"><SelectValue placeholder="Аймаг сонгоно уу" /></SelectTrigger> {/* Аймаг сонгоно уу */}
            <SelectContent>
              {MONGOLIAN_LOCATIONS.map((loc) => (
                <SelectItem key={loc.province} value={loc.province}>
                  {loc.province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Сум/Дүүрэг сонгох хэсэг (аймаг сонгогдсоны дараа идэвхжинэ) */}
        <div>
          <Label htmlFor="district" className="block font-medium mb-1">{province === 'Улаанбаатар' ? 'Дүүрэг' : 'Сум'}:</Label> {/* Дүүрэг/Сум: */}
          <Select value={district} onValueChange={handleDistrictChange} disabled={!province}>
            <SelectTrigger id="district"><SelectValue placeholder="Сум/Дүүрэг сонгоно уу" /></SelectTrigger> {/* Сум/Дүүрэг сонгоно уу */}
            <SelectContent>
              {availableDistricts.map((dist) => (
                <SelectItem key={dist} value={dist}>
                  {dist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          Хадгалах {/* Хадгалах */}
        </Button>
      </div>

      <Button variant="outline" onClick={() => router.push('/teacher')}>
        ← Самбар руу буцах {/* ← Самбар руу буцах */}
      </Button>
    </div>
  )
}

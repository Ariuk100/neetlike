'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCircle2, School, Home, CircleUserRound } from 'lucide-react'

// Mongolian province and district list
// (Жагсаалт өмнөхтэй адил тул энд хасав, гэхдээ та өөрийн коддоо үлдээх хэрэгтэй)
const MONGOLIAN_LOCATIONS = [
  { province: 'Улаанбаатар', districts: ['Багануур', 'Багахангай', 'Баянгол', 'Баянзүрх', 'Налайх', 'Сонгинохайрхан', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй'] },
  { province: 'Архангай', districts: ['Батцэнгэл', 'Булган', 'Жаргалант', 'Ихтамир', 'Өгийнуур', 'Өлзийт', 'Өндөр-Улаан', 'Тариат', 'Төвшрүүлэх', 'Түмэннаст', 'Улаан-Уул', 'Хайрхан', 'Хангай', 'Хотонт', 'Цахир', 'Цэнхэр', 'Цэцэрлэг', 'Чулуут', 'Эрдэнэмандал'] },
  { province: 'Баян-Өлгий', districts: ['Алтанцөгц', 'Баяннуур', 'Бугат', 'Булган', 'Буянт', 'Дэлүүн', 'Ногооннуур', 'Сагсай', 'Толбо', 'Улаанхус', 'Цагааннуур', 'Цэнгэл', 'Өлгий'] },
  { province: 'Баянхонгор', districts: ['Баацагаан', 'Баянговь', 'Баянлиг', 'Баянбулаг', 'Баян-Өндөр', 'Баянцагаан', 'Баянхонгор', 'Богд', 'Дэлгэр', 'Жаргалант', 'Заг', 'Өлзийт', 'Өргөн', 'Шинэжинст', 'Эрдэнэцогт'] },
  { province: 'Булган', districts: ['Баян-Агт', 'Баяннуур', 'Бугат', 'Булган', 'Бүрэгхангай', 'Дашинчилэн', 'Гурванбулаг', 'Могод', 'Орхон', 'Рашаант', 'Сайхан', 'Сэлэнгэ', 'Тэшиг', 'Хишиг-Өндөр', 'Хутаг-Өндөр'] },
  { province: 'Говь-Алтай', districts: ['Алтай', 'Баян-Уул', 'Баянхайрхан', 'Бигэр', 'Бугат', 'Дарви', 'Дэлгэр', 'Есөнбулаг', 'Жаргалан', 'Тайшир', 'Тонхил', 'Төгрөг', 'Халиун', 'Хөхморьт', 'Цогт', 'Чандмань', 'Эрдэнэ'] },
  { province: 'Говьсүмбэр', districts: ['Баянтал', 'Шивээговь', 'Чойр'] },
  { province: 'Дархан-Уул', districts: ['Дархан', 'Орхон', 'Хонгор', 'Шарынгол'] },
  { province: 'Дорноговь', districts: ['Айраг', 'Алтанширээ', 'Даланжаргалан', 'Дэлгэрэх', 'Замын-Үүд', 'Иххэт', 'Мандах', 'Өргөн', 'Сайхандулаан', 'Сайншанд', 'Улаанбадрах', 'Хатанбулаг', 'Хөвсгөл', 'Эрдэнэ'] },
  { province: 'Дорнод', districts: ['Баяндун', 'Баянтумэн', 'Баян-Уул', 'Булган', 'Дашбалбар', 'Гурванзагал', 'Халхгол', 'Хөлөнбуйр', 'Матад', 'Сэргэлэн', 'Цагаан-Овоо', 'Чойбалсан', 'Чулуунхороот'] },
  { province: 'Дундговь', districts: ['Адаацаг', 'Баянжаргалан', 'Говь-Угтаал', 'Гурвансайхан', 'Дэлгэрцогт', 'Дэрэн', 'Луус', 'Өлзийт', 'Өндөршил', 'Сайнцагаан', 'Хулд', 'Цагаандэлгэр', 'Эрдэнэдалай'] },
  { province: 'Завхан', districts: ['Алдархаан', 'Асгат', 'Баянхайрхан', 'Баянхонгор', 'Баянтэс', 'Дөрвөлжин', 'Идэр', 'Их-Уул', 'Нөмрөг', 'Отгон', 'Сонгино', 'Тосонцэнгэл', 'Түдэвтэй', 'Ургамал', 'Цагаанхайрхан', 'Цагаанчулуут', 'Цэцэн-Уул', 'Шилүүстэй', 'Эрдэнэхайрхан', 'Яруу', 'Улиастай'] },
  { province: 'Орхон', districts: ['Баян-Өндөр', 'Жаргалант'] },
  { province: 'Өвөрхангай', districts: ['Баруунбаян-Улаан', 'Баян-Өндөр', 'Баянгол', 'Баянлиг', 'Бат-Өлзий', 'Богд', 'Бүрд', 'Гучин-Ус', 'Есөнзүйл', 'Хайрхандулаан', 'Хархорин', 'Хужирт', 'Нарийнтээл', 'Өлзийт', 'Санкт', 'Тарагт', 'Төгрөг', 'Уянга', 'Зуунбаян-Улаан', 'Арвайхээр'] },
  { province: 'Өмнөговь', districts: ['Баян-Овоо', 'Баяндалай', 'Булган', 'Гурвантэс', 'Даланзадгад', 'Ханбогд', 'Ханхонгор', 'Манлай', 'Номгон', 'Ноён', 'Сэврэй', 'Цогт-Овоо', 'Цогтцэций'] },
  { province: 'Сэлэнгэ', districts: ['Алтанбулаг', 'Баруунбүрэн', 'Баянгол', 'Ерөө', 'Жавхлант', 'Зүүнбүрэн', 'Мандал', 'Орхонтуул', 'Сант', 'Сайхан', 'Сүхбаатар', 'Түшиг', 'Хушаат', 'Цагааннуур', 'Шаамар'] },
  { province: 'Сүхбаатар', districts: ['Асгат', 'Баруун-Урт', 'Баяндэлгэр', 'Дарьганга', 'Мөнххаан', 'Наран', 'Онгон', 'Сүхбаатар', 'Түмэнцогт', 'Уулбаян', 'Халзан', 'Эрдэнэцагаан'] },
  { province: 'Төв', districts: ['Алтанбулаг', 'Аргалант', 'Баян', 'Баянбараат', 'Баянжаргалан', 'Баянцагаан', 'Баянхангай', 'Баянцогт', 'Борнуур', 'Батсүмбэр', 'Бүрэн', 'Дэлгэрхаан', 'Эрдэнэ', 'Жаргалант', 'Заамар', 'Лүн', 'Мөнгөнморьт', 'Өндөрширээт', 'Сэргэлэн', 'Сүмбэр', 'Цээл', 'Угтаалцайдам', 'Эрдэнэсант', 'Зуунмод'] },
  { province: 'Увс', districts: ['Баруунтуруун', 'Бөхмөрөн', 'Давст', 'Завхан', 'Зүүнговь', 'Зүүнхангай', 'Малчин', 'Наранбулаг', 'Өмнөговь', 'Өлгий', 'Сагил', 'Тариалан', 'Тэс', 'Түргэн', 'Улаангом', 'Ховд', 'Хяргас'] },
  { province: 'Ховд', districts: ['Алтай', 'Булган', 'Буянт', 'Дарви', 'Дөргөн', 'Дуут', 'Зэрэг', 'Манхан', 'Мөнххайрхан', 'Мөст', 'Мянгад', 'Үенч', 'Ховд', 'Цэцэг', 'Чандмань', 'Эрдэнэбүрэн'] },
  { province: 'Хөвсгөл', districts: ['Алаг-Эрдэнэ', 'Арбулаг', 'Баянзүрх', 'Бүрэнтогтох', 'Галт', 'Жаргалант', 'Их-Уул', 'Мөрөн', 'Рашаант', 'Рэнчинлхүмбэ', 'Тариалан', 'Тосонцэнгэл', 'Төмөрбулаг', 'Түнэл', 'Улаан-Уул', 'Ханх', 'Цагаан-Уул', 'Цагааннуур', 'Цагаан-Үүр', 'Цэцэрлэг', 'Чандмань-Өндөр', 'Эрдэнэбулган'] },
  { province: 'Хэнтий', districts: ['Батноров', 'Батширээт', 'Баян-Овоо', 'Баянмөнх', 'Баянхутаг', 'Биндэр', 'Дадал', 'Дархан', 'Дэлгэрхаан', 'Жаргалтхаан', 'Өмнөдэлгэр', 'Хэрлэн', 'Цэнхэрмандал'] },
]

interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  role?: string;
  name?: string;
  phone?: string;
  school?: string;
  grade?: string;
  lastName?: string;
  teacherId?: string;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
  province?: string;
  district?: string;
  photoURL?: string; // Профайл зураг нэмсэн
}

export default function StudentProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth() as { user: CustomUser | null; loading: boolean };
  
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [teacherId, setTeacherId] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [birthYear, setBirthYear] = useState<string | number>('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');

  const [loading, setLoading] = useState(false)
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  useEffect(() => {
    if (authUser?.uid) {
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', authUser.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data() as CustomUser
          setName(data.name || '')
          setLastName(data.lastName || '');
          setPhone(data.phone || '')
          setSchool(data.school || '')
          setGrade(data.grade || '')
          setTeacherId(data.teacherId || '');
          setGender((data.gender as 'male' | 'female' | 'other' | '') || '');
          setBirthYear(data.birthYear || '');
          setProvince(data.province || '');
          setDistrict(data.district || '');
        }
      }
      fetchProfile()
    }
  }, [authUser])

  useEffect(() => {
    const selectedProvinceData = MONGOLIAN_LOCATIONS.find(loc => loc.province === province);
    if (selectedProvinceData) {
      setAvailableDistricts(selectedProvinceData.districts);
      if (district && !selectedProvinceData.districts.includes(district)) {
        setDistrict('');
      }
    } else {
      setAvailableDistricts([]);
      setDistrict('');
    }
  }, [province, district]);

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setBirthYear(value === '' ? '' : Number(value));
    }
  };

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setDistrict('');
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
  };

  const saveProfile = async () => {
    if (!authUser?.uid) return
    setLoading(true)
    try {
      const dataToUpdate: Record<string, string | number | null | undefined> = {
        name,
        phone,
        school,
        grade,
        lastName,
        gender: gender === '' ? null : gender,
        birthYear: typeof birthYear === 'number' ? birthYear : (birthYear === '' ? null : Number(birthYear)),
        province: province === '' ? null : province,
        district: district === '' ? null : district,
      };

      if (authUser.role === 'student') {
        dataToUpdate.teacherId = teacherId;
      }

      await updateDoc(doc(db, 'users', authUser.uid), dataToUpdate)
      toast.success('Профайл амжилттай шинэчлэгдлээ!')
    } catch (error: unknown) {
      const err = error as Error
      toast.error(`Алдаа гарлаа: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Ачаалж байна...</div>;
  }

  if (!authUser || authUser.role !== 'student') {
    return <div className="p-4 text-red-500">Зөвшөөрөлгүй хандалт. Та энэ хуудсанд нэвтрэх эрхгүй байна.</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen pt-20">
      <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl">
        {/* Кардын дээд хэсэг - Градиент загвар */}
        <div className="bg-gradient-to-r from-[#5A67D8] to-[#00C5A1] text-white p-12 relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            {authUser.photoURL ? (
              <img src={authUser.photoURL} alt="Профайл зураг" className="w-24 h-24 rounded-full border-4 border-white" />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center bg-gray-200 text-[#5A67D8]">
                <CircleUserRound size={60} />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-extrabold tracking-wide">
                {name || authUser.name || 'Сурагч'}
              </h1>
              <p className="text-gray-200 mt-1">
                {authUser.email}
              </p>
            </div>
          </div>
          {/* Багшийн ID эсвэл бусад нэмэлт мэдээллийг энд байрлуулах боломжтой */}
          {teacherId && (
            <div className="bg-white/20 text-white text-sm font-semibold py-2 px-4 rounded-full">
              Багшийн ID: {teacherId}
            </div>
          )}
        </div>

        {/* Кардын доод хэсэг - Цагаан дэвсгэртэй форм */}
        <div className="bg-white p-12">
          {/* Үндсэн мэдээллийн хэсэг */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-[#5A67D8] mb-6 flex items-center gap-3">
              <UserCircle2 size={24} className="text-[#00C5A1]" />
              Хувийн мэдээлэл
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="lastName">Овог</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="name">Нэр</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Утасны дугаар</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="gender">Хүйс</Label>
                <Select value={gender} onValueChange={(value) => setGender(value as 'male' | 'female' | 'other' | '')}>
                  <SelectTrigger id="gender"><SelectValue placeholder="Хүйсээ сонгоно уу" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Эрэгтэй</SelectItem>
                    <SelectItem value="female">Эмэгтэй</SelectItem>
                    <SelectItem value="other">Бусад</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="birthYear">Төрсөн он</Label>
                <Input id="birthYear" type="number" value={birthYear} onChange={handleBirthYearChange} />
              </div>
            </div>
          </div>

          {/* Боловсролын мэдээллийн хэсэг */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-[#5A67D8] mb-6 flex items-center gap-3">
              <School size={24} className="text-[#00C5A1]" />
              Боловсролын мэдээлэл
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="school">Сургууль</Label>
                <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="grade">Анги</Label>
                <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Байршлын мэдээллийн хэсэг */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-[#5A67D8] mb-6 flex items-center gap-3">
              <Home size={24} className="text-[#00C5A1]" />
              Байршлын мэдээлэл
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="province">Аймаг/Хот</Label>
                <Select value={province} onValueChange={handleProvinceChange}>
                  <SelectTrigger id="province"><SelectValue placeholder="Аймаг/Хот сонгоно уу" /></SelectTrigger>
                  <SelectContent>
                    {MONGOLIAN_LOCATIONS.map((loc) => (
                      <SelectItem key={loc.province} value={loc.province}>
                        {loc.province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="district">{province === 'Улаанбаатар' ? 'Дүүрэг' : 'Сум'}</Label>
                <Select value={district} onValueChange={handleDistrictChange} disabled={!province}>
                  <SelectTrigger id="district"><SelectValue placeholder="Сум/Дүүрэг сонгоно уу" /></SelectTrigger>
                  <SelectContent>
                    {availableDistricts.map((dist) => (
                      <SelectItem key={dist} value={dist}>
                        {dist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button
              onClick={saveProfile}
              disabled={loading}
              className="w-full bg-[#00C5A1] hover:bg-[#00A183] text-white font-bold py-3 px-4 rounded-xl transition-colors duration-200 text-lg"
            >
              {loading ? 'Мэдээлэл хадгалж байна...' : 'Мэдээлэл хадгалах'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
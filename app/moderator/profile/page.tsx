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

// Define the CustomUser interface here, or preferably import it from AuthContext
// if it's exported there.
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
}

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


export default function ModeratorProfilePage() {
  // Use CustomUser interface to type the user object from useAuth
  const { user: authUser, loading: authLoading } = useAuth() as { user: CustomUser | null; loading: boolean };
  const router = useRouter()

  // State variables for the new fields
  const [name, setName] = useState(''); // Name
  const [lastName, setLastName] = useState(''); // Last Name
  const [phone, setPhone] = useState(''); // Phone
  const [school, setSchool] = useState(''); // School
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>(''); // Gender
  const [birthYear, setBirthYear] = useState<string | number>(''); // Birth Year
  const [province, setProvince] = useState(''); // Province
  const [district, setDistrict] = useState(''); // District

  const [loading, setLoading] = useState(false)
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]); // Districts available based on selected province

  useEffect(() => {
    if (authUser) {
      // Initialize states from authUser data
      setName(authUser.name || authUser.displayName || '');
      setPhone(authUser.phone || authUser.phoneNumber || '');
      setSchool(authUser.school || '');
      setLastName(authUser.lastName || '');
      setGender((authUser.gender as 'male' | 'female' | 'other' | '') || '');
      setBirthYear(authUser.birthYear || '');
      setProvince(authUser.province || ''); // Assign province value
      setDistrict(authUser.district || ''); // Assign district value
    }
  }, [authUser])

  // Update available districts when province changes
  useEffect(() => {
    const selectedProvinceData = MONGOLIAN_LOCATIONS.find(loc => loc.province === province);
    if (selectedProvinceData) {
      setAvailableDistricts(selectedProvinceData.districts);
      // If the current district is not in the new list, clear it
      if (district && !selectedProvinceData.districts.includes(district)) {
        setDistrict('');
      }
    } else {
      setAvailableDistricts([]);
      setDistrict('');
    }
  }, [province, district]); // Added district to dependencies to correctly clear if old value is not in new list

  const handleSave = async () => {
    if (!authUser) return;
    try {
      setLoading(true);
      const userRef = doc(db, 'users', authUser.uid);

      // Prepare data for update, ensuring birthYear is a number or null
      // Use Record<string, string | number | null | undefined> for dataToUpdate
      const dataToUpdate: Record<string, string | number | null | undefined> = {
        name: name,
        phone: phone,
        school: school,
        lastName: lastName,
        gender: gender === '' ? null : gender, // Set to null if empty
        birthYear: typeof birthYear === 'number' ? birthYear : (birthYear === '' ? null : Number(birthYear)), // Set to null if empty or not a number
        province: province === '' ? null : province, // Set to null if empty
        district: district === '' ? null : district, // Set to null if empty
      };

      await updateDoc(userRef, dataToUpdate);
      toast.success('Амжилттай хадгалагдлаа!'); // Successfully saved!
      router.push('/moderator?updated=true');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Алдаа гарлаа'); // An error occurred
    } finally {
      setLoading(false);
    }
  };

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Assign value only if it's a number or empty
    if (value === '' || /^\d+$/.test(value)) {
      setBirthYear(value === '' ? '' : Number(value));
    }
  };

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setDistrict(''); // Clear district when province changes
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Ачаалж байна...</div>; // Loading...
  }

  if (!authUser || authUser.role !== 'moderator') {
    return <div className="p-4 text-red-500">Зөвшөөрөлгүй хандалт</div>; // Unauthorized access
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 px-4">
      <h1 className="text-2xl font-bold">Модераторын профайл</h1> {/* Moderator Profile */}
      <div className="bg-white border p-4 rounded shadow space-y-4">
        <p><strong>Имэйл:</strong> {authUser.email}</p>

        <div>
          <Label htmlFor="name" className="block font-medium mb-1">Нэр:</Label> {/* Name: */}
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="lastName" className="block font-medium mb-1">Овог:</Label> {/* Last Name: */}
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="phone" className="block font-medium mb-1">Утас:</Label> {/* Phone: */}
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="school" className="block font-medium mb-1">Харьяа сургууль:</Label> {/* Affiliated School: */}
          <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="gender" className="block font-medium mb-1">Хүйс:</Label> {/* Gender: */}
          <Select value={gender} onValueChange={(value) => setGender(value as 'male' | 'female' | 'other' | '')}>
            <SelectTrigger id="gender"><SelectValue placeholder="Хүйс сонгоно уу" /></SelectTrigger> {/* Select Gender */}
            <SelectContent>
              <SelectItem value="male">Эрэгтэй</SelectItem> {/* Male */}
              <SelectItem value="female">Эмэгтэй</SelectItem> {/* Female */}
              <SelectItem value="other">Бусад</SelectItem> {/* Other */}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="birthYear" className="block font-medium mb-1">Төрсөн он:</Label> {/* Birth Year: */}
          <Input id="birthYear" type="number" value={birthYear} onChange={handleBirthYearChange} />
        </div>

        {/* Province selection */}
        <div>
          <Label htmlFor="province" className="block font-medium mb-1">Аймаг:</Label> {/* Province: */}
          <Select value={province} onValueChange={handleProvinceChange}>
            <SelectTrigger id="province"><SelectValue placeholder="Аймаг сонгоно уу" /></SelectTrigger> {/* Select Province */}
            <SelectContent>
              {MONGOLIAN_LOCATIONS.map((loc) => (
                <SelectItem key={loc.province} value={loc.province}>
                  {loc.province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District/Soum selection (enabled after province is selected) */}
        <div>
          <Label htmlFor="district" className="block font-medium mb-1">{province === 'Улаанбаатар' ? 'Дүүрэг' : 'Сум'}:</Label> {/* District/Soum: */}
          <Select value={district} onValueChange={handleDistrictChange} disabled={!province}>
            <SelectTrigger id="district"><SelectValue placeholder="Сум/Дүүрэг сонгоно уу" /></SelectTrigger> {/* Select District/Soum */}
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
          Хадгалах {/* Save */}
        </Button>
      </div>

      <Button variant="outline" onClick={() => router.push('/moderator')}>
        ← Самбар руу буцах {/* ← Back to Dashboard */}
      </Button>
    </div>
  )
}

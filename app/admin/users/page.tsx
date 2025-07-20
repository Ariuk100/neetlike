'use client'; // Энэ нь клиент талын компонент гэдгийг заана

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext'; // AuthContext-ээс хэрэглэгчийн мэдээллийг авах
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { db, auth } from '@/lib/firebase'; // Firestore instance болон auth-г импортлосон
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Шинэ хэрэглэгч үүсгэхэд


// Хэрэглэгчийн мэдээллийн төрөл
interface UserData {
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  school?: string;
  grade?: string;
  role: 'student' | 'teacher' | 'moderator' | 'admin';
  readableId?: string;
  createdAt?: Date; // Одоо Date объект эсвэл undefined байж болно
  lastName?: string;
  teacherId?: string;
  gender?: 'male' | 'female' | 'other';
  birthYear?: number;
  province?: string;
  district?: string;
}

// createdAt талбарыг Date объект руу аюулгүйгээр хөрвүүлэх функц
// Энэ функц нь Timestamp, String, Number зэрэг төрлүүдийг Date руу хөрвүүлнэ.
const convertToDate = (timestamp: Date | { toDate: () => Date } | string | number | undefined | null): Date | undefined => {
  if (!timestamp) {
    return undefined;
  }
  // Хэрэв аль хэдийн Date объект байвал шууд буцаана
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // Хэрэв Firestore Timestamp объект байвал toDate() ашиглана
  // Firestore Timestamp нь { seconds: number, nanoseconds: number, toDate: Function } гэсэн бүтэцтэй байдаг.
  if (typeof timestamp === 'object' && timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // Хэрэв string (ISO 8601) байвал new Date() ашиглана
  if (typeof timestamp === 'string') {
    const parsedDate = new Date(timestamp);
    // Огноо хүчинтэй эсэхийг шалгана
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  // Хэрэв number (Unix timestamp) байвал new Date() ашиглана
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  // Бусад тохиолдолд undefined буцаана
  console.warn('Unknown timestamp format for createdAt:', timestamp);
  return undefined;
};


export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<UserData | null>(null);
  const [currentUserToDelete, setCurrentUserToDelete] = useState<UserData | null>(null);

  // Шинэ хэрэглэгч нэмэх эсвэл засах формын төлөв
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    school: '',
    grade: '',
    role: 'student' as 'student' | 'teacher' | 'moderator' | 'admin',
    lastName: '',
    teacherId: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    birthYear: '' as string | number,
    province: '',
    district: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Firestore-оос хэрэглэгчдийг татах
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized');
      return;
    }

    if (user && user.role === 'admin') {
      const usersColRef = collection(db, 'users');
      const unsubscribe = onSnapshot(usersColRef, (snapshot) => {
        const usersList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data.email || '',
            name: data.name || '',
            phone: data.phone || '',
            school: data.school || '',
            grade: data.grade || '',
            role: data.role || 'student',
            readableId: data.readableId || '',
            // Алдааг засах хэсэг: convertToDate функцийг ашиглана
            createdAt: convertToDate(data.createdAt), 
            lastName: data.lastName || '',
            teacherId: data.teacherId || '',
            gender: data.gender || '',
            birthYear: data.birthYear || '',
            province: data.province || '',
            district: data.district || '',
          } as UserData;
        });
        setUsers(usersList);
        setLoadingUsers(false);
      }, (error) => {
        console.error("Error fetching users:", error);
        toast.error("Хэрэглэгчдийг татахад алдаа гарлаа.");
        setLoadingUsers(false);
      });

      return () => unsubscribe();
    }
  }, [user, authLoading, router]);

  // Хэрэглэгч засах модалыг нээх үед формын утгыг оноох
  useEffect(() => {
    if (isEditUserModalOpen && currentUserToEdit) {
      setFormState({
        email: currentUserToEdit.email,
        password: '', // Нууц үгийг засахгүй
        name: currentUserToEdit.name || '',
        phone: currentUserToEdit.phone || '',
        school: currentUserToEdit.school || '',
        grade: currentUserToEdit.grade || '',
        role: currentUserToEdit.role,
        lastName: currentUserToEdit.lastName || '',
        teacherId: currentUserToEdit.teacherId || '',
        gender: (currentUserToEdit.gender as 'male' | 'female' | 'other' | '') || '',
        birthYear: currentUserToEdit.birthYear || '',
        province: currentUserToEdit.province || '',
        district: currentUserToEdit.district || '',
      });
    }
  }, [isEditUserModalOpen, currentUserToEdit]);


  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormState((prev) => ({ ...prev, role: value as UserData['role'] }));
  };

  const handleGenderChange = (value: string) => {
    setFormState((prev) => ({ ...prev, gender: value as 'male' | 'female' | 'other' | '' }));
  };

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Зөвхөн тоо эсвэл хоосон байвал утгыг онооно
    if (value === '' || /^\d+$/.test(value)) {
      setFormState((prev) => ({ ...prev, birthYear: value === '' ? '' : Number(value) }));
    }
  };

  // Шинэ хэрэглэгч нэмэх
  const handleAddUser = async () => {
    setFormLoading(true);
    try {
      // И-мэйл болон нууц үг шалгах
      if (!formState.email || !formState.password) {
        toast.error('Имэйл болон нууц үг заавал шаардлагатай.');
        setFormLoading(false);
        return;
      }
      if (formState.password.length < 6) {
        toast.error('Нууц үг доод тал нь 6 тэмдэгттэй байх ёстой.');
        setFormLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, formState.email, formState.password);
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: formState.email,
        name: formState.name,
        phone: formState.phone,
        school: formState.school,
        grade: formState.grade,
        role: formState.role,
        lastName: formState.lastName,
        teacherId: formState.teacherId,
        gender: formState.gender,
        birthYear: typeof formState.birthYear === 'number' ? formState.birthYear : null,
        province: formState.province,
        district: formState.district,
        createdAt: new Date(), // Firestore нь Date объектыг Timestamp болгон автоматаар хөрвүүлдэг
      });

      const apiResponse = await fetch('/api/admin/set-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: newUser.uid, role: formState.role }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Хэрэглэгчийн эрхийг тохируулахад алдаа гарлаа.');
      }

      toast.success('Хэрэглэгч амжилттай нэмэгдлээ!');
      setIsAddUserModalOpen(false);
      setFormState({ email: '', password: '', name: '', phone: '', school: '', grade: '', role: 'student', lastName: '', teacherId: '', gender: '', birthYear: '', province: '', district: '' });
    } catch (error: unknown) {
      const err = error as { code?: string; message: string };
      let message = 'Хэрэглэгч нэмэхэд алдаа гарлаа.';
      switch (err.code) {
        case 'auth/email-already-in-use': message = 'Энэ и-мэйл аль хэдийн бүртгэгдсэн байна.'; break;
        case 'auth/invalid-email': message = 'И-мэйл хаяг буруу байна.'; break;
        case 'auth/weak-password': message = 'Нууц үг хэт сул байна. Доод тал нь 6 тэмдэгт.'; break;
        default: message = `Алдаа: ${err.message}`;
      }
      toast.error(message);
      console.error('Add user error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  // Хэрэглэгчийн мэдээллийг засах
  const handleEditUser = async () => {
    if (!currentUserToEdit || !user) return; // Нэвтэрсэн хэрэглэгч болон засах хэрэглэгч байгаа эсэхийг шалгах
    setFormLoading(true);
    try {
      // 🔴 АЮУЛГҮЙ БАЙДЛЫН ШАЛГАЛТ: Админ өөрийнхөө эрхийг бууруулахыг хориглох
      if (currentUserToEdit.uid === user.uid && formState.role !== 'admin') {
        toast.error('Та өөрийнхөө эрхийг бууруулах боломжгүй!');
        setFormLoading(false);
        return;
      }

      const userRef = doc(db, 'users', currentUserToEdit.uid);
      await updateDoc(userRef, {
        name: formState.name,
        phone: formState.phone,
        school: formState.school,
        grade: formState.grade,
        role: formState.role,
        lastName: formState.lastName,
        teacherId: formState.teacherId,
        gender: formState.gender,
        birthYear: typeof formState.birthYear === 'number' ? formState.birthYear : null,
        province: formState.province,
        district: formState.district,
      });

      // Хэрэв үүрэг өөрчлөгдсөн бол Custom Claim-ийг шинэчлэх API-г дуудна
      if (formState.role !== currentUserToEdit.role) {
        const apiResponse = await fetch('/api/admin/set-user-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: currentUserToEdit.uid, role: formState.role }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json() as { error?: string };
          throw new Error(errorData.error || 'Хэрэглэгчийн эрхийг шинэчлэхэд алдаа гарлаа.');
        }
      }

      toast.success('Хэрэглэгчийн мэдээлэл амжилттай шинэчлэгдлээ!');
      setIsEditUserModalOpen(false);
      setCurrentUserToEdit(null);
    } catch (error: unknown) {
      const err = error as { message: string };
      toast.error(`Хэрэглэгчийн мэдээлэл засахад алдаа гарлаа: ${err.message}`);
      console.error('Edit user error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  // Хэрэглэгчийг устгах
  const handleDeleteUser = async () => {
    if (!currentUserToDelete || !user) return; // Нэвтэрсэн хэрэглэгч болон устгах хэрэглэгч байгаа эсэхийг шалгах
    setFormLoading(true);
    try {
      // 🔴 АЮУЛГҮЙ БАЙДЛЫН ШАЛГАЛТ: Админ өөрийнхөө бүртгэлийг устгахыг хориглох
      if (currentUserToDelete.uid === user.uid) {
        toast.error('Та өөрийнхөө бүртгэлийг устгах боломжгүй!');
        setFormLoading(false);
        return;
      }

      const apiResponse = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: currentUserToDelete.uid }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json() as { error?: string };
        throw new Error(errorData.error || 'Firebase Auth-аас хэрэглэгчийг устгахад алдаа гарлаа.');
      }

      // Firestore-оос хэрэглэгчийн document-г устгах
      await deleteDoc(doc(db, 'users', currentUserToDelete.uid));

      toast.success('Хэрэглэгч амжилттай устгагдлаа!');
      setIsConfirmDeleteModalOpen(false);
      setCurrentUserToDelete(null);
    } catch (error: unknown) {
      const err = error as { message: string };
      toast.error(`Хэрэглэгч устгахад алдаа гарлаа: ${err.message}`);
      console.error('Delete user error:', error);
    } finally {
      setFormLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-10 w-1/2" /></div>;
  }

  if (!user || user.role !== 'admin') {
    return <div className="p-4 text-red-500">Зөвшөөрөлгүй хандалт. Та энэ хуудсанд нэвтрэх эрхгүй байна.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Хэрэглэгчийн удирдлага</h1>
        <Button onClick={() => {
          setFormState({ email: '', password: '', name: '', phone: '', school: '', grade: '', role: 'student', lastName: '', teacherId: '', gender: '', birthYear: '', province: '', district: '' });
          setIsAddUserModalOpen(true);
        }}>
          + Шинэ хэрэглэгч нэмэх
        </Button>
      </div>

      {loadingUsers ? (
        <Skeleton className="h-[300px] w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Бүх хэрэглэгчид</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID</TableHead>
                    <TableHead>Имэйл</TableHead>
                    <TableHead>Нэр</TableHead>
                    <TableHead>Овог</TableHead>
                    <TableHead>Утас</TableHead>
                    <TableHead>Сургууль</TableHead>
                    <TableHead>Анги</TableHead>
                    <TableHead>Эрх</TableHead>
                    <TableHead>Багшийн ID</TableHead>
                    <TableHead>Хүйс</TableHead>
                    <TableHead>Төрсөн он</TableHead>
                    <TableHead>Аймаг</TableHead>
                    <TableHead>Сум</TableHead>
                    <TableHead>Readable ID</TableHead>
                    <TableHead>Бүртгүүлсэн огноо</TableHead>
                    <TableHead>Үйлдэл</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center text-gray-500">
                        Хэрэглэгч олдсонгүй.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.uid}>
                        <TableCell className="text-xs">{u.uid}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.name || '-'}</TableCell>
                        <TableCell>{u.lastName || '-'}</TableCell>
                        <TableCell>{u.phone || '-'}</TableCell>
                        <TableCell>{u.school || '-'}</TableCell>
                        <TableCell>{u.grade || '-'}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell>{u.teacherId || '-'}</TableCell>
                        <TableCell>{u.gender || '-'}</TableCell>
                        <TableCell>{u.birthYear || '-'}</TableCell>
                        <TableCell>{u.province || '-'}</TableCell>
                        <TableCell>{u.district || '-'}</TableCell>
                        <TableCell>{u.readableId || '-'}</TableCell>
                        <TableCell>{u.createdAt ? u.createdAt.toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentUserToEdit(u);
                              setIsEditUserModalOpen(true);
                            }}
                          >
                            Засах
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setCurrentUserToDelete(u);
                              setIsConfirmDeleteModalOpen(true);
                            }}
                            // Өөрийгөө устгахыг хориглох
                            disabled={user?.uid === u.uid}
                          >
                            Устгах
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Шинэ хэрэглэгч нэмэх модал */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Шинэ хэрэглэгч нэмэх</DialogTitle>
            <DialogDescription>
              Шинэ хэрэглэгчийн мэдээллийг оруулна уу.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label htmlFor="email">Имэйл</Label><Input id="email" name="email" type="email" value={formState.email} onChange={handleFormChange} /></div>
            <div><Label htmlFor="password">Нууц үг</Label><Input id="password" name="password" type="password" value={formState.password} onChange={handleFormChange} /></div>
            <div><Label htmlFor="name">Нэр</Label><Input id="name" name="name" value={formState.name} onChange={handleFormChange} /></div>
            <div><Label htmlFor="lastName">Овог</Label><Input id="lastName" name="lastName" value={formState.lastName} onChange={handleFormChange} /></div>
            <div><Label htmlFor="phone">Утас</Label><Input id="phone" name="phone" value={formState.phone} onChange={handleFormChange} /></div>
            <div><Label htmlFor="school">Сургууль</Label><Input id="school" name="school" value={formState.school} onChange={handleFormChange} /></div>
            <div><Label htmlFor="grade">Анги</Label><Input id="grade" name="grade" value={formState.grade} onChange={handleFormChange} /></div>
            {formState.role === 'student' && (
              <div><Label htmlFor="teacherId">Багшийн ID</Label><Input id="teacherId" name="teacherId" value={formState.teacherId} onChange={handleFormChange} /></div>
            )}
            <div>
              <Label htmlFor="gender">Хүйс</Label>
              <Select value={formState.gender} onValueChange={handleGenderChange}>
                <SelectTrigger><SelectValue placeholder="Хүйс сонгоно уу" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Эрэгтэй</SelectItem>
                  <SelectItem value="female">Эмэгтэй</SelectItem>
                  <SelectItem value="other">Бусад</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="birthYear">Төрсөн он</Label><Input id="birthYear" name="birthYear" type="number" value={formState.birthYear} onChange={handleBirthYearChange} /></div>
            <div><Label htmlFor="province">Аймаг</Label><Input id="province" name="province" value={formState.province} onChange={handleFormChange} /></div>
            <div><Label htmlFor="district">Сум</Label><Input id="district" name="district" value={formState.district} onChange={handleFormChange} /></div>
            <div>
              <Label htmlFor="role">Эрх</Label>
              <Select value={formState.role} onValueChange={handleRoleChange}>
                <SelectTrigger><SelectValue placeholder="Эрх сонгоно уу" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Сурагч</SelectItem>
                  <SelectItem value="teacher">Багш</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Цуцлах</Button>
            <Button onClick={handleAddUser} disabled={formLoading}>
              {formLoading ? 'Нэмж байна...' : 'Хэрэглэгч нэмэх'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Хэрэглэгч засах модал */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Хэрэглэгчийн мэдээлэл засах</DialogTitle>
            <DialogDescription>
              {currentUserToEdit?.email} хэрэглэгчийн мэдээллийг засна уу.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label htmlFor="edit-name">Нэр</Label><Input id="edit-name" name="name" value={formState.name} onChange={handleFormChange} /></div>
            <div><Label htmlFor="edit-lastName">Овог</Label><Input id="edit-lastName" name="lastName" value={formState.lastName} onChange={handleFormChange} /></div>
            <div><Label htmlFor="edit-phone">Утас</Label><Input id="edit-phone" name="phone" value={formState.phone} onChange={handleFormChange} /></div>
            <div><Label htmlFor="edit-school">Сургууль</Label><Input id="edit-school" name="school" value={formState.school} onChange={handleFormChange} /></div>
            <div><Label htmlFor="edit-grade">Анги</Label><Input id="edit-grade" name="grade" value={formState.grade} onChange={handleFormChange} /></div>
            {formState.role === 'student' && (
              <div><Label htmlFor="edit-teacherId">Багшийн ID</Label><Input id="edit-teacherId" name="teacherId" value={formState.teacherId} onChange={handleFormChange} /></div>
            )}
            <div>
              <Label htmlFor="edit-gender">Хүйс</Label>
              <Select value={formState.gender} onValueChange={handleGenderChange}>
                <SelectTrigger><SelectValue placeholder="Хүйс сонгоно уу" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Эрэгтэй</SelectItem>
                  <SelectItem value="female">Эмэгтэй</SelectItem>
                  <SelectItem value="other">Бусад</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="edit-birthYear">Төрсөн он</Label><Input id="edit-birthYear" name="birthYear" type="number" value={formState.birthYear} onChange={handleBirthYearChange} /></div>
            <div><Label htmlFor="edit-province">Аймаг</Label><Input id="edit-province" name="province" value={formState.province} onChange={handleFormChange} /></div>
            <div><Label htmlFor="edit-district">Сум</Label><Input id="edit-district" name="district" value={formState.district} onChange={handleFormChange} /></div>
            <div>
              <Label htmlFor="edit-role">Эрх</Label>
              <Select
                value={formState.role}
                onValueChange={handleRoleChange}
                // Өөрийнхөө эрхийг өөрчлөхийг оролдвол (админ бол) disabled болгох
                disabled={currentUserToEdit?.uid === user?.uid && formState.role === 'admin'}
              >
                <SelectTrigger><SelectValue placeholder="Эрх сонгоно уу" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Сурагч</SelectItem>
                  <SelectItem value="teacher">Багш</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserModalOpen(false)}>Цуцлах</Button>
            <Button onClick={handleEditUser} disabled={formLoading}>
              {formLoading ? 'Хадгалж байна...' : 'Хадгалах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Хэрэглэгч устгах баталгаажуулах модал */}
      <Dialog open={isConfirmDeleteModalOpen} onOpenChange={setIsConfirmDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Хэрэглэгчийг устгах</DialogTitle>
            <DialogDescription>
              Та <strong>{currentUserToDelete?.email}</strong> хэрэглэгчийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteModalOpen(false)}>Цуцлах</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={formLoading || user?.uid === currentUserToDelete?.uid} // Өөрийгөө устгахыг хориглох
            >
              {formLoading ? 'Устгаж байна...' : 'Устгах'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )}
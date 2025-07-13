'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function StudentProfilePage() {
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setName(data.name || '')
          setPhone(data.phone || '')
          setSchool(data.school || '')
          setGrade(data.grade || '')
        }
      }
      fetchProfile()
    }
  }, [user])

  const saveProfile = async () => {
    if (!user?.uid) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        phone,
        school,
        grade,
      })
      toast.success('Профайл амжилттай шинэчлэгдлээ!')
    } catch (error: unknown) {
      const err = error as Error
      toast.error(`Алдаа гарлаа: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-6">Профайл</h1>
      <div className="space-y-4">
        <div>
          <Label>Нэр</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Утас</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Сургууль</Label>
          <Input value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>
        <div>
          <Label>Анги</Label>
          <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
        </div>
        <Button onClick={saveProfile} disabled={loading}>
          {loading ? 'Хадгалж байна...' : 'Хадгалах'}
        </Button>
      </div>
    </div>
  )
}
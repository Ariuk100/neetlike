'use client'

import { useAuth } from '@/app/context/AuthContext'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function ModeratorProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setPhone(user.phoneNumber || '')
      setSchool(user.school || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    try {
      setLoading(true)
      const ref = doc(db, 'users', user.uid)
      await updateDoc(ref, { phone, school })
      toast.success('Амжилттай хадгалагдлаа!')
      router.push('/moderator?updated=true')
    } catch (err) {
      console.error('Update error:', err)
      toast.error('Алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'moderator') {
    return <div className="p-4 text-red-500">Зөвшөөрөлгүй хандалт</div>
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6 px-4">
      <h1 className="text-2xl font-bold">Moderator профайл</h1>
      <div className="bg-white border p-4 rounded shadow space-y-4">
        <p><strong>Нэр:</strong> {user.name}</p>
        <p><strong>Имэйл:</strong> {user.email}</p>

        <div>
          <label className="block font-medium mb-1">Утас:</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div>
          <label className="block font-medium mb-1">Харьяа сургууль:</label>
          <Input value={school} onChange={(e) => setSchool(e.target.value)} />
        </div>

        <Button onClick={handleSave} disabled={loading}>
          Хадгалах
        </Button>
      </div>

      <Button variant="outline" onClick={() => router.push('/moderator')}>
        ← Самбар руу буцах
      </Button>
    </div>
  )
}